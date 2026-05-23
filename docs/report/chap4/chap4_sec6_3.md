# 4.6.3 Aggregation Đa Timeframe Không Lưu Dư Thừa (TimescaleDB `time_bucket()`)

## Vấn đề thiết kế

MarketMind hỗ trợ 7 timeframe: 1m, 5m, 15m, 30m, 1h, 4h, 1d. Cách tiếp cận ngây thơ là lưu riêng từng timeframe — nhưng tính chứa (containment) của timeframe tạo ra dư thừa:

```
1h chứa: 60 nến 1m
4h chứa: 4 nến 1h
1d chứa: 24 nến 1h
```

Nếu lưu tất cả 7 timeframe, dữ liệu giá 1h đã được đại diện bởi cả 1m (60x) và 1h (1x) — lãng phí storage và phức tạp logic đồng bộ.

## Chiến lược lưu trữ

Chỉ lưu dữ liệu **"gốc"** (fetched natively từ yfinance):

| Timeframe lưu | Nguồn | Depth |
|--------------|-------|-------|
| `1m` | yfinance interval=1m | 7 ngày |
| `5m` | yfinance interval=5m | 60 ngày |
| `15m` | yfinance interval=15m | 60 ngày |
| `30m` | yfinance interval=30m | 60 ngày |
| `1h` | yfinance interval=1h | 730 ngày |

`4h` và `1d` **không lưu** — được tính on-the-fly từ `1h`.

## time_bucket() routing

```python
# Mapping: timeframe → (base_tf trong DB, aggregation interval)
_TIMEFRAME_CONFIG = {
    "1m":  ("1m",  None),         # query trực tiếp
    "5m":  ("5m",  None),         # query trực tiếp
    "15m": ("15m", None),         # query trực tiếp
    "30m": ("30m", None),         # query trực tiếp
    "1h":  ("1h",  None),         # query trực tiếp
    "4h":  ("1h",  "4 hours"),    # aggregate từ 1h
    "1d":  ("1h",  "1 day"),      # aggregate từ 1h
}
```

Khi `agg_interval is None` → query `price_data` trực tiếp (nhanh, dùng TimescaleDB chunk scan).
Khi `agg_interval` có giá trị → dùng `time_bucket()`:

```sql
SELECT
    time_bucket(INTERVAL '4 hours', timestamp) AS timestamp,
    first(open, timestamp)                      AS open,
    max(high)                                   AS high,
    min(low)                                    AS low,
    last(close, timestamp)                      AS close,
    sum(volume)                                 AS volume
FROM price_data
WHERE
    asset_id  = :asset_id
    AND timeframe = '1h'
    AND timestamp >= :start
GROUP BY time_bucket(INTERVAL '4 hours', timestamp)
ORDER BY timestamp DESC
LIMIT :limit
```

## time_bucket() là gì

`time_bucket()` là hàm của TimescaleDB extension — tương tự `date_trunc()` của PostgreSQL nhưng hỗ trợ interval tùy ý. `time_bucket('4 hours', timestamp)` làm tròn `timestamp` xuống mốc 4 giờ gần nhất (00:00, 04:00, 08:00, ...) — gom tất cả row trong cùng 4 giờ vào một bucket.

`first(open, timestamp)` là aggregate function của TimescaleDB: trả về giá trị `open` của row có `timestamp` nhỏ nhất trong bucket — đây là giá mở cửa của nến 4h. Tương tự `last(close, timestamp)` là giá đóng cửa.

## Lợi ích

1. **Tiết kiệm storage**: Không lưu thêm dữ liệu 4h hay 1d — 730 ngày × 1h là đủ cho cả ba timeframe (1h, 4h, 1d)

2. **Không cần đồng bộ**: Nếu lưu riêng, khi 1h data cập nhật thì 4h và 1d cũng phải cập nhật. Với aggregation on-the-fly, không bao giờ có inconsistency

3. **Depth bằng nhau**: 4h và 1d có cùng 730 ngày depth như 1h — nếu lưu riêng từ yfinance, `1d` chỉ có 730 ngày nhưng `4h` có thể ít hơn (yfinance limit cho interval=4h là ~730 ngày, nhưng phụ thuộc server)

## Cache per timeframe TTL

Response được cache trong Redis với TTL khác nhau theo timeframe — TTL ngắn hơn một chút so với interval để đảm bảo candle mới được lấy kịp:

```python
_HISTORY_TTL = {
    "1m":  45,          # < 60s (candle mới mỗi phút)
    "5m":  4 * 60,      # 4 phút
    "15m": 13 * 60,     # 13 phút
    "30m": 28 * 60,     # 28 phút
    "1h":  55 * 60,     # 55 phút
    "4h":  3 * 60 * 60 + 50 * 60,  # 3h50m
    "1d":  23 * 60 * 60,            # 23h
}
```
