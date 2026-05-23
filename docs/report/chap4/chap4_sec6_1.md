# 4.6.1 Bài Toán Async Database Trong Celery Task (NullPool)

## Vấn đề

Celery Worker mặc định chạy theo mô hình **prefork** — mỗi task được thực thi trong tiến trình riêng (subprocess). Khi task cần dùng async code (async SQLAlchemy, asyncpg), phải gọi `asyncio.run()` để tạo event loop mới:

```python
@celery_app.task(name="src.price.tasks.ingest_1m_price_data")
def ingest_1m_price_data():
    asyncio.run(_ingest_1m_price_data())
```

`asyncio.run()` tạo **event loop mới** cho mỗi lần gọi. Đây là nguồn gốc của vấn đề.

## Tại sao pooled connections thất bại

`asyncpg` connection được bind với event loop cụ thể tại thời điểm tạo. SQLAlchemy async connection pool (mặc định `AsyncAdaptedQueuePool`) giữ các connection đã tạo trong memory để tái sử dụng.

**Kịch bản lỗi:**
1. Task lần 1: `asyncio.run()` tạo loop A, `_task_engine` tạo connection trên loop A, pool giữ lại
2. Task lần 2: `asyncio.run()` tạo loop B (mới), task cố dùng connection từ pool — connection đó thuộc loop A
3. asyncpg raise lỗi: connection thuộc event loop khác

Lỗi điển hình: `RuntimeError: Task <Task...> got Future attached to a different loop` hoặc `asyncpg.exceptions._base.InterfaceError: connection is closed`.

## Giải pháp: NullPool cho task engine

```python
# core/database.py

# Engine cho FastAPI — dùng connection pool (hiệu quả cho nhiều concurrent requests)
engine = create_async_engine(
    DATABASE_URL,
    pool_size=16,
    pool_recycle=1200,
    pool_pre_ping=True,
)

# Engine riêng cho Celery task — NullPool: không giữ connection
_task_engine = create_async_engine(DATABASE_URL, poolclass=NullPool)

TaskSessionLocal = async_sessionmaker(
    bind=_task_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
)
```

`NullPool` là pool "giả" — mỗi `connect()` tạo connection thực mới, mỗi `close()` đóng luôn thay vì trả về pool. Không có connection nào tồn tại qua boundary của `asyncio.run()`. 

**Kịch bản với NullPool:**
1. Task chạy: `asyncio.run()` tạo loop A, `async with TaskSessionLocal() as db` mở connection mới trên loop A
2. Task kết thúc: `async with` đóng session → NullPool đóng connection vật lý
3. Task tiếp theo: `asyncio.run()` tạo loop B, mở connection mới trên loop B — hoạt động bình thường

## Chi phí và lý do chấp nhận được

NullPool tăng overhead mỗi task vì phải thực hiện TCP handshake với PostgreSQL khi bắt đầu và FIN/ACK khi kết thúc. Với FastAPI (nhiều request/giây), chi phí này không chấp nhận được — cần pool để amortize.

Nhưng Celery Beat task price chỉ chạy **1 lần/phút** (không phải 1000 lần/giây). Overhead kết nối ~5ms không đáng kể so với thời gian tổng task ~2-10 giây (HTTP call yfinance + bulk insert). NullPool là trade-off hoàn toàn hợp lý trong trường hợp này.

## Tóm tắt so sánh hai engine

| | FastAPI engine | Celery TaskSessionLocal |
|--|---------------|------------------------|
| Pool type | `AsyncAdaptedQueuePool` | `NullPool` |
| pool_size | 16 | N/A (NullPool) |
| Connection lifecycle | Giữ và tái sử dụng | Tạo mới / đóng mỗi task |
| Event loop | Một loop duy nhất (uvicorn) | Mỗi task có loop riêng |
| Phù hợp cho | High-concurrency HTTP | Batch tasks, scheduled jobs |
