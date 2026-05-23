from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, text, or_

from src.core.database import SessionDep
from src.core.redis import get_redis
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.auth.exceptions import InsufficientPermissions
from src.price.models import Asset, PriceData
from src.price.schemas import (
    AssetCreate,
    AssetUpdate,
    AssetResponse,
    PriceDataResponse,
    PriceHistoryResponse,
    LatestPriceResponse,
)
from src.price.constants import AssetType
from src.price.exceptions import AssetNotFound, AssetAlreadyExists, InvalidTimeframe, NoPriceDataAvailable

price_route = APIRouter(prefix="/price", tags=["Price"])

VALID_TIMEFRAMES = {"1m", "5m", "15m", "30m", "1h", "4h", "1d"}

# Cache TTL per timeframe — aligned to how often new candles appear.
# Slightly shorter than the candle interval so a fresh poll catches the new candle promptly.
_HISTORY_TTL: dict[str, int] = {
    "1m":  45,
    "5m":  4 * 60,
    "15m": 13 * 60,
    "30m": 28 * 60,
    "1h":  55 * 60,
    "4h":  3 * 60 * 60 + 50 * 60,
    "1d":  23 * 60 * 60,
}
_LATEST_TTL = 45  # seconds

# Maps each requested timeframe to (base timeframe stored in DB, aggregation interval).
# None aggregation interval → query stored data directly (no time_bucket needed).
# Trusted whitelist — string values are safe to interpolate into SQL INTERVAL literals.
#
# Storage layout after backfill:
#   "1m"  → 7 days   (yfinance hard limit for 1m interval)
#   "5m"  → 60 days  (fetched natively from yfinance)
#   "15m" → 60 days  (fetched natively from yfinance)
#   "30m" → 60 days  (fetched natively from yfinance)
#   "1h"  → 730 days (fetched natively from yfinance; base for 4h and 1d)
#
# 4h and 1d are NOT stored separately — they are derived on-the-fly from
# the stored 1h series via TimescaleDB time_bucket(), which gives them the
# same 730-day depth without extra storage overhead.
_TIMEFRAME_CONFIG: dict[str, tuple[str, str | None]] = {
    "1m":  ("1m",  None),
    "5m":  ("5m",  None),
    "15m": ("15m", None),
    "30m": ("30m", None),
    "1h":  ("1h",  None),
    "4h":  ("1h",  "4 hours"),
    "1d":  ("1h",  "1 day"),
}


# ── Ticker Management (/price/tickers) ──────────────────────────────────────
# NOTE: These static-path routes MUST be declared before the dynamic
# /{ticker} routes so FastAPI does not capture "tickers", "fetch", or
# "backfill" as ticker path parameters.


