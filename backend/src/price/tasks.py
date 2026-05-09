import asyncio
import uuid
from functools import partial

import pandas as pd
import yfinance as yf
from loguru import logger
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from src.core.celery import celery_app
from src.core.database import TaskSessionLocal
from src.core.redis import get_redis
from src.price.models import Asset, PriceData

BATCH_SIZE = 50
# "7d" is the maximum period yfinance supports for 1m interval.
# The on_conflict_do_nothing upsert silently discards already-stored rows,
# so running every minute is always safe.
DOWNLOAD_PERIOD = "7d"
MAX_RETRIES = 3
# asyncpg hard-limits query parameters to 32767.
# PriceData has 9 value columns → max ~3600 rows per INSERT, capped conservatively.
INSERT_CHUNK_SIZE = 2000
RETRY_BASE_DELAY = 2.0  # seconds, doubles each attempt

# Specs for the one-time historical backfill task.
# Each entry: (yfinance interval, yfinance period, DB timeframe label)
#
# Design rationale:
#   - 1h (730d) is the single "long" base: 1d and 4h are aggregated from it
#     via time_bucket(), so no need to store a separate 1d series.
#   - 5m / 15m / 30m are fetched natively (yfinance supports up to 60d for
#     these intervals) so each gets its full 60-day history independently.
#   - 1m is kept for real-time intraday detail (yfinance hard limit: 7 days).
HISTORICAL_SPECS = [
    ("1h",  "730d", "1h"),  # hourly — 2 years; base for 1h, 4h, and 1d views
    ("30m", "60d",  "30m"), # 30-minute — 60 days
    ("15m", "60d",  "15m"), # 15-minute — 60 days
    ("5m",  "60d",  "5m"),  # 5-minute  — 60 days
    ("1m",  "7d",   "1m"),  # 1-minute  — 7 days (yfinance hard limit)
]


# ── Ongoing 1m ingestion (every minute via Celery Beat) ─────────────────────

@celery_app.task(name="src.price.tasks.ingest_1m_price_data")
def ingest_1m_price_data():
    asyncio.run(_ingest_1m_price_data())


async def _ingest_1m_price_data():
    async with TaskSessionLocal() as db:
        result = await db.execute(select(Asset).where(Asset.is_active == True))
        active_assets = result.scalars().all()
        if not active_assets:
            logger.info("No active assets to track.")
            return

        ticker_to_id: dict[str, uuid.UUID] = {a.ticker: a.id for a in active_assets}
        tickers = list(ticker_to_id.keys())

        for i in range(0, len(tickers), BATCH_SIZE):
            batch = tickers[i : i + BATCH_SIZE]
            await _process_ticker_batch(db, batch, ticker_to_id)


async def _process_ticker_batch(
    db,
    tickers: list[str],
    ticker_to_id: dict[str, uuid.UUID],
):
    tickers_str = " ".join(tickers)

    download_fn = partial(
        yf.download,
        tickers=tickers_str,
        period=DOWNLOAD_PERIOD,
        interval="1m",
        group_by="ticker",
        progress=False,
        threads=False,  # disable yfinance's own thread pool inside ours
    )
    df = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            df = await asyncio.to_thread(download_fn)
            break
        except Exception as fetch_err:
            if attempt == MAX_RETRIES:
                raise
            delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
            logger.warning(
                f"yfinance download failed (attempt {attempt}/{MAX_RETRIES}) "
                f"for batch {tickers}: {fetch_err}. Retrying in {delay:.0f}s…"
            )
            await asyncio.sleep(delay)

    if df.empty:
        logger.warning(f"yfinance returned empty DataFrame for batch: {tickers}")
        return

    records: list[dict] = []
    is_multi = len(tickers) > 1

    for ticker in tickers:
        asset_id = ticker_to_id[ticker]
        ticker_df = df[ticker] if is_multi else df
        ticker_df = ticker_df.dropna(subset=["Close"])

        for ts, row in ticker_df.iterrows():
            records.append(
                {
                    "asset_id": asset_id,
                    "timestamp": ts.to_pydatetime(),
                    "timeframe": "1m",
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "adj_close": float(row.get("Adj Close", row["Close"])),
                    "volume": float(row["Volume"]),
                }
            )

    if not records:
        return

    for i in range(0, len(records), INSERT_CHUNK_SIZE):
        chunk = records[i : i + INSERT_CHUNK_SIZE]
        stmt = insert(PriceData).values(chunk)
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["asset_id", "timestamp", "timeframe"]
        )
        await db.execute(stmt)
    await db.commit()

    # Invalidate Redis cache for updated tickers so the next API request
    # always reads freshly ingested data instead of a stale cached response.
    redis = get_redis()
    if redis:
        for ticker in tickers:
            async for key in redis.scan_iter(f"price:history:{ticker}:*"):
                await redis.delete(key)
            await redis.delete(f"price:latest:{ticker}")

    logger.info(
        f"Ingested {len(records)} price records for {len(tickers)} tickers "
        f"(period={DOWNLOAD_PERIOD})."
    )


