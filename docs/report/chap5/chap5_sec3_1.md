# 5.3.1 Kiểm Thử Tích Hợp API — Backend

Kiểm thử tích hợp backend xác nhận rằng toàn bộ luồng HTTP — routing, validation Pydantic, dependency injection, logic nghiệp vụ trong router, và serialization response — hoạt động đúng với nhau. Không cần server thực chạy: `httpx.AsyncClient` gọi FastAPI trực tiếp qua `ASGITransport`, nhận response như gọi HTTP thật.

## Kiến trúc mock và dependency override

FastAPI cho phép thay thế bất kỳ dependency nào trong `app.dependency_overrides`. Trong mỗi test, hai dependency được override:

- **`get_session`** (hoặc `get_db` cho blog router) → AsyncMock trả về mock DB session
- **`get_current_user`** → lambda trả về MagicMock user (chỉ với endpoint cần auth)

```python
app.dependency_overrides[get_session] = lambda: _mock_db_session()
app.dependency_overrides[get_current_user] = lambda: mock_user

# Sau mỗi test:
app.dependency_overrides.clear()
```

Mock DB session (AsyncMock) cho phép cấu hình kết quả của từng truy vấn:

```python
db = AsyncMock()
result = MagicMock()
result.scalars.return_value.all.return_value = [portfolio]
db.execute = AsyncMock(return_value=result)
```

## Router 1: Xác thực (`test_auth_router.py`, 8 tests)

Router `/auth` xử lý đăng ký, đăng nhập, đăng xuất, và lấy thông tin người dùng. Hai dịch vụ ngoài được mock thêm: SMTP email service và Redis (blacklist token).

| Test | Endpoint | Method | HTTP expected |
|------|----------|--------|--------------|
| `test_register_success` | `/auth/register` | POST | 200 + user object |
| `test_register_duplicate_email_returns_409` | `/auth/register` | POST | 409 |
| `test_login_success_returns_tokens` | `/auth/login` | POST | 200 + `access_token` |
| `test_login_wrong_password_returns_400` | `/auth/login` | POST | 400 |
| `test_login_banned_user_returns_403` | `/auth/login` | POST | 403 |
| `test_get_me_authenticated` | `/auth/me` | GET | 200 + user data |
| `test_get_me_unauthenticated_returns_401` | `/auth/me` | GET | 401 |
| `test_logout_success` | `/auth/logout` | POST | 200 |

**Điểm kỹ thuật quan trọng:** FastAPI sử dụng `OAuth2PasswordRequestForm` cho endpoint login — yêu cầu dữ liệu gửi dạng `application/x-www-form-urlencoded` (tham số `data=`) thay vì JSON. Sai encoding dẫn đến 422 Unprocessable Entity thay vì test chính xác:

```python
resp = await client.post("/auth/login", data={
    "username": "user@example.com",
    "password": "password123"
})
```

Email service được patch để ngăn gửi SMTP thực trong quá trình test đăng ký:

```python
with patch("src.auth.router.email_service_basic") as mock_email:
    mock_email.send_message = AsyncMock()
    resp = await client.post("/auth/register", json={...})
```

## Router 2: Portfolio (`test_portfolio_router.py`, 6 tests)

Router `/portfolio` quản lý danh mục đầu tư với các thao tác CRUD. Vì router gọi `db.refresh()` sau khi tạo portfolio để điền `id` và timestamp, mock session phải mô phỏng hành vi này qua `side_effect`:

```python
def _set_portfolio_fields(obj):
    obj.id = uuid.uuid4()
    obj.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    obj.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)

db.refresh = AsyncMock(side_effect=_set_portfolio_fields)
```

| Test | Endpoint | Method | HTTP expected |
|------|----------|--------|--------------|
| `test_get_portfolios_returns_list` | `/portfolio` | GET | 200 + list |
| `test_get_portfolios_unauthenticated` | `/portfolio` | GET | 401 |
| `test_create_portfolio` | `/portfolio` | POST | 201 |
| `test_get_portfolio_not_found` | `/portfolio/{id}` | GET | 404 |
| `test_get_portfolio_detail` | `/portfolio/{id}` | GET | 200 + holdings |
| `test_delete_portfolio` | `/portfolio/{id}` | DELETE | 204 |

## Router 3: Watchlist (`test_watchlist_router.py`, 6 tests)

Router `/watchlist` dùng `pg_insert` (PostgreSQL upsert với `ON CONFLICT DO NOTHING`). Hàm helper nội bộ `_latest_two_prices` duyệt qua kết quả truy vấn bằng `__iter__`, do đó mock result cần support iteration:

```python
prices_result = MagicMock()
prices_result.__iter__ = MagicMock(return_value=iter([]))
```

| Test | Endpoint | Method | HTTP expected |
|------|----------|--------|--------------|
| `test_get_watchlist_empty` | `/watchlist` | GET | 200 + `[]` |
| `test_get_watchlist_unauthenticated` | `/watchlist` | GET | 401 |
| `test_get_watchlist_with_items` | `/watchlist` | GET | 200 + list |
| `test_remove_watchlist_item` | `/watchlist/{id}` | DELETE | 204 |
| `test_remove_nonexistent_item_404` | `/watchlist/{id}` | DELETE | 404 |
| `test_reorder_watchlist` | `/watchlist/reorder` | PUT | 200 |

## Router 4: Blog (`test_blog_router.py`, 6 tests)

Router `/blog` có kiến trúc dependency injection riêng: nó dùng `src.blog.deps.get_db` thay vì `src.core.database.get_session`. Nếu override sai dependency, router vẫn gọi DB thật và thất bại:

```python
from src.blog.deps import get_db  # KHÔNG phải src.core.database.get_session

app.dependency_overrides[get_db] = override_db
```

**Điểm kỹ thuật quan trọng:** SQLAlchemy relationship `post.author` yêu cầu đối tượng đã được ORM quản lý. Gán `MagicMock(spec=User)` vào `post.author` dẫn đến `AttributeError: _sa_instance_state`. Giải pháp: tạo hai loại helper:

- `_make_user_model()` → khởi tạo `User(...)` thực (SQLAlchemy instance) — dùng cho relationship assignment
- `_make_user_mock()` → `MagicMock()` — dùng cho dependency override `get_current_user`

| Test | Endpoint | Method | HTTP expected |
|------|----------|--------|--------------|
| `test_list_posts_returns_200` | `/blog/posts` | GET | 200 + list |
| `test_create_post_authenticated_returns_201` | `/blog/posts` | POST | 201 |
| `test_create_post_unauthenticated_returns_401` | `/blog/posts` | POST | 401 |
| `test_get_single_post_returns_200` | `/blog/posts/{id}` | GET | 200 |
| `test_get_nonexistent_post_returns_404` | `/blog/posts/{id}` | GET | 404 |
| `test_add_comment_to_post_returns_201` | `/blog/posts/{id}/comments` | POST | 201 |

## Kết quả chạy

```
test/backend/integration/test_auth_router.py        8 passed
test/backend/integration/test_portfolio_router.py   6 passed
test/backend/integration/test_watchlist_router.py   6 passed
test/backend/integration/test_blog_router.py        6 passed
──────────────────────────────────────────────────────────────
TỔNG CỘNG                                          26 passed
```
