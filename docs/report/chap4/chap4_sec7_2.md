# 4.7.2 Quản Lý Migration Với Alembic

## Tổng quan Alembic trong dự án

Alembic là migration tool chính thức của SQLAlchemy — quản lý schema database theo phương pháp version control. Mỗi thay đổi schema (thêm bảng, thêm cột, tạo index) được lưu thành một migration file có revision ID duy nhất.

```
backend/
├── alembic.ini          ← Cấu hình chính
└── alembic/
    ├── env.py           ← Runtime config, database URL, metadata
    ├── script.py.mako   ← Template cho migration file mới
    └── versions/        ← Migration files (chronological)
        ├── 082caa79d00b_initial_migration.py
        ├── 9fab416bdb1b_make_price_data_hypertable.py
        ├── a1b2c3d4e5f6_optimize_timescaledb_and_news_index.py
        └── ...
```

## Cấu hình env.py

```python
# alembic/env.py
from src.core.config import settings
from src.models import *  # Import tất cả models để autogenerate biết về chúng

# Override database URL từ .env
config.set_main_option("sqlalchemy.url", str(settings.ASYNC_DATABASE_URI))

target_metadata = Base.metadata
```

Alembic đọc `Base.metadata` để biết schema hiện tại của models, so sánh với schema trong DB, và generate migration tự động (`--autogenerate`). Import `src.models` đảm bảo tất cả model được register trước khi autogenerate chạy.

## Lịch sử migration quan trọng

**`082caa79d00b_initial_migration.py`** — Migration đầu tiên:
- Tạo tất cả bảng cơ bản: `users`, `assets`, `price_data`, `portfolios`, `watchlists`, `blog_posts`, `conversations`, v.v.
- Thiết lập foreign key constraints, unique indexes

**`9fab416bdb1b_make_price_data_hypertable.py`** — TimescaleDB hypertable:
```python
def upgrade():
    op.execute("""
        SELECT create_hypertable(
            'price_data', 'timestamp',
            chunk_time_interval => INTERVAL '7 days',
            if_not_exists => TRUE
        );
    """)
```
Migration này gọi function TimescaleDB để chuyển `price_data` thành hypertable — không thể express bằng SQLAlchemy ORM thông thường nên dùng raw SQL qua `op.execute()`.

**`a1b2c3d4e5f6_optimize_timescaledb_and_news_index.py`** — Index tối ưu:
- Tạo partial indexes, composite indexes cho query price history
- Thêm index trên `news_articles.ticker` và `published_at`

## Workflow phát triển

```bash
# Tạo migration mới từ thay đổi models (autogenerate)
alembic revision --autogenerate -m "add_display_name_to_users"

# Kiểm tra migration được generate
# Chỉnh sửa nếu cần (autogenerate không phát hiện được: TimescaleDB ops, partial indexes)

# Apply migration lên DB
alembic upgrade head

# Kiểm tra version hiện tại
alembic current

# Rollback 1 bước
alembic downgrade -1
```

## Chạy migration khi deploy

Migration không chạy tự động khi container khởi động — phải chạy thủ công hoặc qua entrypoint script:

```bash
# scripts/entrypoint.sh
alembic upgrade head
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

`alembic upgrade head` idempotent — không làm gì nếu DB đã ở phiên bản mới nhất. Chạy trong entrypoint đảm bảo migration được apply trước khi FastAPI start nhận traffic.

## Lý do không dùng SQLAlchemy `create_all()`

`Base.metadata.create_all()` tạo bảng nếu chưa có nhưng không xử lý schema evolution (thêm cột mới, xóa cột, đổi kiểu dữ liệu). Trong production, schema thay đổi phải kiểm soát được, có thể rollback, và không mất dữ liệu. Alembic cung cấp tất cả điều này với `upgrade`/`downgrade` functions rõ ràng.
