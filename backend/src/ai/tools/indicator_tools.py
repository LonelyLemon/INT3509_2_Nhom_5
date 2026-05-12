import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.indicators.service import compute_indicators


async def calculate_technical_indicators(
    db: AsyncSession,
    ticker: str,
    user_id: uuid.UUID | None = None,
    timeframe: str = "1d",
) -> dict:
    """
    Calculate RSI, MACD, SMA, EMA for a ticker using the user's saved indicator settings.
    Delegates to the indicators service, returning a dict for AI agent consumption.
    """
    result = await compute_indicators(db, ticker, user_id, timeframe)

    if result.candles_used == 0:
        return {"error": f"Ticker '{ticker.upper()}' not found in database."}
    if result.current_price is None:
        return {"error": f"No price data available for '{ticker.upper()}'."}

    return {
        "ticker": result.ticker,
        "timeframe": result.timeframe,
        "current_price": result.current_price,
        "candles_used": result.candles_used,
        "indicators": {
            "RSI": result.RSI.model_dump() if result.RSI else None,
            "MACD": result.MACD.model_dump() if result.MACD else None,
            "SMA": [s.model_dump() for s in result.SMA],
            "EMA": [e.model_dump() for e in result.EMA],
        },
    }
