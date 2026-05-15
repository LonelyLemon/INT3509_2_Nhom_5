# 4.2.3 Middleware: CORS, Security Headers, Rate Limiting

`main.py` đăng ký ba lớp middleware theo thứ tự từ ngoài vào trong: Security Headers → CORS → Rate Limiter. Mỗi request đi qua toàn bộ chuỗi trước khi đến route handler.

## CORS Middleware

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGINS_REGEX,
    allow_credentials=True,
    allow_methods=("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"),
    allow_headers=settings.CORS_HEADERS,
)
```

Cấu hình CORS được đọc từ biến môi trường `CORS_ORIGINS`. Trong môi trường development, `CORS_ORIGINS=["*"]` cho phép mọi origin. Trong production, giá trị này được thay bằng domain cụ thể của frontend. `allow_credentials=True` cần thiết để trình duyệt gửi cookie và `Authorization` header trong cross-origin request.

## Security Headers Middleware

```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if request.url.path.startswith("/api/") or request.url.path.startswith("/auth/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response
```

Năm header bảo mật được thêm vào mọi response:

| Header | Giá trị | Mục đích bảo vệ |
|--------|---------|----------------|
| `X-Content-Type-Options` | `nosniff` | Chặn MIME-type sniffing — trình duyệt không tự suy ra content type |
| `X-Frame-Options` | `DENY` | Chặn clickjacking — không cho embed trong `<iframe>` |
| `X-XSS-Protection` | `1; mode=block` | Bật XSS filter của trình duyệt cũ (IE, Chrome <78) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Giới hạn thông tin referrer gửi đến bên thứ ba |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Bắt buộc HTTPS trong 1 năm, kể cả subdomain |

API và auth endpoint nhận thêm `Cache-Control: no-store` — ngăn trình duyệt và proxy lưu cache dữ liệu tài chính nhạy cảm hay JWT response.

## Rate Limiter Middleware

```python
class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)
        
        redis_client = get_redis()
        if redis_client is None:
            return await call_next(request)

        user_sub = _extract_user_sub(request)
        if user_sub:
            key = f"rate_limit:user:{user_sub}"
            limit = settings.RATE_LIMIT_REQUESTS * _AUTHED_LIMIT_MULTIPLIER  # 500/60s
        else:
            client_ip = request.client.host
            key = f"rate_limit:ip:{client_ip}"
            limit = settings.RATE_LIMIT_REQUESTS  # 100/60s
        
        current_count = await redis_client.incr(key)
        if current_count == 1:
            await redis_client.expire(key, settings.RATE_LIMIT_WINDOW)
        
        if current_count > limit:
            return JSONResponse(status_code=429, ...)
        ...
```

Middleware triển khai **sliding window counter** dựa trên Redis. Khi counter key chưa tồn tại (lần đầu trong window), `INCR` tạo key với value=1 rồi ngay lập tức `EXPIRE` 60 giây — đảm bảo window luôn có TTL dù counter vừa được tạo.

**Chiến lược bucket theo user thay vì IP:** Trong môi trường Docker, tất cả container của cùng một host chia sẻ địa chỉ IP gateway (`172.18.0.x`). Nếu chỉ dùng IP làm key, toàn bộ user trong một Docker host sẽ dùng chung một bucket — dễ bị "thundering herd". Giải pháp: với request có JWT hợp lệ, decode token để lấy `sub` (user ID) làm key, cấp giới hạn cao hơn 5 lần (`100 × 5 = 500 request/phút`). Request chưa xác thực dùng IP với giới hạn thấp (100/phút).

Middleware trả thêm header `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` trong mọi response — giúp client biết trạng thái rate limit hiện tại mà không cần đợi lỗi 429.

Các path kỹ thuật (`/health`, `/docs`, `/openapi.json`, `/redoc`) được loại trừ khỏi rate limiting để không ảnh hưởng đến health check và developer tool.
