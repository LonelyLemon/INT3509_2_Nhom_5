# 4.6.5 Rate Limiting AI Per-User Qua Redis Counter

## Vấn đề cần giải quyết

AI chat endpoint tốn nhiều tài nguyên hơn các endpoint thông thường vì mỗi request:
1. Gọi Intent Agent (1 LLM call, ~0.5-1s)
2. Gọi Specialized Agent (1+ LLM calls, có thể nhiều tool calls)
3. Consume Google Gemini API tokens (chi phí tiền thực)

Rate limit tổng quát ở middleware (100 request/phút per user) không đủ — một user có thể spam 100 AI queries liên tục trong 1 phút và ngốn toàn bộ quota Gemini.

## Triển khai AI-specific rate limit

```python
# ai/router.py
_AI_RATE_LIMIT = 20   # queries per user
_AI_RATE_WINDOW = 60  # seconds

async def _check_ai_rate_limit(user_id: UUID) -> None:
    redis = get_redis()
    if redis is None:
        return  # Graceful degradation: không có Redis → không rate limit
    
    key = f"ai_rate:{user_id}"
    count = await redis.incr(key)
    
    if count == 1:
        await redis.expire(key, _AI_RATE_WINDOW)  # Set TTL khi tạo key
    
    if count > _AI_RATE_LIMIT:
        ttl = await redis.ttl(key)
        raise AIRateLimitExceeded(retry_after=max(ttl, 1))
```

## Per-user bucket thay vì global

Key `ai_rate:{user_id}` (UUID) đảm bảo mỗi user có counter riêng biệt. Điều này quan trọng vì:
- User A spam không ảnh hưởng đến User B
- Admin user nếu cần có thể được miễn rate limit bằng cách bỏ qua check cho `role == "admin"`
- Log rõ ràng ai đang bị rate limit (user_id trong key)

## INCR + EXPIRE atomicity

```python
count = await redis.incr(key)  # Tạo key với value=1 nếu chưa có, hoặc tăng
if count == 1:
    await redis.expire(key, _AI_RATE_WINDOW)  # Set TTL 60 giây
```

`INCR` và `EXPIRE` là hai lệnh riêng — không atomic. Có một race condition lý thuyết: nếu server crash sau `INCR` nhưng trước `EXPIRE`, key tồn tại mãi mãi và user bị block vĩnh viễn.

Trong thực tế, xác suất xảy ra rất thấp (window nhỏ giữa hai Redis command). Cách an toàn hơn là dùng Lua script hay `SET key 0 EX 60 NX` + `INCR`, nhưng complexity cao hơn và vấn đề đủ hiếm để chấp nhận. Đây là trade-off pragmatic cho dự án ở quy mô hiện tại.

## Phản hồi khi bị rate limit

```python
class AIRateLimitExceeded(Exception):
    def __init__(self, retry_after: int):
        self.detail = f"Đã đạt giới hạn {_AI_RATE_LIMIT} câu hỏi/phút. Thử lại sau {retry_after} giây."
        self.retry_after = retry_after
```

Khi bị rate limit, handler emit event SSE `error` với thông báo rõ ràng:

```python
except AIRateLimitExceeded as e:
    await db.rollback()
    yield _sse("error", {"detail": e.detail})
```

Frontend hiển thị thông báo lỗi có countdown — user biết chính xác cần chờ bao lâu.

## Hai tầng rate limiting

AI chat có hai tầng rate limit độc lập:

| Tầng | Giới hạn | Scope | Implemented tại |
|------|---------|-------|----------------|
| Global middleware | 500 req/60s | Tất cả API endpoint | `RateLimiterMiddleware` |
| AI-specific | 20 queries/60s | `/ai/chat` | `_check_ai_rate_limit()` |

Global middleware ngăn DDoS vào toàn bộ API. AI-specific limit ngăn Gemini API cost runaway từ một user cụ thể. Cả hai dùng Redis counter với sliding window.

## Graceful degradation khi Redis không khả dụng

```python
redis = get_redis()
if redis is None:
    return  # Tiếp tục xử lý không có rate limit
```

Nếu Redis crash, `get_redis()` trả về `None`. Thay vì để AI chat hỏng hoàn toàn, hệ thống bỏ qua rate limit và tiếp tục hoạt động. Đây là thiết kế "best effort" — uptime ưu tiên hơn strict enforcement trong trường hợp Redis không khả dụng tạm thời.
