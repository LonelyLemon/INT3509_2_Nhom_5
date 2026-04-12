# Backend — Local Development Setup

This guide walks a new developer through running the MarketMind backend on a local machine using Docker. No manual PostgreSQL, Redis, or Python environment setup is required.

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| [Docker Engine](https://docs.docker.com/engine/install/) | 24.x | Enable BuildKit (default since 23.x) |
| [Docker Compose plugin](https://docs.docker.com/compose/install/) | 2.20 | Ships with Docker Desktop; on Linux install separately |
| Git | any | — |

Verify your setup:

```bash
docker version          # Engine + Client
docker compose version  # Plugin ≥ 2.20
```

> **Windows / macOS** — Docker Desktop covers all of the above. Make sure it is running before continuing.

---

## Repository layout

```
INT3509_2_Nhom_5/
├── Makefile                    ← shortcut commands (run from repo root)
└── backend/
    ├── Dockerfile              ← multi-stage: base → dev / production
    ├── docker-compose.dev.yml  ← dev stack (hot-reload, ports exposed)
    ├── docker-compose.prod.yml ← production stack
    ├── .env.dev                ← dev environment variables (safe defaults)
    ├── .env.example            ← template — copy to .env for production
    ├── scripts/
    │   └── entrypoint.sh       ← waits for DB, runs migrations, then starts app
    ├── alembic/                ← database migrations
    └── src/                    ← application source code
```

---

## First-time setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd INT3509_2_Nhom_5
```

### 2. Review environment variables

The file `backend/.env.dev` contains ready-to-use defaults for local development. Open it and fill in any secrets that are left empty (e.g. `OPENAI_API_KEY`):

```bash
# Key variables in backend/.env.dev
POSTGRES_USER=marketmind
POSTGRES_PASSWORD=123
POSTGRES_DB=marketminddb
SQLALCHEMY_DATABASE_URL=postgresql+asyncpg://marketmind:123@db:5432/marketminddb
REDIS_URL=redis://redis:6379/0
OPENAI_API_KEY=        # ← fill in if you need AI features
```

> You do **not** need to change anything else to get the API running locally.

### 3. Start the dev stack

From the **repo root**:

```bash
make dev
```

This is equivalent to:

```bash
cd backend && docker compose -f docker-compose.dev.yml up
```

On the **first run** Docker will:
1. Pull base images (`python:3.13-slim`, `timescale/timescaledb:latest-pg15`, `redis:7.2-alpine`)
2. Build the `dev` image (installs all Python dependencies via `uv`)
3. Start 5 containers: `api`, `celery-worker`, `celery-beat`, `db`, `redis`
4. Run all Alembic database migrations automatically inside the `api` container

The API is ready when you see:

```
marketmind-api  | [entrypoint] Migrations complete.
marketmind-api  | INFO:     Application startup complete.
```

### 4. Verify it works

```bash
curl http://localhost:8000/health
# → {"status":"ok","version":"1.0"}
```

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Exposed ports

| Port (host) | Service | Description |
|---|---|---|
| `8000` | API | FastAPI / Swagger UI |
| `5433` | PostgreSQL | Connect with `psql` or any DB client |
| `6380` | Redis | Connect with `redis-cli` |

> These ports differ from the defaults (5432 / 6379) to avoid conflicts with any locally installed services.

---

## Daily workflow

All commands are run from the **repo root** unless noted.

### Start / stop

```bash
make dev          # start (builds only if image is missing)
make dev-build    # force-rebuild images, then start
make down         # stop containers, remove networks
make down-v       # ⚠ stop + delete all volumes (wipes the database)
```

> **Important — always use `make down` or the explicit compose command.**  
> Running `docker compose down` directly without `-f docker-compose.dev.yml` will not find the correct project and will leave containers running, blocking network removal.

### Logs

```bash
make logs         # tail all containers
make logs-api     # tail API container only
make ps           # show container status
```

### Database

```bash
make migrate                       # apply pending migrations
make migration m="your message"    # generate a new migration from model changes
make db-shell                      # open psql inside the db container
```

### Utilities

```bash
make shell   # bash shell inside the api container
make test    # run pytest inside the api container
```

---

## Hot reload

The `./backend/src` directory is mounted as a Docker volume. Uvicorn runs with `--reload`, so **any change to a Python file is picked up immediately** without restarting the container.

Changes to `alembic/` migrations are also mounted, but you need to run `make migrate` after adding a new migration file.

---

## Stopping cleanly

```bash
# Stop all containers and remove networks (keeps database data)
make down

# Stop and also wipe all volumes (fresh database on next start)
make down-v
```

If you ever see `Resource is still in use` when removing a network, it means one or more containers from the dev stack are still running. Always use `make down` (or `docker compose -f backend/docker-compose.dev.yml down`) rather than bare `docker compose down`, which defaults to looking for a `docker-compose.yml` and will miss the dev containers.

---

## Architecture overview

```
                ┌─────────────────────────────┐
  Browser/curl  │         FastAPI (8000)       │
                │    src/main.py               │
                └────────────┬────────────────-┘
                             │ async SQLAlchemy
              ┌──────────────┼──────────────────┐
              │              │                  │
     ┌────────▼──────┐  ┌────▼─────┐  ┌────────▼───────┐
     │  PostgreSQL   │  │  Redis   │  │  Celery worker  │
     │  TimescaleDB  │  │ (broker) │  │  + beat         │
     │  (port 5433)  │  │ (6380)   │  │                 │
     └───────────────┘  └──────────┘  └─────────────────┘
```

- **PostgreSQL + TimescaleDB** — primary data store; `price_data` is a TimescaleDB hypertable partitioned by `timestamp`.
- **Redis** — Celery message broker and result backend.
- **Celery worker** — processes background jobs (data fetching, etc.).
- **Celery beat** — periodic task scheduler (triggers workers on a schedule).

---

## Troubleshooting

### Port already in use

```
Error: bind: address already in use (0.0.0.0:5433)
```

Another process is using that port. Find and stop it, or change the host port in `docker-compose.dev.yml`.

### PostgreSQL authentication failed

The database volume was initialised with different credentials. Wipe it and restart:

```bash
make down-v
make dev
```

### Migrations fail on startup

Check the API logs for the specific Alembic error:

```bash
make logs-api
```

You can re-run migrations manually after the containers are up:

```bash
make migrate
```

### Container keeps restarting

```bash
make logs-api   # read the error
```

Most common causes: missing environment variable, DB not healthy yet (will self-resolve after retries), or a syntax error introduced in source code.
