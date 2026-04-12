#!/usr/bin/env bash
# =============================================================
# Container entrypoint for MarketMind backend
#
# Responsibilities:
#   1. Wait for PostgreSQL to accept connections
#   2. Run Alembic migrations (only when starting the API server)
#   3. Exec the command passed to the container (uvicorn / celery)
# =============================================================
set -euo pipefail

# ---------- helpers ------------------------------------------
log()  { echo "[entrypoint] $*"; }
fail() { echo "[entrypoint] ERROR: $*" >&2; exit 1; }

# ---------- 1. wait for PostgreSQL ---------------------------
wait_for_postgres() {
    local host="${POSTGRES_HOST:-db}"
    local port="${POSTGRES_PORT:-5432}"
    local user="${POSTGRES_USER:-marketmind}"
    local db="${POSTGRES_DB:-marketminddb}"
    local retries=30
    local wait=2

    log "Waiting for PostgreSQL at ${host}:${port} ..."
    until pg_isready -h "$host" -p "$port" -U "$user" -d "$db" -q 2>/dev/null; do
        retries=$(( retries - 1 ))
        if [ "$retries" -le 0 ]; then
            fail "PostgreSQL is still unavailable after waiting. Aborting."
        fi
        log "  not ready yet — retrying in ${wait}s (${retries} attempts left)"
        sleep "$wait"
    done
    log "PostgreSQL is ready."
}

# ---------- 2. run migrations --------------------------------
run_migrations() {
    log "Running Alembic migrations..."
    alembic upgrade head
    log "Migrations complete."
}

# ---------- main ---------------------------------------------
# Detect if we are starting the API (uvicorn).
# Celery worker / beat containers share the same image but must NOT
# run migrations — that would cause a race condition at scale.
FIRST_ARG="${1:-}"

if [[ "$FIRST_ARG" == "uvicorn" ]]; then
    wait_for_postgres
    run_migrations
elif [[ "$FIRST_ARG" == "celery" ]]; then
    # Workers still need the DB to be up before connecting
    wait_for_postgres
fi

log "Starting: $*"
exec "$@"
