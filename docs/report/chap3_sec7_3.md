# 3.7.3 Luồng Xem Biểu Đồ và Chỉ Báo Kỹ Thuật

Luồng xem biểu đồ kỹ thuật phục vụ trang Chart của MarketMind — nơi người dùng xem candlestick chart và các chỉ báo kỹ thuật overlay (RSI, MACD, SMA, EMA). Luồng này được tối ưu cho tốc độ phản hồi thông qua Redis cache và chiến lược aggregation on-the-fly với TimescaleDB.

## Luồng tải dữ liệu biểu đồ

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as FastAPI
    participant REDIS as Redis
    participant DB as PostgreSQL/TimescaleDB

    FE->>API: GET /price/{ticker}?timeframe=1d&limit=200
    API->>REDIS: GET price:history:{ticker}:1d:200:null:null
    
    alt Cache HIT
        REDIS-->>API: JSON string
        API-->>FE: PriceHistoryResponse (từ cache)
    else Cache MISS
        API->>DB: SELECT asset WHERE ticker=?
        DB-->>API: Asset record

        alt timeframe cần aggregation (4h, 1d)
            API->>DB: time_bucket('1 day', timestamp)\nfrom price_data WHERE timeframe='1h'
            DB-->>API: Aggregated OHLCV rows
        else timeframe lưu trực tiếp (1m, 5m, 15m, 30m, 1h)
            API->>DB: SELECT * FROM price_data\nWHERE timeframe='1m' ORDER BY DESC LIMIT 200
            DB-->>API: Raw rows
        end

        API->>API: Serialize → PriceHistoryResponse
        API->>REDIS: SET cache_key {response_json} EX {ttl}
        API-->>FE: PriceHistoryResponse
    end
```

## Chiến lược lưu trữ và aggregation

Hệ thống không lưu riêng dữ liệu cho mọi timeframe. Thay vào đó, **4h và 1d được derive on-the-fly** từ dữ liệu 1h đã lưu:

| Timeframe yêu cầu | Nguồn dữ liệu | Phương pháp |
|-------------------|---------------|-------------|
| `1m` | Stored `1m` | Query trực tiếp |
| `5m` | Stored `5m` | Query trực tiếp |
| `15m` | Stored `15m` | Query trực tiếp |
| `30m` | Stored `30m` | Query trực tiếp |
| `1h` | Stored `1h` | Query trực tiếp |
| `4h` | Stored `1h` | `time_bucket('4 hours', timestamp)` |
| `1d` | Stored `1h` | `time_bucket('1 day', timestamp)` |

TimescaleDB `time_bucket()` cùng với `first()`, `last()`, `max()`, `min()`, `sum()` aggregate functions cho phép tính OHLCV aggregation chính xác trong một SQL query mà không cần lưu thêm bảng.

## Luồng tải chỉ báo kỹ thuật

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL

    FE->>API: GET /indicators/{ticker}?timeframe=1d
    API->>DB: SELECT user_indicator_settings WHERE user_id=?
    DB-->>API: {RSI: {period: 14}, MACD: {fast: 12, slow: 26}, SMA: [20, 50], EMA: [12, 26]}

    API->>DB: SELECT price_data WHERE ticker AND timeframe ORDER BY timestamp DESC LIMIT N
    DB-->>API: OHLCV series

    API->>API: compute RSI(period=14)
    API->>API: compute MACD(fast=12, slow=26, signal=9)
    API->>API: compute SMA([20, 50])
    API->>API: compute EMA([12, 26])

    API-->>FE: IndicatorResult {RSI, MACD, SMA[], EMA[], current_price, candles_used}
```

**Cá nhân hóa chỉ báo:** Mỗi user có thể tùy chỉnh tham số indicator (RSI period, MACD fast/slow/signal, SMA/EMA periods) lưu trong bảng `user_indicator_settings` (JSONB). Khi tính chỉ báo, service đọc cài đặt cá nhân của user. Nếu user chưa có cài đặt, dùng giá trị mặc định chuẩn kỹ thuật (RSI 14, MACD 12/26/9).

## Luồng cập nhật giá real-time trên biểu đồ

```mermaid
sequenceDiagram
    participant FE as Frontend (polling)
    participant API as FastAPI
    participant REDIS as Redis

    loop Mỗi 30-60 giây
        FE->>API: GET /price/{ticker}/latest
        API->>REDIS: GET price:latest:{ticker}
        alt Cache HIT (≤45s tuổi)
            REDIS-->>API: Latest price JSON
            API-->>FE: LatestPriceResponse
        else Cache MISS
            API->>DB: SELECT TOP 2 FROM price_data WHERE ticker ORDER BY timestamp DESC
            DB-->>API: 2 rows (latest + prev)
            API->>API: Tính change_amount, change_pct
            API->>REDIS: SET price:latest:{ticker} EX 45
            API-->>FE: LatestPriceResponse
        end
    end
```

**Không dùng WebSocket:** Giá được cập nhật qua polling từ frontend thay vì WebSocket push. Với tần suất cập nhật 1 phút (giới hạn bởi yfinance interval), polling 30-60 giây từ client là đủ để hiển thị "gần real-time" mà không cần duy trì connection liên tục — đơn giản hóa đáng kể phía server.

**Nến hiện tại:** `GET /price/{ticker}/latest` trả về nến 1m gần nhất cùng với `change_amount` và `change_pct` so với nến trước đó. Frontend dùng thông tin này để cập nhật nến đang hình thành trên chart mà không cần tải lại toàn bộ lịch sử.