# ── Historical backfill (one-time or daily refresh via Celery Beat) ──────────

@celery_app.task(name="src.price.tasks.ingest_historical_price_data")
def ingest_historical_price_data(ticker_symbol: str | None = None):
    asyncio.run(_ingest_historical_price_data(ticker_symbol))


async def _ingest_historical_price_data(ticker_symbol: str | None = None):
    """
    Fetch multi-timeframe historical OHLCV data for all active assets (or one ticker).

    Downloads daily, hourly, and 1-minute candles from yfinance and upserts them
    into the price_data table.  Runs:
      - On admin trigger (POST /price/backfill)
      - Automatically every day at 06:00 HCM via Celery Beat (keeps 1h/1d fresh)
    """
    async with TaskSessionLocal() as db:
        stmt = select(Asset).where(Asset.is_active == True)
        if ticker_symbol:
            stmt = stmt.where(Asset.ticker == ticker_symbol.upper())
        result = await db.execute(stmt)
        assets = result.scalars().all()
        if not assets:
            label = ticker_symbol or "any active ticker"
            logger.info(f"No active assets found for historical backfill ({label}).")
            return

        for yf_interval, yf_period, db_timeframe in HISTORICAL_SPECS:
            logger.info(
                f"Historical backfill: interval={yf_interval}, period={yf_period}, "
                f"tickers={[a.ticker for a in assets]}"
            )
            for asset in assets:
                await _backfill_one_ticker(db, asset, yf_interval, yf_period, db_timeframe)


async def _backfill_one_ticker(
    db,
    asset: Asset,
    yf_interval: str,
    yf_period: str,
    db_timeframe: str,
):
    """Download and upsert historical data for a single ticker + timeframe."""
    # Use yf.Ticker.history() for per-ticker backfill — returns a flat DataFrame
    # with adjusted OHLCV (no separate Adj Close column needed).
    ticker_obj = yf.Ticker(asset.ticker)
    fetch_fn = partial(ticker_obj.history, period=yf_period, interval=yf_interval)

    df = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            df = await asyncio.to_thread(fetch_fn)
            break
        except Exception as fetch_err:
            if attempt == MAX_RETRIES:
                logger.error(
                    f"Historical fetch failed for {asset.ticker}/{yf_interval} "
                    f"after {MAX_RETRIES} attempts: {fetch_err}"
                )
                return
            delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
            logger.warning(
                f"Retry {attempt}/{MAX_RETRIES} for {asset.ticker}/{yf_interval} "
                f"in {delay:.0f}s: {fetch_err}"
            )
            await asyncio.sleep(delay)

    if df is None or df.empty:
        logger.warning(
            f"No historical data returned for {asset.ticker} "
            f"(interval={yf_interval}, period={yf_period})"
        )
        return

    # Flatten MultiIndex columns if present (some yfinance versions wrap single tickers).
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df.dropna(subset=["Close"])
    if df.empty:
        return

    records: list[dict] = []
    for ts, row in df.iterrows():
        # Normalize timezone-aware timestamps to plain UTC datetimes for asyncpg.
        timestamp = ts.to_pydatetime()
        if timestamp.tzinfo is not None:
            from datetime import timezone
            timestamp = timestamp.astimezone(timezone.utc).replace(tzinfo=None)

        records.append(
            {
                "asset_id": asset.id,
                "timestamp": timestamp,
                "timeframe": db_timeframe,
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                # .history() returns adjusted prices; store close as adj_close too.
                "adj_close": float(row["Close"]),
                "volume": float(row["Volume"]),
            }
        )

    if not records:
        return

    inserted = 0
    for i in range(0, len(records), INSERT_CHUNK_SIZE):
        chunk = records[i : i + INSERT_CHUNK_SIZE]
        stmt = insert(PriceData).values(chunk)
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["asset_id", "timestamp", "timeframe"]
        )
        result = await db.execute(stmt)
        inserted += result.rowcount
    await db.commit()

    logger.info(
        f"Backfilled {asset.ticker} [{db_timeframe}]: "
        f"{inserted} new rows inserted out of {len(records)} fetched."
    )
