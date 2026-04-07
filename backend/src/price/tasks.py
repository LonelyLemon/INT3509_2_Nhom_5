import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from functools import partial

import yfinance as yf
from loguru import logger
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from src.core.celery import celery_app
from src.core.database import TaskSessionLocal
from src.price.models import Asset, PriceData

BATCH_SIZE = 50
# Rolling window for each ingestion run. Wide enough to tolerate a missed run
# or short worker downtime, but narrow enough to avoid downloading stale data.
# The upsert (on_conflict_do_nothing) discards anything already in the DB.
LOOKBACK_MINUTES = 30


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

        end = datetime.now(timezone.utc)
        start = end - timedelta(minutes=LOOKBACK_MINUTES)

        for i in range(0, len(tickers), BATCH_SIZE):
            batch = tickers[i : i + BATCH_SIZE]
            await _process_ticker_batch(db, batch, ticker_to_id, start, end)


async def _process_ticker_batch(
    db,
    tickers: list[str],
    ticker_to_id: dict[str, uuid.UUID],
    start: datetime,
    end: datetime,
):
    tickers_str = " ".join(tickers)

    try:
        # Run the blocking yfinance download in a thread so the event loop
        # stays free for other coroutines (e.g. concurrent DB flushes).
        download_fn = partial(
            yf.download,
            tickers=tickers_str,
            start=start,
            end=end,
            interval="1m",
            group_by="ticker",
            progress=False,
            threads=False,  # disable yfinance's own thread pool inside ours
        )
        df = await asyncio.to_thread(download_fn)

        if df.empty:
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

        stmt = insert(PriceData).values(records)
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["asset_id", "timestamp", "timeframe"]
        )
        await db.execute(stmt)
        await db.commit()
        logger.info(
            f"Ingested {len(records)} price records for {len(tickers)} tickers "
            f"({start.strftime('%H:%M')}–{end.strftime('%H:%M')} UTC)."
        )

    except Exception as e:
        await db.rollback()
        logger.error(f"Error processing price batch {tickers}: {e}")
