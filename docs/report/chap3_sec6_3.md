# 3.6.3 Chiến Lược Cache với Redis

Redis đóng vai trò cache lớp ứng dụng trong MarketMind, giảm tải truy vấn lặp lại lên PostgreSQL/TimescaleDB cho hai loại dữ liệu phổ biến nhất: lịch sử giá và giá mới nhất. Cache được quản lý trực tiếp trong các handler của FastAPI price router — không qua middleware hay decorator tự động.

## Cache key và TTL theo timeframe

Mỗi cache entry có key định danh duy nhất kết hợp từ ticker, timeframe, và tham số truy vấn:

```
price:history:{ticker}:{timeframe}:{limit}:{start}:{end}
price:latest:{ticker}
```

TTL được căn chỉnh chặt với chu kỳ xuất hiện nến mới — ngắn hơn một chút so với khoảng thời gian nến để request kế tiếp sau khi nến mới hình thành vẫn nhận được dữ liệu tươi:

| Timeframe | TTL Cache | Lý do |
|-----------|-----------|-------|
| `1m` | 45 giây | Nến mới mỗi 60s; cache hết hạn trước khi nến tiếp theo đóng |
| `5m` | 4 phút | Nến mới mỗi 5 phút |
| `15m` | 13 phút | Nến mới mỗi 15 phút |
| `30m` | 28 phút | Nến mới mỗi 30 phút |
| `1h` | 55 phút | Nến mới mỗi 60 phút |
| `4h` | 3h 50m | Nến mới mỗi 4 giờ |
| `1d` | 23 giờ | Nến mới mỗi ngày |
| `latest` | 45 giây | Cập nhật theo 1m candle |

## Luồng đọc với cache-aside pattern

Cả hai endpoint `GET /price/{ticker}` và `GET /price/{ticker}/latest` đều dùng **cache-aside pattern** (lazy loading):

```
1. Tính cache_key từ tham số request
2. Đọc Redis → nếu cache HIT: parse + return ngay
3. Nếu cache MISS: truy vấn PostgreSQL
4. Serialize response → lưu vào Redis với TTL
5. Return response
```

Dữ liệu được serialize dưới dạng JSON (`model_dump_json()`) và deserialize bằng Pydantic (`model_validate_json()`) — đảm bảo type safety khi đọc từ cache.

## Invalidation chủ động sau ingestion

Ngoài TTL tự động, Celery Worker chủ động xóa cache sau mỗi lần ingestion thành công:

```python
async for key in client.scan_iter(f"price:history:{ticker}:*"):
    await client.delete(key)
await client.delete(f"price:latest:{ticker}")
```

Dùng `scan_iter` (không phải `keys`) để tránh blocking Redis khi có nhiều keys. Pattern `price:history:{ticker}:*` khớp với tất cả timeframe/limit/range combinations của một ticker — không cần biết chính xác những key nào đang tồn tại.

Invalidation là **best-effort**: nếu Redis không khả dụng hoặc lỗi xảy ra, lỗi được log và bỏ qua — không làm task ingestion thất bại. Dữ liệu cũ trong cache sẽ tự hết hạn theo TTL.

## Shared state ngoài cache

Ngoài cache giá, Redis còn được dùng để lưu shared state giữa các FastAPI instance:

| Key pattern | Nội dung | TTL |
|-------------|----------|-----|
| `token_blacklist:{token}` | Token JWT đã logout (blacklist) | Thời gian còn lại của token |
| `otp:{email}` | OTP đặt lại mật khẩu | 15 phút (900s) |
| `ai_rate:{user_id}` | Counter request AI per user | 60 giây |

Redis là **thành phần duy nhất có trạng thái chia sẻ** giữa nhiều FastAPI worker instance — không có dữ liệu session nào được lưu in-process. Điều này cho phép scale FastAPI theo chiều ngang mà không cần session affinity.

## Hành vi khi Redis không khả dụng

Tất cả các thao tác Redis đều kiểm tra `if redis:` trước khi thực thi. Nếu Redis không khởi động được hoặc kết nối bị mất, `get_redis()` trả về `None` và ứng dụng fallback về truy vấn trực tiếp PostgreSQL mỗi request. Hiệu năng giảm nhưng ứng dụng vẫn hoạt động bình thường — Redis failure không gây downtime.
