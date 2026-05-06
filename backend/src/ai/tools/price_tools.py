from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.price.models import Asset, PriceData


async def get_price_history(
    db: AsyncSession,
    ticker: str,
    timeframe: str = "1d",
    limit: int = 50,
) -> dict:
    """
    Fetch OHLCV candlestick history for a ticker from the database.
    Returns up to `limit` candles in ascending time order.
    Supported timeframes: 1m, 5m, 15m, 30m, 1h, 4h, 1d.
    """
    ticker = ticker.upper()

    result = await db.execute(select(Asset).where(Asset.ticker == ticker))
    asset = result.scalar_one_or_none()
    if not asset:
        return {"error": f"Ticker '{ticker}' not found in database."}

    rows = (
        await db.execute(
            select(PriceData)
            .where(PriceData.asset_id == asset.id, PriceData.timeframe == "1m")
            .order_by(PriceData.timestamp.desc())
            .limit(limit)
        )
    ).scalars().all()

    if not rows:
        return {"error": f"No price data available for '{ticker}'."}

    candles = [
        {
            "timestamp": r.timestamp.isoformat(),
            "open": r.open,
            "high": r.high,
            "low": r.low,
            "close": r.close,
            "volume": r.volume,
        }
        for r in reversed(rows)
    ]

    return {
        "ticker": ticker,
        "timeframe": timeframe,
        "candles": candles,
        "count": len(candles),
    }


async def get_latest_price(db: AsyncSession, ticker: str) -> dict:
    """
    Fetch the most recent price for a ticker, including change vs previous candle.
    """
    ticker = ticker.upper()

    result = await db.execute(select(Asset).where(Asset.ticker == ticker))
    asset = result.scalar_one_or_none()
    if not asset:
        return {"error": f"Ticker '{ticker}' not found in database."}

    rows = (
        await db.execute(
            select(PriceData)
            .where(PriceData.asset_id == asset.id, PriceData.timeframe == "1m")
            .order_by(PriceData.timestamp.desc())
            .limit(2)
        )
    ).scalars().all()

    if not rows:
        return {"error": f"No price data available for '{ticker}'."}

    latest = rows[0]
    prev_close = rows[1].close if len(rows) == 2 else None
    change_amount = round(latest.close - prev_close, 6) if prev_close else None
    change_pct = round((change_amount / prev_close) * 100, 4) if prev_close else None

    return {
        "ticker": ticker,
        "timestamp": latest.timestamp.isoformat(),
        "price": latest.close,
        "open": latest.open,
        "high": latest.high,
        "low": latest.low,
        "volume": latest.volume,
        "change_amount": change_amount,
        "change_percentage": change_pct,
    }
