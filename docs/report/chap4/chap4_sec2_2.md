# 4.2.2 Dependency Injection và Quản Lý Phiên DB

## Database session qua Dependency Injection

FastAPI sử dụng cơ chế Dependency Injection (`Depends`) để cung cấp database session cho mỗi request. Session được tạo mới khi request bắt đầu và đóng tự động khi request kết thúc — kể cả khi có exception.

```python
# core/database.py
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session

SessionDep = Annotated[AsyncSession, Depends(get_session)]
```

`SessionDep` là type alias dùng trong tất cả route handler:

```python
# Ví dụ sử dụng trong route
@price_route.get("/tickers")
async def list_tickers(db: SessionDep, ...):
    result = await db.execute(select(Asset)...)
    ...
```

Khi FastAPI resolve `SessionDep`, nó gọi `get_session()`, tạo `AsyncSession` từ pool, inject vào handler. Sau khi handler return (hoặc raise exception), generator tiếp tục đến `async with SessionLocal() as session` — session tự đóng, trả connection về pool.

## Connection pool configuration

```python
# core/database.py
engine = create_async_engine(
    DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,       # 16 connections
    pool_recycle=settings.DATABASE_POOL_TTL,      # 20 phút
    pool_pre_ping=settings.DATABASE_POOL_PRE_PING # True
)
```

`pool_pre_ping=True` kiểm tra connection còn sống trước khi dùng — ngăn lỗi "connection closed" khi PostgreSQL đóng idle connection sau timeout. Với `pool_size=16` và uvicorn chạy 4 worker, mỗi worker có tối đa 4 connection đồng thời — phù hợp với tải thông thường.

## NullPool cho Celery task

Celery worker chạy trong tiến trình riêng, không chia sẻ event loop với FastAPI. `asyncpg` connections được gắn với event loop cụ thể — nếu dùng pool thông thường, connection tạo trong event loop cũ trở nên vô hiệu khi `asyncio.run()` tạo event loop mới cho mỗi task.

Giải pháp: tạo engine thứ hai dùng `NullPool` chỉ cho Celery:

```python
# core/database.py
_task_engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
TaskSessionLocal = async_sessionmaker(
    bind=_task_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
)
```

Với `NullPool`, mỗi `async with TaskSessionLocal() as db:` tạo connection mới và đóng ngay sau khi block kết thúc — không có connection nào được tái sử dụng giữa các task. Chi phí mở/đóng connection tăng nhẹ nhưng hoàn toàn chấp nhận được vì task data pipeline chạy theo phút, không phải mili-giây.

## Quản lý user hiện tại qua Depends

```python
# auth/dependencies.py
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: SessionDep = Depends(get_session),
) -> User:
    payload = decode_token(token)
    # Kiểm tra token bị blacklist (logout) trong Redis
    redis = get_redis()
    if redis and await redis.get(f"blacklist:{token}"):
        raise InvalidToken()
    user = await db.get(User, UUID(payload["sub"]))
    if not user or not user.is_verified:
        raise InvalidToken()
    return user
```

Route nào yêu cầu xác thực chỉ cần thêm `current_user: User = Depends(get_current_user)`. FastAPI tự động chạy dependency chain: validate JWT → check blacklist → load user từ DB. Nếu bất kỳ bước nào thất bại, request bị từ chối trước khi đến logic nghiệp vụ.

`get_admin_user` là dependency kế thừa: gọi `get_current_user` rồi kiểm tra thêm `user.role == "admin"` — dùng cho các endpoint admin-only.

## expire_on_commit=False

SQLAlchemy mặc định "expire" (xóa cache attribute) của tất cả object sau mỗi `commit()`. Khi response serializer cố đọc attribute của object đã expire, nó cần gửi thêm query — nhưng session đã đóng. `expire_on_commit=False` giữ nguyên attribute trong bộ nhớ sau commit, cho phép response schema đọc dữ liệu mà không cần thêm DB roundtrip.
