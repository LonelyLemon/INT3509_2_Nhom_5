# Price Data Feature — Instruction

## Overview

The price feature continuously ingests OHLCV (open/high/low/close/volume) candle data for all active assets and stores them in a **TimescaleDB hypertable** optimised for time-series queries.

---

## Architecture

```
Celery Beat (every 1 min)
    └─► ingest_1m_price_data (Celery task)
            ├─ Query active assets from DB
            ├─ Split into batches of 50 tickers
            └─ For each batch:
                    ├─ yf.download() in asyncio.to_thread  (non-blocking)
                    ├─ Build OHLCV records
                    └─ Bulk UPSERT → price_data hypertable
```

---

## Database Design

### Table: `price_data` (TimescaleDB hypertable)

| Column      | Type                     | Notes                          |
|-------------|--------------------------|--------------------------------|
| id          | UUID (PK)                | auto-generated                 |
| asset_id    | UUID (FK → assets.id)    | CASCADE delete                 |
| timestamp   | TIMESTAMPTZ              | hypertable partition key       |
| timeframe   | VARCHAR(10)              | e.g. `"1m"`                    |
| open        | FLOAT                    |                                |
| high        | FLOAT                    |                                |
| low         | FLOAT                    |                                |
| close       | FLOAT                    |                                |
| adj_close   | FLOAT (nullable)         |                                |
| volume      | FLOAT                    |                                |

**Constraints & indexes:**

| Name                       | Type                   | Columns                          |
|----------------------------|------------------------|----------------------------------|
| `uq_asset_time_frame`      | UNIQUE                 | (asset_id, timestamp, timeframe) |
| `ix_price_data_asset_time` | BTREE INDEX            | (asset_id, timestamp)            |
| TimescaleDB hypertable     | partition by time      | timestamp, 1-day chunks          |

### Table: `assets`

| Column     | Type         | Notes                              |
|------------|--------------|------------------------------------|
| id         | UUID (PK)    |                                    |
| ticker     | VARCHAR(20)  | unique, indexed                    |
| name       | VARCHAR(256) | nullable                           |
| asset_type | ENUM         | STOCK, CRYPTO, FOREX, ETF, INDEX   |
| is_active  | BOOLEAN      | only active assets are tracked     |

---

## Ingestion Strategy

### Rate limiting
- Tickers are grouped into **batches of 50** and sent as a single `yf.download()` call.
- `yf.download()` is called with `threads=False` to prevent yfinance spawning its own thread pool inside the Celery worker thread.
- One HTTP call per 50 tickers — minimal Yahoo Finance API pressure.

### Data window
Each run downloads only the last **30 minutes** of 1-minute bars (`start = now − 30 min`, `end = now`).
This provides:
- Resilience against a missed run or short worker downtime (up to 30 min).
- No wasteful downloading of data already in the DB — the upsert discards duplicates silently.

### Duplicate prevention
Insert uses `INSERT … ON CONFLICT DO NOTHING` on `(asset_id, timestamp, timeframe)`.
No extra read-before-write needed; the DB constraint is the single source of truth.

### Non-blocking execution
`yf.download()` is a blocking HTTP + pandas operation. It runs inside `asyncio.to_thread()` so the async event loop is never stalled during the download.

### DB session
Celery tasks use `TaskSessionLocal` (backed by a `NullPool` engine). Each `asyncio.run()` creates a fresh event loop; `NullPool` ensures no connections are carried over between calls, preventing asyncpg loop-binding errors.

---

## Scheduling

| Schedule entry              | Crontab          | Effective interval |
|-----------------------------|------------------|--------------------|
| `fetch-1m-price-data`       | `minute="*"`     | every 1 minute     |

Managed exclusively by **Celery Beat**. No APScheduler involved.

### Starting the workers

```bash
# Terminal 1 — Celery worker
cd backend
celery -A src.core.celery worker --loglevel=info

# Terminal 2 — Celery Beat scheduler
cd backend
celery -A src.core.celery beat --loglevel=info
```

Or via Docker Compose (extend `docker-compose.yml` to add worker and beat services).

---

## API Routes

> The price **query** router (`src/price/router.py`) is scaffolded but has no endpoints yet — this is upcoming work.

When implemented, planned endpoints are:

| Method | Path                              | Description                            |
|--------|-----------------------------------|----------------------------------------|
| GET    | `/price/{ticker}`                 | Latest price for a ticker              |
| GET    | `/price/{ticker}/history`         | OHLCV history with timeframe + range   |
| GET    | `/assets`                         | List tracked assets                    |
| POST   | `/assets`                         | Register a new asset for tracking      |

---

## How to Test

### 1. Verify active assets exist

```bash
# Connect to the DB
psql -h localhost -p 5433 -U marketmind -d marketminddb

SELECT ticker, asset_type, is_active FROM assets;
```

### 2. Trigger the task manually (without Beat)

```python
# From a Python shell in the backend directory
from src.price.tasks import ingest_1m_price_data
ingest_1m_price_data.apply()   # runs synchronously in the current process
```

Or via Celery:
```bash
celery -A src.core.celery call src.price.tasks.ingest_1m_price_data
```

### 3. Verify rows were inserted

```sql
SELECT
    a.ticker,
    COUNT(*) AS candles,
    MIN(pd.timestamp) AS earliest,
    MAX(pd.timestamp) AS latest
FROM price_data pd
JOIN assets a ON a.id = pd.asset_id
GROUP BY a.ticker
ORDER BY latest DESC;
```

### 4. Verify upsert idempotency

Run the task twice. The second call should insert 0 new rows (all conflict-ignored).

```sql
-- Row count should not change after the second run
SELECT COUNT(*) FROM price_data;
```

### 5. Check TimescaleDB chunk info

```sql
SELECT
    chunk_name,
    range_start,
    range_end
FROM timescaledb_information.chunks
WHERE hypertable_name = 'price_data'
ORDER BY range_start DESC
LIMIT 10;
```

Each chunk should span exactly 1 day.

### 6. Query performance — EXPLAIN ANALYZE

```sql
-- A typical UI query: last 100 candles for AAPL
EXPLAIN ANALYZE
SELECT pd.*
FROM price_data pd
JOIN assets a ON a.id = pd.asset_id
WHERE a.ticker = 'AAPL'
  AND pd.timeframe = '1m'
  AND pd.timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY pd.timestamp DESC
LIMIT 100;
```

Expected plan: **Index Scan** on `ix_price_data_asset_time` within a single 1-day chunk.

---

## Known Limitations

| Limitation | Detail |
|---|---|
| Single timeframe | Only `1m` candles are ingested. `5m`, `1h`, `1d` require separate tasks. |
| No space partitioning | For very large asset sets (thousands of tickers) a `space_partition` on `asset_id` would improve parallel chunk scans. |
| US market hours only | `yf.download()` with `interval=1m` returns empty DataFrames outside NYSE/NASDAQ hours for equity tickers. |
| yfinance unofficial API | Yahoo Finance's API has no SLA; it can change without notice. |
