# Báo cáo Kỹ thuật: Module Price

> **Dự án:** MarketMind  
> **Phạm vi tài liệu:** `backend/src/price/`

---

## Mục lục

1. [Tổng quát](#1-tổng-quát)
2. [Cấu trúc & thành phần](#2-cấu-trúc--thành-phần)
3. [Data Model](#3-data-model)
4. [Pipeline ingestion dữ liệu giá](#4-pipeline-ingestion-dữ-liệu-giá)
5. [Chiến lược caching](#5-chiến-lược-caching)
6. [Aggregation timeframes với TimescaleDB](#6-aggregation-timeframes-với-timescaledb)
7. [Sơ đồ luồng](#7-sơ-đồ-luồng)
8. [Hệ thống API](#8-hệ-thống-api)

---

## 1. Tổng quát

Module `price` quản lý dữ liệu giá tài chính của MarketMind:

- **Quản lý danh sách tài sản (tickers)** theo dõi — hỗ trợ STOCK, CRYPTO, FOREX, ETF, INDEX
- **Thu thập giá tự động** mỗi phút qua Celery Beat (yfinance)
- **Lưu trữ raw 1m candles** trong PostgreSQL/TimescaleDB
- **Aggregation on-the-fly** từ 1m sang 5m, 15m, 30m, 1h, 4h, 1d dùng `time_bucket()`
- **Caching tầng Redis** với TTL được căn chỉnh theo từng timeframe
- **API chart-ready** trả dữ liệu OHLCV sẵn sàng render

**Nguồn dữ liệu:** Yahoo Finance (qua thư viện `yfinance`)

**Đặc điểm thiết kế:**
- Chỉ ingest và lưu timeframe `1m`, các timeframe khác được tính từ `1m` khi có request — tránh dư thừa dữ liệu
- `ON CONFLICT DO NOTHING` khi insert — idempotent, an toàn khi chạy lại
- Batch processing: xử lý tối đa 50 tickers/lần download

---

## 2. Cấu trúc & thành phần

```
backend/src/price/
├── __init__.py
├── models.py          # ORM: Asset, PriceData
├── schemas.py         # Pydantic schemas
├── constants.py       # Enum: AssetType
├── exceptions.py      # HTTP exceptions
├── router.py          # API endpoints
├── tasks.py           # Celery task: ingest_1m_price_data
└── yfinance_service.py # (Wrapper, hiện ít dùng)
```

---

## 3. Data Model

```
┌──────────────────────────────────────────────────┐
│                     Asset                        │
├──────────────────────────────────────────────────┤
│ id         : UUID (PK)                           │
│ ticker     : String(20), unique, not null, index │
│ name       : String(256), nullable               │
│ asset_type : Enum(AssetType), not null           │
│ is_active  : Boolean, default=True               │
│ created_at : datetime                            │
│ updated_at : datetime                            │
│                                                  │
│ price_data : relationship → PriceData[]          │
│              (cascade=all, lazy=noload)          │
└──────────────────────────────────────────────────┘
                     │ 1:N
┌──────────────────────────────────────────────────┐
│                   PriceData                      │
├──────────────────────────────────────────────────┤
│ id        : UUID (PK)                            │
│ asset_id  : UUID (FK → assets.id, CASCADE)       │
│ timestamp : TIMESTAMP(tz), not null              │
│ timeframe : String(10), not null   ← luôn "1m"  │
│ open      : Float, not null                      │
│ high      : Float, not null                      │
│ low       : Float, not null                      │
│ close     : Float, not null                      │
│ adj_close : Float, nullable                      │
│ volume    : Float, not null                      │
│                                                  │
│ UNIQUE(asset_id, timestamp, timeframe)           │
│ INDEX(asset_id, timestamp) — btree               │
└──────────────────────────────────────────────────┘
```

**AssetType Enum:**
```
STOCK | CRYPTO | FOREX | ETF | INDEX
```

**TimescaleDB:** Bảng `price_data` được cấu hình là hypertable (qua migration Alembic) để tối ưu query theo time range.

---

## 4. Pipeline Ingestion Dữ liệu Giá

### Celery Task: `ingest_1m_price_data`

Chạy **mỗi phút** theo Celery Beat schedule.

```python
@celery_app.task(name="src.price.tasks.ingest_1m_price_data")
def ingest_1m_price_data():
    asyncio.run(_ingest_1m_price_data())
```

**Tham số quan trọng:**
```python
BATCH_SIZE = 50          # tối đa 50 tickers/lần download
LOOKBACK_MINUTES = 30    # lấy 30 phút gần nhất mỗi run
```

**Lý do dùng `LOOKBACK_MINUTES=30`:** Đủ rộng để chịu được 1–2 lần bị bỏ lỡ (nếu worker chết ngắn), nhưng không quá rộng để download dữ liệu thừa. `ON CONFLICT DO NOTHING` đảm bảo dữ liệu trùng không bị insert hai lần.

### Chi tiết pipeline

```
1. Query active assets:
   SELECT * FROM assets WHERE is_active = TRUE

2. Tính time range:
   end   = now(UTC)
   start = end - 30 minutes

3. Chia tickers thành batches 50:
   [batch_0: AAPL, TSLA, ...(50 tickers)]
   [batch_1: BTC-USD, ETH-USD, ...(50 tickers)]

4. Với mỗi batch:
   ┌─ asyncio.to_thread(yf.download(...)) ─┐
   │  tickers = "AAPL TSLA MSFT ..."       │
   │  interval = "1m"                      │
   │  start = start, end = end             │
   │  group_by = "ticker"                  │
   │  threads = False                      │
   └───────────────────────────────────────┘
   
5. Parse DataFrame → records[]:
   {asset_id, timestamp, timeframe="1m",
    open, high, low, close, adj_close, volume}

6. PostgreSQL upsert:
   INSERT INTO price_data (...) VALUES (...)
   ON CONFLICT (asset_id, timestamp, timeframe)
   DO NOTHING
   
7. db.commit()
```

**Xử lý multi-ticker DataFrame:**
```python
# yfinance trả về multi-level columns khi nhiều tickers
is_multi = len(tickers) > 1
ticker_df = df[ticker] if is_multi else df
```

---

## 5. Chiến lược Caching

Price API sử dụng Redis cache để giảm tải DB, đặc biệt quan trọng vì dữ liệu giá được query nhiều (charts, watchlist, portfolio).

**Cache keys:**
```
price:history:{ticker}:{timeframe}:{limit}:{start}:{end}
price:latest:{ticker}
```

**TTL theo timeframe** — được set thấp hơn interval một chút để request tiếp theo bắt được candle mới:

| Timeframe | Interval thực | Cache TTL |
|---|---|---|
| 1m | 60s | **45s** |
| 5m | 300s | **240s** (4 phút) |
| 15m | 900s | **780s** (13 phút) |
| 30m | 1800s | **1680s** (28 phút) |
| 1h | 3600s | **3300s** (55 phút) |
| 4h | 14400s | **13800s** (3h50m) |
| 1d | 86400s | **82800s** (23h) |
| Latest | — | **45s** |

**Logic cache:**
```python
cache_key = f"price:history:{ticker}:{timeframe}:{limit}:{start}:{end}"

# Check cache trước
if redis:
    cached = await redis.get(cache_key)
    if cached:
        return PriceHistoryResponse.model_validate_json(cached)

# Query DB
...

# Lưu vào cache
if redis:
    await redis.set(cache_key, response.model_dump_json(), ex=TTL)
```

---

## 6. Aggregation Timeframes với TimescaleDB

Thay vì ingest và lưu 7 timeframes riêng biệt (tốn ~7x storage), hệ thống chỉ lưu `1m` và aggregate on-the-fly dùng **TimescaleDB `time_bucket()`**:

**Mapping timeframe → PostgreSQL interval:**

```python
TIMEFRAME_INTERVAL = {
    "5m":  "5 minutes",
    "15m": "15 minutes",
    "30m": "30 minutes",
    "1h":  "1 hour",
    "4h":  "4 hours",
    "1d":  "1 day",
}
```

**SQL query aggregation:**
```sql
SELECT
    time_bucket('15 minutes'::interval, timestamp)  AS timestamp,
    first(open,  timestamp)                          AS open,
    max(high)                                        AS high,
    min(low)                                         AS low,
    last(close,  timestamp)                          AS close,
    sum(volume)                                      AS volume
FROM price_data
WHERE
    asset_id  = :asset_id
    AND timeframe = '1m'
    AND (:start IS NULL OR timestamp >= :start)
    AND (:end   IS NULL OR timestamp <= :end)
GROUP BY time_bucket('15 minutes'::interval, timestamp)
ORDER BY timestamp DESC
LIMIT :limit
```

**Các TimescaleDB functions được dùng:**
- `time_bucket(interval, timestamp)` — nhóm các candles theo bucket thời gian
- `first(value, time)` — lấy giá trị đầu bucket (open)
- `last(value, time)` — lấy giá trị cuối bucket (close)
- `max(value)` — giá cao nhất (high)
- `min(value)` — giá thấp nhất (low)
- `sum(value)` — tổng khối lượng (volume)

---

## 7. Sơ đồ luồng

### Luồng Ingestion (mỗi phút)

```
Celery Beat (every minute)
    │
    ▼
ingest_1m_price_data()
    │
    ▼
SELECT assets WHERE is_active=TRUE
    │  → [AAPL, TSLA, BTC-USD, ...]
    │
    ▼
Split into batches of 50
    │
    ▼ (cho mỗi batch)
asyncio.to_thread(
    yf.download(
        "AAPL TSLA ...",
        interval="1m",
        start=now-30min,
        end=now
    )
)
    │
    ▼
Parse DataFrame → records[]
    │
    ▼
INSERT INTO price_data (...)
ON CONFLICT DO NOTHING
    │
    ▼
db.commit()
```

### Luồng GET /price/{ticker}?timeframe=15m (với cache)

```
Client: GET /price/AAPL?timeframe=15m&limit=100
    │
    ▼
cache_key = "price:history:AAPL:15m:100:None:None"
Redis.GET(cache_key)
    ├─ HIT → return cached JSON (immediate)
    └─ MISS ↓
    │
    ▼
SELECT Asset WHERE ticker = "AAPL"
    │
    ▼
timeframe = "15m" (không phải "1m")
    │
    ▼
TimescaleDB time_bucket("15 minutes", ...) query
GROUP BY bucket, ORDER BY DESC, LIMIT 100
    │
    ▼
Reverse rows (→ ascending order cho chart)
    │
    ▼
Build PriceHistoryResponse
    │
    ▼
Redis.SET(cache_key, json, ex=780s)
    │
    ▼
Return response
```

---

## 8. Hệ thống API

Tất cả endpoints có prefix `/price`.

---

### `GET /price/tickers`

Liệt kê tất cả tickers đang được theo dõi, hỗ trợ tìm kiếm và lọc.

**Query Parameters:**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `q` | string | Tìm kiếm theo ticker hoặc tên (ILIKE) |
| `asset_type` | AssetType | Lọc theo loại tài sản |
| `is_active` | boolean | Lọc theo trạng thái hoạt động |
| `skip` | int (≥0, default=0) | Phân trang |
| `limit` | int (1–200, default=50) | Phân trang |

**Response `200 OK`:**
```json
[
  {
    "id": "uuid",
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "asset_type": "STOCK",
    "is_active": true
  }
]
```

---

### `POST /price/tickers` *(Admin only)*

Thêm ticker mới vào danh sách theo dõi. Khi `is_active=true`, Celery Beat tự động bắt đầu ingest trong lần chạy tiếp theo.

**Request Body:**
```json
{
  "ticker": "NVDA",
  "name": "NVIDIA Corporation",
  "asset_type": "STOCK",
  "is_active": true
}
```

**Response `201 Created`:** `AssetResponse`

**Lỗi:**
- `403 Forbidden` — Không phải admin
- `409 Conflict` — Ticker đã tồn tại

---

### `GET /price/tickers/{ticker}`

Lấy thông tin chi tiết một ticker.

**Response `200 OK`:** `AssetResponse`

**Lỗi:** `404 Not Found`

---

### `PATCH /price/tickers/{ticker}` *(Admin only)*

Cập nhật thông tin ticker. Dùng `is_active=false` để tạm dừng ingestion mà không mất lịch sử giá.

**Request Body:** `AssetUpdate` (tất cả trường optional)
```json
{
  "is_active": false
}
```

---

### `DELETE /price/tickers/{ticker}` *(Admin only)*

Xóa ticker và **toàn bộ lịch sử giá** (CASCADE).

**Response:** `204 No Content`

---

### `POST /price/fetch` *(Admin only)*

Kích hoạt ingestion thủ công cho tất cả active tickers (dispatch Celery task).

**Response `202 Accepted`:**
```json
{
  "message": "Price ingestion task dispatched.",
  "status": "queued"
}
```

---

### `GET /price/{ticker}`

Lấy lịch sử OHLCV (chart data) cho một ticker.

**Path Parameters:** `ticker` (string, VD: "AAPL")

**Query Parameters:**

| Tham số | Kiểu | Default | Mô tả |
|---|---|---|---|
| `timeframe` | string | `1m` | `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d` |
| `limit` | int (1–1000) | 200 | Số candles tối đa trả về |
| `start` | datetime (UTC) | — | Bắt đầu time range |
| `end` | datetime (UTC) | — | Kết thúc time range |

**Response `200 OK`:**
```json
{
  "ticker": "AAPL",
  "timeframe": "1d",
  "data": [
    {
      "timestamp": "2025-01-10T00:00:00Z",
      "open": 182.5,
      "high": 186.2,
      "low": 181.8,
      "close": 185.1,
      "adj_close": 185.1,
      "volume": 58234100.0
    },
    ...
  ]
}
```

Data được trả theo **thứ tự tăng dần** (oldest → newest), sẵn sàng để render chart.

**Caching:** Response được cache trong Redis với TTL theo timeframe (45s → 23h).

**Lỗi:**
- `400 Bad Request` — Timeframe không hợp lệ
- `404 Not Found` — Ticker không tồn tại

---

### `GET /price/{ticker}/latest`

Lấy giá mới nhất (nến 1m gần nhất), bao gồm thay đổi so với nến trước.

**Response `200 OK`:**
```json
{
  "ticker": "AAPL",
  "timestamp": "2025-01-15T15:30:00Z",
  "open": 184.8,
  "high": 185.3,
  "low": 184.5,
  "close": 185.1,
  "volume": 1234567.0,
  "change_amount": 0.6,
  "change_percentage": 0.3247
}
```

**Caching:** 45 giây trong Redis.

**Lỗi:**
- `404 Not Found` — Ticker không tồn tại
- `404 Not Found` — Không có dữ liệu giá

---

**Bảng tóm tắt API:**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/price/tickers` | Không | Danh sách tickers |
| `POST` | `/price/tickers` | Admin | Thêm ticker mới |
| `GET` | `/price/tickers/{ticker}` | Không | Thông tin ticker |
| `PATCH` | `/price/tickers/{ticker}` | Admin | Cập nhật ticker |
| `DELETE` | `/price/tickers/{ticker}` | Admin | Xóa ticker |
| `POST` | `/price/fetch` | Admin | Trigger ingestion thủ công |
| `GET` | `/price/{ticker}` | Không | Lịch sử OHLCV (chart) |
| `GET` | `/price/{ticker}/latest` | Không | Giá mới nhất |

> **Lưu ý thứ tự route:** Các routes `/tickers` và `/fetch` phải được khai báo **trước** `/{ticker}` để FastAPI không nhầm "tickers"/"fetch" là ticker path parameter.
