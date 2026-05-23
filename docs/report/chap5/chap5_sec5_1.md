# 5.5.1 Thiết Kế Kiểm Thử Hiệu Năng

## Phạm vi kiểm thử

Kiểm thử hiệu năng trong dự án MarketMind tập trung vào **cơ chế giới hạn tần suất (rate limiting)** — lớp bảo vệ quan trọng nhất của API. Thay vì đo thời gian phản hồi tuyệt đối (vốn phụ thuộc vào phần cứng và không ổn định trong CI), các test này xác minh tính đúng đắn của hành vi rate limiting:

1. Các request trong ngưỡng cho phép không bị chặn
2. Request vượt ngưỡng nhận phản hồi 429 với nội dung chính xác
3. Response header `X-RateLimit-*` được gắn đúng
4. Path được loại trừ không bị ảnh hưởng bởi rate limiter dù counter đã vượt ngưỡng

## Kiến trúc Rate Limiter

Middleware `RateLimiterMiddleware` trong `src/core/rate_limiter.py` hoạt động theo cơ chế sliding window với Redis:

```
Request đến
    │
    ├── Path trong EXCLUDED_PATHS? → Bỏ qua, trả request về tiếp
    │   {"/health", "/docs", "/openapi.json", "/redoc"}
    │
    ├── Lấy IP hoặc user_id làm key
    │
    ├── INCR counter trong Redis (TTL = RATE_LIMIT_WINDOW giây)
    │
    ├── counter > limit? → 429 Too Many Requests
    │
    └── Thêm headers X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
        → Tiếp tục xử lý request
```

Người dùng đã xác thực nhận giới hạn cao gấp 5 lần so với người dùng ẩn danh.

## Chiến lược mock Redis stateful

Không dùng Redis thực. Thay vào đó, một AsyncMock Redis với counter chia sẻ trong bộ nhớ mô phỏng hành vi `INCR`:

```python
def _make_stateful_redis(initial_count: int = 0, ttl: int = 60):
    counter = {"value": initial_count}

    async def _incr(key):
        counter["value"] += 1
        return counter["value"]

    mock_redis = AsyncMock()
    mock_redis.incr = _incr                       # stateful: tăng và trả counter
    mock_redis.expire = AsyncMock()               # no-op
    mock_redis.ttl = AsyncMock(return_value=ttl)  # trả TTL cố định
    return mock_redis
```

Bằng cách khởi tạo `initial_count=limit`, test có thể giả lập trạng thái "counter đã đạt ngưỡng" mà không cần gửi `N` request trước. Đây là cách tiếp cận hiệu quả hơn so với loop thực tế.

## Endpoint được chọn để test

- **`/health`** — nằm trong `EXCLUDED_PATHS` → dùng để kiểm tra bypass
- **`/price/tickers`** — endpoint thực (không bị loại trừ) → dùng để kiểm tra rate limit thực sự

Khi test `/price/tickers`, DB session cũng phải được mock để tránh kết nối PostgreSQL thực:

```python
app.dependency_overrides[get_session] = _db_override()
# Trong _db_override(): db.execute trả MagicMock với scalars().all() = []
```

## Danh sách test case

| Test | Trạng thái Redis ban đầu | Endpoint | Kiểm tra |
|------|--------------------------|----------|---------|
| `test_requests_within_limit_pass` | `initial_count=0` | `/health` | Không có request nào nhận 429 |
| `test_request_exceeding_limit_returns_429` | `initial_count=limit` | `/price/tickers` | Status 429, body chứa "Too many requests" |
| `test_rate_limit_headers_present_on_normal_request` | `initial_count=0` | `/price/tickers` | Có headers X-RateLimit-* |
| `test_excluded_path_bypasses_rate_limit` | `initial_count=9999` | `/health` | Status 200, `get_redis` không được gọi |

## Cấu hình môi trường

Tương tự backend test, thư mục `/test/performance/` có `pyproject.toml` riêng:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
pythonpath = ["../../backend"]
testpaths = ["."]
```

Và file `.env` với các giá trị stub để pydantic-settings không thất bại khi import `src.main`. Giá trị `RATE_LIMIT_REQUESTS` được đọc trực tiếp từ `settings.RATE_LIMIT_REQUESTS` — đảm bảo test luôn dùng đúng ngưỡng được cấu hình trong production.
