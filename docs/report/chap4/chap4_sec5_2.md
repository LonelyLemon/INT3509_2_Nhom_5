# 4.5.2 Thu Thập và Lưu Trữ Dữ Liệu Giá 1 Phút

## Luồng tổng quan

```
[Celery Beat] → crontab(minute="*") → [Redis queue]
                                            ↓
                                    [Celery Worker]
                                            ↓
                                    yf.download(batch, interval="1m")
                                            ↓
                                    INSERT ... ON CONFLICT DO UPDATE
                                            ↓
                                    Redis cache invalidation
```

## Task `ingest_1m_price_data`

Task Celery là wrapper đồng bộ gọi coroutine async qua `asyncio.run()`:

```python
@celery_app.task(name="src.price.tasks.ingest_1m_price_data")
def ingest_1m_price_data():
    asyncio.run(_ingest_1m_price_data())
```

`asyncio.run()` tạo event loop mới cho mỗi lần chạy — cách tiếp cận này tương thích với Celery (đồng bộ by default) trong khi vẫn dùng được async SQLAlchemy.

## Download theo batch 50 tickers

```python
BATCH_SIZE = 50
DOWNLOAD_PERIOD = "7d"

async def _ingest_1m_price_data():
    async with TaskSessionLocal() as db:
        result = await db.execute(select(Asset).where(Asset.is_active == True))
        active_assets = result.scalars().all()
        tickers = list(ticker_to_id.keys())
        
        for i in range(0, len(tickers), BATCH_SIZE):
            batch = tickers[i : i + BATCH_SIZE]
            await _process_ticker_batch(db, batch, ticker_to_id)
```

`yf.download()` hỗ trợ multi-ticker trong một request — truyền tất cả ticker trong batch dưới dạng space-separated string. Với 18 ticker hiện tại, toàn bộ chạy trong 1 batch (18 < 50). Khi mở rộng lên hàng trăm ticker, batch tự động chia nhỏ.

## Retry với exponential backoff

```python
MAX_RETRIES = 3
RETRY_BASE_DELAY = 2.0  # seconds

for attempt in range(1, MAX_RETRIES + 1):
    try:
        df = await asyncio.to_thread(download_fn)
        break
    except Exception as fetch_err:
        if attempt == MAX_RETRIES:
            raise
        delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
        await asyncio.sleep(delay)
```

Độ trễ retry: 2s → 4s → exception. `asyncio.to_thread()` chạy blocking yfinance call trong thread pool — không block event loop trong khi chờ HTTP response.

## Parse multi-ticker DataFrame

```python
is_multi = len(tickers) > 1

for ticker in tickers:
    asset_id = ticker_to_id[ticker]
    ticker_df = df[ticker] if is_multi else df  # yfinance trả về flat DF khi chỉ có 1 ticker
    ticker_df = ticker_df.dropna(subset=["Close"])
    
    for ts, row in ticker_df.iterrows():
        records.append({
            "asset_id": asset_id,
            "timestamp": ts.to_pydatetime(),
            "timeframe": "1m",
            "open":  float(row["Open"]),
            "high":  float(row["High"]),
            "low":   float(row["Low"]),
            "close": float(row["Close"]),
            "adj_close": float(row.get("Adj Close", row["Close"])),
            "volume": float(row["Volume"]),
        })
```

yfinance trả về MultiIndex DataFrame khi download nhiều ticker (`df[ticker]` để lấy sub-DataFrame), nhưng flat DataFrame khi chỉ có 1 ticker. `is_multi` phân biệt hai trường hợp.

## Upsert với ON CONFLICT DO UPDATE

```python
INSERT_CHUNK_SIZE = 2000

for i in range(0, len(records), INSERT_CHUNK_SIZE):
    chunk = records[i : i + INSERT_CHUNK_SIZE]
    stmt = insert(PriceData).values(chunk)
    stmt = stmt.on_conflict_do_update(
        index_elements=["asset_id", "timestamp", "timeframe"],
        set_={
            "open": stmt.excluded.open,
            "high": stmt.excluded.high,
            "low":  stmt.excluded.low,
            "close": stmt.excluded.close,
            ...
        },
    )
    await db.execute(stmt)
```

Task 1m chạy mỗi phút với `period="7d"` — toàn bộ 7 ngày lịch sử 1m được re-download mỗi lần (yfinance không hỗ trợ "chỉ fetch candle mới nhất"). Kết quả là phần lớn bản ghi đã tồn tại trong DB. `ON CONFLICT DO UPDATE` cập nhật giá trị mới — quan trọng cho **candle đang hình thành** (candle cuối cùng của 7 ngày): mỗi phút giá `close`, `high`, `low` của nến đang chạy được refresh.

## Invalidate Redis cache

```python
await _invalidate_price_cache(tickers)  # xóa cache sau mỗi lần ingest
```

Celery worker là tiến trình riêng — không dùng được Redis connection của FastAPI. Task tự tạo Redis connection mới, xóa tất cả key `price:history:{ticker}:*` và `price:latest:{ticker}`, rồi đóng connection. Request API tiếp theo từ frontend sẽ query TimescaleDB và populate cache mới.
