# 3.2.3 Cơ Sở Hạ Tầng: PostgreSQL, TimescaleDB, Redis, Celery, Docker

## PostgreSQL 15 + TimescaleDB

PostgreSQL là RDBMS được chọn vì sự kết hợp hiếm có: hỗ trợ SQL đầy đủ (transaction, foreign key, constraint), extension ecosystem phong phú, và có thể mở rộng lên quy mô lớn mà không cần đổi hệ thống. Phiên bản 15 được chọn vì tương thích với TimescaleDB image chính thức (`timescale/timescaledb:latest-pg15`).

**TimescaleDB** là extension PostgreSQL dành riêng cho dữ liệu chuỗi thời gian — được chọn vì bảng `price_data` là trung tâm của ứng dụng và có đặc thù rõ ràng:

| Đặc thù | Vấn đề nếu dùng PostgreSQL thường | Giải pháp TimescaleDB |
|---------|----------------------------------|----------------------|
| Hàng chục triệu bản ghi OHLCV | B-tree index kém hiệu quả khi WHERE trên timestamp | Hypertable tự động phân mảnh theo thời gian (chunks) — query chỉ scan chunk liên quan |
| Xóa dữ liệu cũ định kỳ | `DELETE WHERE timestamp < X` lock bảng lớn | Drop chunk theo thời gian — O(1) thay vì O(n) |
| Tổng hợp 4h/1d từ dữ liệu 1h | Phải lưu bảng riêng hoặc view nặng | `time_bucket()` tổng hợp on-the-fly trong câu truy vấn |

TimescaleDB là extension thuần PostgreSQL — toàn bộ SQL chuẩn, SQLAlchemy ORM, Alembic migration đều hoạt động bình thường, không cần học thêm query language mới.

## Redis 7

Redis được chọn làm thành phần dùng chung vì một instance Redis đủ đảm nhận ba vai trò hoàn toàn khác nhau trong cùng hệ thống:

**Vai trò 1 — Cache dữ liệu giá:**
Giá cổ phiếu và dữ liệu OHLCV được cache theo key `price:{ticker}:{timeframe}` với TTL tương ứng. Khi nhiều người dùng xem cùng một ticker trong khoảng thời gian ngắn, chỉ có request đầu tiên truy vấn TimescaleDB; các request sau phục vụ từ Redis — giảm đáng kể tải lên DB.

**Vai trò 2 — Message broker cho Celery:**
Redis làm broker thay vì RabbitMQ vì Redis đã có sẵn trong stack — giảm một thành phần infrastructure. Celery Beat đẩy task serialized vào Redis list; Celery Worker BLPOP (blocking pop) chờ task mới — hiệu quả hơn polling.

**Vai trò 3 — Shared state giữa các API instance:**
Đây là vai trò quan trọng nhất cho scalability. Khi nhiều uvicorn worker chạy song song, các đối tượng state sau phải được chia sẻ giữa tất cả worker:

| Đối tượng state | Cấu trúc Redis | TTL |
|----------------|---------------|-----|
| Token blacklist (logout) | String (key = jti) | Bằng thời gian còn lại của token |
| OTP đặt lại mật khẩu | String (key = email) | 10 phút |
| Rate limit counter (AI) | String (key = user_id) với INCR | 60 giây |

## Alembic

Alembic quản lý toàn bộ lịch sử thay đổi schema dưới dạng migration script có phiên bản (version-controlled). Quy trình thay đổi schema: sửa SQLAlchemy model → `alembic revision --autogenerate` sinh diff → review script → commit vào git → `alembic upgrade head` deploy.

Alembic được chọn thay vì cách quản lý schema thủ công vì:
- Mỗi thay đổi được lưu trong file riêng, có thể review qua PR
- Rollback về phiên bản trước bằng `alembic downgrade -1`
- Script `alembic upgrade head` chạy tự động khi container khởi động — schema luôn đồng bộ với code

## Docker + Docker Compose

Docker hóa toàn bộ stack đảm bảo tính tái lập được (reproducibility) — môi trường dev, staging, và production chạy cùng image, cùng phiên bản dependency. Không có vấn đề "works on my machine".

Docker Compose được chọn thay vì Kubernetes vì quy mô hiện tại (một máy chủ, dưới 10 container) không đòi hỏi orchestration phức tạp của K8s. Khi cần scale lên, kiến trúc stateless của FastAPI và Celery cho phép chuyển sang K8s mà không thay đổi code.

Hai file Compose tách biệt dev/prod đảm bảo: dev có hot-reload và port DB/Redis lộ ra host cho debugging, trong khi prod có resource limits, restart policy, và không lộ port nhạy cảm.

## uv (Astral Package Manager)

`uv` thay thế pip + virtualenv để quản lý dependency Python. Được viết bằng Rust, uv resolve và cài đặt dependency nhanh hơn pip 10–100 lần. Quan trọng hơn, `uv.lock` là lock file chính xác đến từng phiên bản transitive dependency — đảm bảo môi trường hoàn toàn giống nhau giữa dev machine và production container.

Trong Dockerfile, lệnh `uv sync --frozen` cài đúng theo lock file, từ chối build nếu lock file không khớp với `pyproject.toml` — loại bỏ hoàn toàn khả năng version drift giữa các lần build.

---

## Tổng hợp stack công nghệ

| Tầng | Công nghệ | Phiên bản | Vai trò chính |
|-----|----------|----------|--------------|
| Frontend | React + TypeScript | 19.2 / 5.9 | UI SPA |
| Build tool | Vite | 7 | Dev server + production build |
| UI styling | Tailwind CSS | 4 | Utility-first CSS |
| State management | Zustand | 5 | Global state |
| Chart (tài chính) | lightweight-charts | 5 | Candlestick, đường giá |
| Chart (thống kê) | Recharts | 3 | Portfolio, admin charts |
| i18n | i18next | 25 | VI / EN |
| API framework | FastAPI + uvicorn | 0.135 / 0.41 | REST + SSE endpoint |
| Language | Python | 3.13 | Backend + AI |
| ORM | SQLAlchemy async | 2.0 | DB access |
| DB driver | asyncpg | 0.31 | PostgreSQL async |
| AI framework | Pydantic-AI | 1.88 | Multi-agent orchestration |
| LLM | Google Gemini | 2.0-flash | Text generation |
| Task queue | Celery + Beat | 5.6 | Background tasks |
| Primary DB | PostgreSQL + TimescaleDB | 15 | Structured + time-series data |
| Cache / Broker / State | Redis | 7 | Cache, Celery broker, shared state |
| Schema migration | Alembic | 1.18 | DB schema versioning |
| Container | Docker + Compose | — | Deployment |
| Package manager | uv | 0.7 | Python dependency management |
