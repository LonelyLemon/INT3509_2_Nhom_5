# 3.1.2 Sơ Đồ Triển Khai Tổng Quan

## Sơ đồ kiến trúc triển khai

Toàn bộ hệ thống backend được triển khai dưới dạng các Docker container, giao tiếp qua một Docker bridge network nội bộ (`backend-network`). Giao diện React SPA được phục vụ độc lập (static hosting hoặc container Nginx riêng). Luồng request từ trình duyệt đi qua API container duy nhất lộ ra ngoài — các container còn lại (DB, Redis) không có port map ra host trong production.

```mermaid
graph TD
    subgraph BROWSER["Trình duyệt người dùng"]
        SPA["React 19 SPA\n(Vite build — static files)"]
    end

    subgraph DOCKER["Docker bridge network: backend-network"]
        API["marketmind-api\nFastAPI · uvicorn · 4 workers\nPort 8000 ← lộ ra ngoài"]
        BEAT["marketmind-celery-beat\nCelery Beat · Scheduler"]
        WORKER["marketmind-celery-worker\nCelery Worker · concurrency=4"]
        DB["marketmind-db\ntimescaledb:latest-pg15\nPort 5432 (internal only)"]
        REDIS["marketmind-redis\nredis:7.2-alpine\nPort 6379 (internal only)"]
    end

    subgraph EXTERNAL["Dịch vụ ngoài"]
        YFINANCE["Yahoo Finance API\n(yfinance)"]
        GEMINI["Google Gemini API\n(gemini-2.0-flash)"]
        MASSIVE["Massive API\n(tin tức tài chính)"]
        SMTP["SMTP Email Server\n(xác minh, đặt lại mật khẩu)"]
    end

    SPA -- "REST HTTP/JSON\nSSE text/event-stream" --> API

    API -- "asyncpg\nSQLAlchemy async" --> DB
    API -- "aioredis\n(cache, blacklist, OTP, rate limit)" --> REDIS
    API -- "Pydantic-AI SDK\n(streaming)" --> GEMINI
    API -- "fastapi-mail\nSMTP" --> SMTP

    BEAT -- "enqueue task" --> REDIS
    REDIS -- "dequeue task" --> WORKER
    WORKER -- "NullPool\nasyncpg" --> DB
    WORKER -- "yfinance" --> YFINANCE
    WORKER -- "Massive SDK" --> MASSIVE

    DB -. "healthcheck: pg_isready" .-> API
    REDIS -. "healthcheck: redis-cli ping" .-> API
```

---

## Cấu hình container và phụ thuộc

Docker Compose định nghĩa health check cho cả PostgreSQL (`pg_isready`) và Redis (`redis-cli ping`). Container `api`, `celery-worker`, và `celery-beat` chỉ khởi động khi cả hai dependency này báo healthy — tránh lỗi kết nối khi DB hoặc Redis chưa sẵn sàng nhận kết nối.

| Container | Image / Build | Port | Vai trò |
|-----------|--------------|------|---------|
| `marketmind-api` | Multi-stage Dockerfile (production stage) | 8000 → host | FastAPI + uvicorn |
| `marketmind-celery-worker` | Cùng image với api | — | Xử lý task nền |
| `marketmind-celery-beat` | Cùng image với api | — | Lập lịch task |
| `marketmind-db` | `timescale/timescaledb:latest-pg15` | 5432 (internal) | Lưu trữ dữ liệu chính |
| `marketmind-redis` | `redis:7.2-alpine` | 6379 (internal) | Cache + broker + shared state |

Trong production, port của DB và Redis không được map ra host machine — chỉ các container trong cùng `backend-network` mới liên lạc được với nhau qua hostname nội bộ. Đây là biện pháp cô lập mạng cơ bản để tránh DB bị tiếp cận trực tiếp từ bên ngoài.

---

## Chiến lược Dockerfile (multi-stage build)

Dockerfile sử dụng ba stage độc lập để tối ưu kích thước image và tốc độ build:

```
Stage 1: base
  └── python:3.13-slim
  └── Cài uv (Astral package manager)
  └── uv sync --frozen (cài đúng phiên bản theo uv.lock)

Stage 2: dev  (kế thừa base)
  └── Mount source code qua volume
  └── uvicorn --reload  (hot-reload khi code thay đổi)

Stage 3: production  (kế thừa base)
  └── UV_COMPILE_BYTECODE=1  (biên dịch .pyc trước → khởi động nhanh hơn)
  └── Non-root user (appuser:appgroup, UID/GID 1001)
  └── uvicorn --workers 4  (4 process song song)
```

Multi-stage build đảm bảo image production không chứa tool dev (uv cache, build tools) và chạy với user không có quyền root — tuân thủ nguyên tắc least privilege.

---

## Luồng khởi động hệ thống

Khi container `api` khởi động, script `entrypoint.sh` thực hiện tuần tự ba bước trước khi chạy uvicorn:

```mermaid
flowchart TD
    A["Container api khởi động"] --> B["entrypoint.sh"]
    B --> C["Chờ PostgreSQL healthy\n(pg_isready)"]
    C --> D["alembic upgrade head\n(áp dụng migration pending)"]
    D --> E["Seed dữ liệu khởi tạo\n(admin account + 18 tickers nếu chưa có)"]
    E --> F["uvicorn src.main:app\n--workers 4 --host 0.0.0.0 --port 8000"]
```

Ba bước đầu được thiết kế **idempotent** — chạy nhiều lần không tạo dữ liệu trùng lặp hay gây lỗi. Điều này an toàn khi container bị restart bất ngờ.

---

## Hai môi trường triển khai

| Tiêu chí | Development (`docker-compose.dev.yml`) | Production (`docker-compose.prod.yml`) |
|---------|----------------------------------------|----------------------------------------|
| Source code | Mount volume `./src` → `/app/src` | Copy vào image khi build |
| Hot-reload | `uvicorn --reload` | `uvicorn --workers 4` |
| DB port | 5433 → host (để kết nối qua DataGrip) | Internal only |
| Redis port | 6380 → host (để debug) | Internal only |
| Bytecode | Không | `UV_COMPILE_BYTECODE=1` |
| User | root (tiện dev) | Non-root appuser |
| Resource limits | Không giới hạn | CPU/RAM limits per container |
| Restart policy | Không | `restart: always` |
