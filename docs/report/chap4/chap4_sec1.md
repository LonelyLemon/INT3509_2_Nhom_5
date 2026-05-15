# 4.1 Môi Trường và Công Cụ Phát Triển

## Ngôn ngữ lập trình và runtime

| Thành phần | Phiên bản | Vai trò |
|-----------|-----------|---------|
| Python | 3.13 | Backend, Celery worker, data pipeline |
| Node.js | 22 LTS | Frontend build toolchain (Vite) |
| TypeScript | 5.9 | Ngôn ngữ chính cho toàn bộ frontend |

Python 3.13 được chọn để tận dụng các cải tiến hiệu năng của CPython và hỗ trợ `asyncio` trưởng thành — quan trọng khi toàn bộ backend chạy bất đồng bộ qua `asyncpg` và `pydantic-ai` streaming. TypeScript 5.9 bắt buộc trên frontend để enforce kiểu dữ liệu tài chính phức tạp (OHLCV, portfolio holdings, chat messages) tại compile time.

## Quản lý dependency

Backend sử dụng **uv** thay vì `pip` truyền thống. uv giải quyết dependency nhanh hơn đáng kể nhờ resolver viết bằng Rust và lock file (`uv.lock`) đảm bảo môi trường tái lặp hoàn toàn giữa các developer và CI. Toàn bộ dependency được khai báo trong `pyproject.toml` theo chuẩn PEP 517.

Frontend sử dụng **npm** với `package-lock.json` để pin phiên bản chính xác.

## Framework và thư viện chính

**Backend:**

| Thư viện | Phiên bản | Mục đích |
|---------|-----------|----------|
| FastAPI | 0.115 | Web framework — async, tự động tạo OpenAPI docs |
| SQLAlchemy | 2.0 | ORM async — typed queries, session management |
| asyncpg | 0.30 | PostgreSQL driver bất đồng bộ (dưới SQLAlchemy) |
| Pydantic-AI | 0.0.x | Framework multi-agent — tích hợp Google Gemini |
| Celery | 5.4 | Task queue và scheduler cho data pipeline |
| redis-py | 5.x | Async Redis client — cache, broker, shared state |
| Alembic | 1.14 | Database migration |
| uvicorn | 0.32 | ASGI server — chạy FastAPI |
| loguru | 0.7 | Structured logging |

**Frontend:**

| Thư viện | Phiên bản | Mục đích |
|---------|-----------|----------|
| React | 19 | UI framework |
| Vite | 7 | Build tool, dev server |
| Tailwind CSS | 4 | Utility-first styling |
| Zustand | 5 | Global state management |
| lightweight-charts | 5 (TradingView) | Biểu đồ nến tài chính |
| recharts | 3 | Biểu đồ thống kê (portfolio, admin) |
| i18next / react-i18next | latest | Đa ngôn ngữ |
| axios | 1.x | HTTP client — gọi REST API |

## IDE và công cụ hỗ trợ

Cả hai thành viên nhóm phát triển sử dụng **Visual Studio Code** với các extension:
- **Pylance** — Python type checking, IntelliSense
- **Ruff** — linting và format Python (thay thế flake8 + black)
- **ESLint** — JavaScript/TypeScript linting (config nằm trong `eslint.config.js`)
- **Prettier** — format frontend code
- **Docker** — quản lý container ngay trong IDE

**Git workflow:** Repository lưu trên GitHub, làm việc theo feature branch. Pull request yêu cầu review trước khi merge vào `main`.

## Môi trường chạy và đóng gói

Toàn bộ infrastructure được định nghĩa dưới dạng **Docker Compose**. Mỗi dịch vụ chạy trong container riêng biệt với network `backend-network` nội bộ:

```
marketmind-api    (FastAPI / uvicorn)
marketmind-db     (PostgreSQL 15 + TimescaleDB)
marketmind-redis  (Redis 7-alpine)
```

Dev environment có file `docker-compose.dev.yml` bổ sung volume mount source code để hot-reload. Production dùng `docker-compose.prod.yml` với image được build tĩnh, không mount source.

Biến môi trường nhạy cảm (database password, API keys, JWT secret) được quản lý qua file `.env` không được commit vào repository. File `.env.example` cung cấp template với tất cả key cần thiết và giá trị placeholder.
