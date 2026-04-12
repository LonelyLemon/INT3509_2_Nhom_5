# ============================================================
# Multi-stage Dockerfile for MarketMind Backend
#   Targets:
#     - base        : shared Python + uv + dependencies layer
#     - dev         : hot-reload, all packages, code mounted as volume
#     - production  : non-root user, bytecode-compiled, multi-worker
# ============================================================

# ---- STAGE 1: base ----
FROM python:3.13-slim AS base

# Pin uv to a specific version for reproducible builds
COPY --from=ghcr.io/astral-sh/uv:0.7.2 /uv /uvx /bin/

# Disable .pyc files and force unbuffered stdout/stderr
# Add .venv/bin to PATH so uvicorn, alembic, celery, etc. are found without
# explicit activation — uv sync installs into .venv by default.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Install postgresql-client for pg_isready (used by entrypoint.sh)
# and clean apt cache to keep the layer small.
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client \
 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies using the lock file.
# Using bind-mount keeps pyproject.toml / uv.lock out of the image layer,
# while --mount=type=cache keeps the uv download cache across rebuilds.
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project


# ---- STAGE 2: dev ----
FROM base AS dev

# Copy startup script into the image so it is available even when
# the source directory is overridden by a bind-mount volume.
COPY scripts/ scripts/
RUN chmod +x scripts/entrypoint.sh

# Copy application source (overridable by volume in docker-compose.dev.yml)
COPY src/      src/
COPY alembic/  alembic/
COPY alembic.ini ./

EXPOSE 8000

ENTRYPOINT ["scripts/entrypoint.sh"]
# --reload watches the mounted ./src volume for changes
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# ---- STAGE 3: production ----
FROM base AS production

# Compile Python bytecode at image-build time for faster container start-up
ENV UV_COMPILE_BYTECODE=1

# Create a non-root user (security best practice)
RUN addgroup --system --gid 1001 appgroup \
 && adduser  --system --uid 1001 --ingroup appgroup --no-create-home appuser

COPY scripts/ scripts/
COPY src/      src/
COPY alembic/  alembic/
COPY alembic.ini ./

RUN chmod +x scripts/entrypoint.sh \
 && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

ENTRYPOINT ["scripts/entrypoint.sh"]
# 4 workers — tune via WEB_CONCURRENCY env var if needed
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
