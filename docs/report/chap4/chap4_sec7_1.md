# 4.7.1 Docker Compose (PostgreSQL, Redis, FastAPI)

## Kiến trúc container

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: marketmind-api
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - backend-network

  db:
    image: timescale/timescaledb:latest-pg15
    container_name: marketmind-db
    env_file:
      - .env
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U marketmind -d marketminddb"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - backend-network

  redis:
    image: redis:7-alpine
    container_name: marketmind-redis
    ports:
      - "6380:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - backend-network
```

## Ba service và vai trò

**`db` — PostgreSQL + TimescaleDB:**
- Image `timescale/timescaledb:latest-pg15` là image chính thức của Timescale Inc., tích hợp sẵn TimescaleDB extension trên PostgreSQL 15
- Port `5433:5432` (host:container) — dùng 5433 trên host để tránh xung đột với PostgreSQL local có thể đang chạy trên 5432
- Volume `postgres_data` persist dữ liệu qua container restart và update
- Healthcheck `pg_isready` đảm bảo API không start trước khi DB sẵn sàng nhận connection

**`redis` — Redis 7 Alpine:**
- Image `redis:7-alpine` — image nhỏ gọn (~30MB) dựa trên Alpine Linux
- Port `6380:6379` — dùng 6380 trên host để tránh xung đột
- Volume `redis_data` persist data cho Celery result backend (kết quả task)
- Healthcheck `redis-cli ping` đơn giản nhưng hiệu quả

**`api` — FastAPI:**
- Build từ `Dockerfile` trong cùng thư mục
- `depends_on` với `condition: service_healthy` đảm bảo cả DB và Redis đều healthy trước khi API container start — không có lỗi "connection refused" khi khởi động
- `env_file: .env` inject toàn bộ biến môi trường vào container

## Health check và startup order

`depends_on` với `condition: service_healthy` là cải tiến quan trọng so với `depends_on` đơn giản. `depends_on` mặc định chỉ chờ container start (process running) — không chờ service sẵn sàng nhận connection. Với healthcheck:

```
redis:  redis-cli ping → PONG     → healthy
db:     pg_isready ...            → healthy
api:    starts only after both healthy
```

PostgreSQL thường cần 3-5 giây để khởi tạo data directory lần đầu — healthcheck với `interval: 5s, retries: 5` cho tối đa 25 giây chờ trước khi đánh dấu service unhealthy.

## Network isolation

Tất cả service trong `backend-network` dùng Docker bridge network. Các service giao tiếp với nhau qua **service name** thay vì IP:
- `DATABASE_URL = postgresql+asyncpg://...@db:5432/...` (hostname là `db`)
- `REDIS_URL = redis://redis:6379/0` (hostname là `redis`)

Service name làm hostname cho phép thay đổi IP nội bộ mà không cần cập nhật config. Bên ngoài Docker network không thể truy cập DB hay Redis trực tiếp (chỉ qua port mapping được khai báo).

## Dev vs Production

`docker-compose.dev.yml` (extends base file) bổ sung:
- Volume mount source code: `./src:/app/src` — hot reload khi thay đổi code
- `--reload` flag cho uvicorn
- Bật `PYTHONDONTWRITEBYTECODE` và `PYTHONUNBUFFERED`

`docker-compose.prod.yml` dùng image build tĩnh, không mount source, chạy uvicorn với `--workers 4` cho production throughput.