@price_route.get("/tickers", response_model=list[AssetResponse])
async def list_tickers(
    db: SessionDep,
    q: str | None = Query(None, description="Search by ticker symbol or asset name (partial match)"),
    asset_type: AssetType | None = Query(None, description="Filter by asset category"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List all tracked tickers. Supports search by symbol/name and filtering by category or active status."""
    stmt = select(Asset)
    if q is not None:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Asset.ticker.ilike(pattern),
                Asset.name.ilike(pattern),
            )
        )
    if asset_type is not None:
        stmt = stmt.where(Asset.asset_type == asset_type)
    if is_active is not None:
        stmt = stmt.where(Asset.is_active == is_active)
    result = await db.execute(stmt.offset(skip).limit(limit))
    return result.scalars().all()


@price_route.post("/tickers", response_model=AssetResponse, status_code=201)
async def add_ticker(
    payload: AssetCreate,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """
    Register a new ticker for ingestion (admin only).

    Once added with `is_active=True`, the next Celery Beat run will
    automatically begin fetching price data for this ticker.
    """
    if current_user.role != "admin":
        raise InsufficientPermissions()

    ticker = payload.ticker.upper()
    existing = await db.execute(select(Asset).where(Asset.ticker == ticker))
    if existing.scalar_one_or_none():
        raise AssetAlreadyExists()

    asset = Asset(
        ticker=ticker,
        name=payload.name,
        asset_type=payload.asset_type,
        is_active=payload.is_active,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset


@price_route.get("/tickers/{ticker}", response_model=AssetResponse)
async def get_ticker(ticker: str, db: SessionDep):
    """Get details for a specific tracked ticker."""
    result = await db.execute(select(Asset).where(Asset.ticker == ticker.upper()))
    asset = result.scalar_one_or_none()
    if not asset:
        raise AssetNotFound()
    return asset


@price_route.patch("/tickers/{ticker}", response_model=AssetResponse)
async def update_ticker(
    ticker: str,
    payload: AssetUpdate,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """
    Update a tracked ticker (admin only).

    Typical use: set `is_active=false` to pause ingestion without
    losing the ticker's price history.
    """
    if current_user.role != "admin":
        raise InsufficientPermissions()

    result = await db.execute(select(Asset).where(Asset.ticker == ticker.upper()))
    asset = result.scalar_one_or_none()
    if not asset:
        raise AssetNotFound()

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(asset, key, value)

    await db.commit()
    await db.refresh(asset)
    return asset


@price_route.delete("/tickers/{ticker}", status_code=204)
async def delete_ticker(
    ticker: str,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """
    Remove a tracked ticker (admin only).

    This permanently deletes the ticker and all its historical price data
    (cascade on asset_id FK).
    """
    if current_user.role != "admin":
        raise InsufficientPermissions()

    result = await db.execute(select(Asset).where(Asset.ticker == ticker.upper()))
    asset = result.scalar_one_or_none()
    if not asset:
        raise AssetNotFound()

    await db.delete(asset)
    await db.commit()


# ── Manual Ingestion Triggers ────────────────────────────────────────────────


@price_route.post("/fetch", status_code=202)
async def trigger_ingestion(current_user: User = Depends(get_current_user)):
    """
    Manually trigger a 1m price ingestion run for all active tickers (admin only).

    Dispatches the same Celery task used by the 1-minute Beat schedule,
    so data is fetched immediately rather than waiting for the next tick.
    """
    if current_user.role != "admin":
        raise InsufficientPermissions()

    from src.price.tasks import ingest_1m_price_data  # lazy to avoid circular import
    ingest_1m_price_data.delay()
    return {"message": "Price ingestion task dispatched.", "status": "queued"}


@price_route.post("/backfill", status_code=202)
async def trigger_historical_backfill(
    ticker: str | None = Query(None, description="Specific ticker to backfill; omit to backfill all active tickers"),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger historical price backfill (admin only).

    Downloads daily (max history), hourly (2 years), and 1-minute (7 days)
    candles from yfinance and upserts them into the database.  Use this once
    after registering new tickers to populate their full price history.
    """
    if current_user.role != "admin":
        raise InsufficientPermissions()

    from src.price.tasks import ingest_historical_price_data  # lazy import
    ingest_historical_price_data.delay(ticker)
    label = ticker.upper() if ticker else "all active tickers"
    return {"message": f"Historical backfill dispatched for {label}.", "status": "queued"}


# ── Price History (/price/{ticker}) ─────────────────────────────────────────


@price_route.get("/{ticker}", response_model=PriceHistoryResponse)
async def get_price_history(
    ticker: str,
    db: SessionDep,
    timeframe: str = Query("1m", description="Candlestick timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d)"),
    limit: int = Query(200, ge=1, le=1000, description="Max candles to return"),
    start: datetime | None = Query(None, description="Start of time range (UTC)"),
    end: datetime | None = Query(None, description="End of time range (UTC)"),
):
    """
    Return OHLCV candlestick history for a ticker.

    Timeframe routing:
    - 1m → stored 1-minute data queried directly.
    - 5m / 15m / 30m → derived on-the-fly by aggregating 1m data with time_bucket().
    - 1h → stored 1-hour data queried directly (populated by historical backfill).
    - 4h → derived by aggregating stored 1h data with time_bucket().
    - 1d → stored daily data queried directly (populated by historical backfill).

    Results are cached in Redis with a TTL aligned to the requested timeframe.
    """
    if timeframe not in VALID_TIMEFRAMES:
        raise InvalidTimeframe()

    ticker = ticker.upper()
    cache_key = f"price:history:{ticker}:{timeframe}:{limit}:{start}:{end}"
    redis = get_redis()

    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return PriceHistoryResponse.model_validate_json(cached)

    result = await db.execute(select(Asset).where(Asset.ticker == ticker))
    asset = result.scalar_one_or_none()
    if not asset:
        raise AssetNotFound()

    base_tf, agg_interval = _TIMEFRAME_CONFIG[timeframe]

    if agg_interval is None:
        # Query stored data for this timeframe directly.
        stmt = (
            select(PriceData)
            .where(PriceData.asset_id == asset.id, PriceData.timeframe == base_tf)
        )
        if start:
            stmt = stmt.where(PriceData.timestamp >= start)
        if end:
            stmt = stmt.where(PriceData.timestamp <= end)
        stmt = stmt.order_by(PriceData.timestamp.desc()).limit(limit)
        rows = (await db.execute(stmt)).scalars().all()
        # Reverse so the chart receives data in ascending order.
        data = [PriceDataResponse.model_validate(r, from_attributes=True) for r in reversed(rows)]
    else:
        # Aggregate base_tf candles into the requested timeframe using TimescaleDB time_bucket().
        sql = text(f"""
            SELECT
                time_bucket(INTERVAL '{agg_interval}', timestamp) AS timestamp,
                first(open, timestamp)                             AS open,
                max(high)                                          AS high,
                min(low)                                           AS low,
                last(close, timestamp)                             AS close,
                sum(volume)                                        AS volume
            FROM price_data
            WHERE
                asset_id  = :asset_id
                AND timeframe = :base_tf
                AND (CAST(:start AS TIMESTAMPTZ) IS NULL OR timestamp >= CAST(:start AS TIMESTAMPTZ))
                AND (CAST(:end   AS TIMESTAMPTZ) IS NULL OR timestamp <= CAST(:end   AS TIMESTAMPTZ))
            GROUP BY time_bucket(INTERVAL '{agg_interval}', timestamp)
            ORDER BY timestamp DESC
            LIMIT :limit
        """)
        rows = (await db.execute(sql, {
            "asset_id": asset.id,
            "base_tf": base_tf,
            "start": start,
            "end": end,
            "limit": limit,
        })).mappings().all()
        data = [PriceDataResponse.model_validate(dict(row)) for row in reversed(rows)]

    response = PriceHistoryResponse(ticker=ticker, timeframe=timeframe, data=data)

    if redis:
        await redis.set(cache_key, response.model_dump_json(), ex=_HISTORY_TTL[timeframe])

    return response


@price_route.get("/{ticker}/latest", response_model=LatestPriceResponse)
async def get_latest_price(ticker: str, db: SessionDep):
    """
    Return the most-recent 1m candle for a ticker, including change vs the
    previous candle's close (change_amount, change_percentage).
    Result is cached in Redis for 45 seconds.
    """
    ticker = ticker.upper()
    cache_key = f"price:latest:{ticker}"
    redis = get_redis()

    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return LatestPriceResponse.model_validate_json(cached)

    result = await db.execute(select(Asset).where(Asset.ticker == ticker))
    asset = result.scalar_one_or_none()
    if not asset:
        raise AssetNotFound()

    rows = (await db.execute(
        select(PriceData)
        .where(PriceData.asset_id == asset.id, PriceData.timeframe == "1m")
        .order_by(PriceData.timestamp.desc())
        .limit(2)
    )).scalars().all()

    if not rows:
        raise NoPriceDataAvailable()

    latest = rows[0]
    prev_close = rows[1].close if len(rows) == 2 else None

    change_amount = round(latest.close - prev_close, 6) if prev_close is not None else None
    change_percentage = round((change_amount / prev_close) * 100, 4) if prev_close else None

    response = LatestPriceResponse(
        ticker=ticker,
        timestamp=latest.timestamp,
        open=latest.open,
        high=latest.high,
        low=latest.low,
        close=latest.close,
        volume=latest.volume,
        change_amount=change_amount,
        change_percentage=change_percentage,
    )

    if redis:
        await redis.set(cache_key, response.model_dump_json(), ex=_LATEST_TTL)

    return response
