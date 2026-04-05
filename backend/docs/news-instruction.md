# News Feature — Instruction

## Overview

The news feature fetches financial news articles from **Yahoo Finance via yfinance** for all active assets stored in the database. Articles are persisted with per-ticker association metadata. Scheduling is handled entirely by **Celery Beat** — no APScheduler.

---

## Architecture

```
Celery Beat (every 3h + market open/close)
    └─► ingest_assets_news (Celery task)
            ├─ Query active asset tickers from DB
            ├─ get_tickers_news() — per-ticker yfinance calls with 0.3s delay
            │       └─ URL dedup across tickers (in-memory set)
            ├─ Bulk URL check against DB  (1 query, not N)
            └─ db.add_all(new_articles) + commit

POST /news/fetch?ticker=AAPL  (on-demand, synchronous)
    └─► get_ticker_news() → parse → single-query dedup → save

POST /news/fetch  (no ticker, on-demand async)
    └─► ingest_assets_news.delay()  → returns immediately
```

---

## Database Design

### Table: `news_articles`

| Column                  | Type              | Notes                         |
|-------------------------|-------------------|-------------------------------|
| id                      | UUID (PK)         |                               |
| title                   | VARCHAR(512)      |                               |
| summary                 | TEXT              | may be empty for some sources |
| published_at            | TIMESTAMPTZ       |                               |
| authors                 | ARRAY of VARCHAR  | nullable                      |
| url                     | VARCHAR(1024)     | **unique** — dedup key        |
| source                  | VARCHAR(256)      | provider display name         |
| source_domain           | VARCHAR(256)      | provider domain               |
| primary_ticker          | VARCHAR(20)       | ticker used to fetch article  |
| primary_topic           | VARCHAR(128)      | null (yfinance has no topics) |
| overall_sentiment_score | FLOAT             | null (yfinance has no scores) |
| overall_sentiment_label | VARCHAR(50)       | null                          |

### Table: `news_article_tickers`

| Column          | Type    | Notes                                          |
|-----------------|---------|------------------------------------------------|
| id              | UUID    |                                                |
| article_id      | UUID FK | CASCADE delete from news_articles              |
| ticker          | VARCHAR | **indexed** (`ix_news_article_tickers_ticker`) |
| relevance_score | FLOAT   | null (yfinance has no relevance scores)        |
| sentiment_score | FLOAT   | null                                           |

**Constraint:** `UNIQUE(article_id, ticker)` prevents the same ticker appearing twice on one article.

### Table: `news_article_topics`

| Column         | Type    | Notes               |
|----------------|---------|---------------------|
| article_id     | UUID FK |                     |
| topic          | VARCHAR |                     |
| relevance_score| FLOAT   | null                |

> Topics are not populated by yfinance. Rows are only created if a future provider supplies them.

---

## Fetching Strategy

### Data source
Yahoo Finance via `yfinance.Ticker(ticker).news`. No API key required. The unofficial API has no documented rate limit, but aggressive use causes soft throttling (HTTP 429 / empty responses).

### Rate limiting
A **0.3-second delay** (`_REQUEST_DELAY`) is inserted between consecutive per-ticker calls inside `get_tickers_news()`. For N active assets this means a minimum wall-clock time of `N × 0.3s` for the fetch phase.

| Assets | Min. fetch time |
|--------|-----------------|
| 10     | 3 s             |
| 50     | 15 s            |
| 100    | 30 s            |

This is acceptable since the task runs in the background every 3 hours.

### Cross-ticker deduplication (fetch layer)
`get_tickers_news()` maintains a `seen_urls` set while iterating tickers. If ticker B returns an article already seen from ticker A, it is dropped immediately — the DB never sees it.

### DB deduplication (persistence layer)
Before parsing, one `SELECT url FROM news_articles WHERE url IN (…)` query fetches all already-known URLs in a single round-trip. Only genuinely new articles are parsed and inserted.

An intra-batch set (`existing_urls`) prevents inserting the same article twice within a single task run.

### yfinance response format compatibility
The parser handles two yfinance wire formats:

| Format | Detection | URL field | Date field |
|--------|-----------|-----------|------------|
| v1.x nested | `item["content"]` exists | `content.canonicalUrl.url` | `content.pubDate` (ISO-8601) |
| v0.2.x flat | no `content` key | `item["link"]` | `item["providerPublishTime"]` (Unix ts) |

---

## Scheduling

All schedules are defined in `src/core/celery.py → beat_schedule`.

| Schedule entry                  | Crontab (HCM, UTC+7) | Approximate ET equivalent  |
|---------------------------------|----------------------|----------------------------|
| `fetch-assets-news-periodic`    | every 3 hours (`:00`)| background sweep            |
| `fetch-assets-news-market-open` | 20:30 HCM            | 09:30 ET (summer/EDT)       |
| `fetch-assets-news-market-close`| 03:00 HCM            | 16:00 ET (summer/EDT)       |

