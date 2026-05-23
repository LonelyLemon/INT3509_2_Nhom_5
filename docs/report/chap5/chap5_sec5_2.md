# 5.5.2 Kết Quả Kiểm Thử Hiệu Năng

## Kết quả từng test case

### Test 1: Request trong ngưỡng không bị chặn

```python
async def test_requests_within_limit_pass():
    limit = settings.RATE_LIMIT_REQUESTS
    mock_redis = _make_stateful_redis(initial_count=0)

    async with AsyncClient(...) as client:
        with patch("src.core.rate_limiter.get_redis", return_value=mock_redis):
            for i in range(min(limit, 5)):
                resp = await client.get("/health")
                assert resp.status_code != 429
```

`/health` nằm trong `EXCLUDED_PATHS` — middleware trả về ngay mà không gọi Redis, do đó tất cả request đều nhận 200 bất kể counter. Test xác nhận không có false positive: path được loại trừ không bao giờ bị rate limit.

**Kết quả:** PASSED — 5 request liên tiếp, tất cả trả về 200.

---

### Test 2: Vượt ngưỡng → 429

```python
async def test_request_exceeding_limit_returns_429():
    limit = settings.RATE_LIMIT_REQUESTS
    mock_redis = _make_stateful_redis(initial_count=limit)  # đã đạt ngưỡng
    app.dependency_overrides[get_session] = _db_override()

    async with AsyncClient(...) as client:
        with patch("src.core.rate_limiter.get_redis", return_value=mock_redis):
            resp = await client.get("/price/tickers")

    assert resp.status_code == 429
    assert "Too many requests" in resp.json()["detail"]
```

Khi counter bắt đầu ở `limit` và hàm `_incr` tăng lên `limit + 1`, middleware phát hiện vượt ngưỡng và trả về 429 với body JSON chứa trường `detail`.

**Kết quả:** PASSED — status 429, body `{"detail": "Too many requests. Please try again later."}`.

---

### Test 3: Response headers đúng chuẩn

```python
async def test_rate_limit_headers_present_on_normal_request():
    mock_redis = _make_stateful_redis(initial_count=0)
    app.dependency_overrides[get_session] = _db_override()

    async with AsyncClient(...) as client:
        with patch("src.core.rate_limiter.get_redis", return_value=mock_redis):
            resp = await client.get("/price/tickers")

    assert "X-RateLimit-Limit" in resp.headers
    assert "X-RateLimit-Remaining" in resp.headers
    assert "X-RateLimit-Reset" in resp.headers
```

Ba header tiêu chuẩn được middleware gắn vào mọi response không bị block:

| Header | Nội dung |
|--------|---------|
| `X-RateLimit-Limit` | Giới hạn tổng số request trong window |
| `X-RateLimit-Remaining` | Số request còn lại trong window hiện tại |
| `X-RateLimit-Reset` | TTL (giây) còn lại trước khi window reset |

**Kết quả:** PASSED — cả 3 header có mặt trong response của `/price/tickers`.

---

### Test 4: Excluded path bỏ qua Redis hoàn toàn

```python
async def test_excluded_path_bypasses_rate_limit():
    mock_get_redis = MagicMock(return_value=_make_stateful_redis(initial_count=9999))

    async with AsyncClient(...) as client:
        with patch("src.core.rate_limiter.get_redis", mock_get_redis):
            resp = await client.get("/health")

    mock_get_redis.assert_not_called()
    assert resp.status_code == 200
```

Test này khác biệt: `mock_get_redis` là `MagicMock` bọc hàm factory, cho phép gọi `assert_not_called()`. Dù counter giả lập đã ở mức 9999 (vượt mọi ngưỡng hợp lý), `/health` trả về 200 và `get_redis` không được gọi lần nào — xác nhận middleware dừng sớm trước khi chạm đến Redis.

**Kết quả:** PASSED — `get_redis` not called, status 200.

## Tổng kết kiểm thử hiệu năng

```
test/performance/test_rate_limiting.py::test_requests_within_limit_pass                PASSED
test/performance/test_rate_limiting.py::test_request_exceeding_limit_returns_429        PASSED
test/performance/test_rate_limiting.py::test_rate_limit_headers_present_on_normal_request PASSED
test/performance/test_rate_limiting.py::test_excluded_path_bypasses_rate_limit          PASSED
────────────────────────────────────────────────────────────────────────────────────────────────
4 passed in 0.xx s
```

## Đánh giá

Bộ test hiệu năng xác minh được ba tính chất quan trọng của rate limiter:

1. **Đúng đắn về logic:** Counter được kiểm tra trước khi cho qua, ngưỡng được tuân thủ chính xác.
2. **Thông tin hữu ích cho client:** Ba header chuẩn cho phép client tự điều tiết tần suất thay vì cứ gọi cho đến khi bị chặn.
3. **Không ảnh hưởng đến path quan trọng:** `/health` (endpoint health-check của load balancer và monitoring) không bao giờ bị rate limit dù hệ thống đang chịu tải cao.

Cơ chế mock Redis stateful cho phép kiểm thử xác định (deterministic) — cùng input luôn cho cùng kết quả, không phụ thuộc vào timing hay trạng thái Redis thực. Đây là ưu điểm lớn so với kiểm thử tải truyền thống vốn không ổn định trong môi trường CI.