> **DST note:** NYSE shifts between EST (UTC-5) and EDT (UTC-4) twice per year. Adjust the crontab hours in `celery.py` accordingly.

### Starting the workers

```bash
# Terminal 1 — Celery worker (handles both price and news tasks)
cd backend
celery -A src.core.celery worker --loglevel=info

# Terminal 2 — Celery Beat
cd backend
celery -A src.core.celery beat --loglevel=info
```

---

## API Routes

### `POST /news/fetch`

Manually trigger news ingestion.

| Query param | Type   | Default | Description                                          |
|-------------|--------|---------|------------------------------------------------------|
| `ticker`    | string | `null`  | If set, fetches for this ticker and returns results. If omitted, dispatches the Celery task for all assets. |
| `limit`     | int    | `20`    | Max articles to fetch (1–50, applies when ticker set)|

**Response — ticker provided:**
```json
{
  "message": "Successfully fetched and saved news.",
  "fetched_count": 15,
  "inserted_count": 4
}
```

**Response — no ticker (task dispatched):**
```json
{
  "message": "News ingestion task dispatched for all active assets.",
  "status": "queued"
}
```

---

### `GET /news`

Paginated list of news articles, newest first.

| Query param | Type   | Default | Description                           |
|-------------|--------|---------|---------------------------------------|
| `ticker`    | string | `null`  | Filter to articles associated with this ticker (uses `ix_news_article_tickers_ticker` index) |
| `skip`      | int    | `0`     | Offset for pagination                 |
| `limit`     | int    | `20`    | Page size (1–100)                     |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Apple Reports Record Quarter",
      "summary": "…",
      "published_at": "2026-04-05T14:30:00Z",
      "url": "https://…",
      "source": "Reuters",
      "primary_ticker": "AAPL",
      "tickers": [{"ticker": "AAPL", "relevance_score": null, "sentiment_score": null}],
      "topics": []
    }
  ],
  "total": 142
}
```

---

### `GET /news/{news_id}`

Retrieve a single article by its UUID.

**Response:** Full `NewsArticleResponse` including `tickers[]` and `topics[]`.

**Error:** `404 Not Found` if the article does not exist.

---

## How to Test

### 1. Fetch news for a specific ticker (manual)

```bash
curl -X POST "http://localhost:8000/news/fetch?ticker=AAPL&limit=10"
```

Expected: `inserted_count` > 0 on first run, = 0 on re-run (idempotent).

### 2. Dispatch background task for all assets

```bash
curl -X POST "http://localhost:8000/news/fetch"
```

Expected: `{"status": "queued"}` immediately. Check Celery worker logs for progress.

### 3. List all news (paginated)

```bash
curl "http://localhost:8000/news?skip=0&limit=5"
```

### 4. Filter news by ticker

```bash
curl "http://localhost:8000/news?ticker=TSLA&limit=20"
```

Verify the response only contains articles that have `TSLA` in their `tickers[]` list.

### 5. Get a specific article

```bash
# Get the UUID from the list response first
curl "http://localhost:8000/news/<uuid>"
```

### 6. 404 on unknown ID

```bash
curl "http://localhost:8000/news/00000000-0000-0000-0000-000000000000"
# Expected: 404 {"detail": "Article not found."}
```

### 7. Trigger Celery task directly (no Beat running)

```bash
celery -A src.core.celery call src.news.tasks.ingest_assets_news
```

Check worker stdout for log lines:
```
INFO  Fetching news for N active assets…
INFO  Saved X new articles (from Y fetched across N tickers).
```

### 8. Verify DB deduplication

```sql
-- Should return 0 — url column has a UNIQUE constraint
SELECT url, COUNT(*) FROM news_articles GROUP BY url HAVING COUNT(*) > 1;
```

### 9. Verify ticker index is used

```sql
EXPLAIN ANALYZE
SELECT na.*
FROM news_articles na
JOIN news_article_tickers nat ON nat.article_id = na.id
WHERE nat.ticker = 'AAPL'
ORDER BY na.published_at DESC
LIMIT 20;
```

Expected plan: **Index Scan** on `ix_news_article_tickers_ticker`.

---

## Known Limitations

| Limitation | Detail |
|---|---|
| No sentiment scores | yfinance does not expose sentiment analysis. Fields `overall_sentiment_score`, `relevance_score`, and `sentiment_score` are always `null`. |
| No topic taxonomy | `topics[]` is always an empty array. |
| Sequential ticker loop | News is fetched one ticker at a time (with delay). Concurrent fetching would be faster but risks rate-limiting. |
| Unofficial API | Yahoo Finance's undocumented API can change without notice; yfinance may need updating. |
| Ticker not FK-constrained | `news_article_tickers.ticker` is a plain string, not a FK to `assets.ticker`. Related tickers from Yahoo (e.g. market-wide articles) may reference tickers not in the assets table. |
