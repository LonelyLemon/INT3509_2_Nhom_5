import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.price.models import Asset, PriceData

# Minimum candles needed for reliable indicator values
_MIN_CANDLES = 60


async def calculate_technical_indicators(
    db: AsyncSession,
    ticker: str,
    timeframe: str = "1d",
) -> dict:
    """
    Calculate RSI(14), MACD(12,26,9), SMA(20), SMA(50), and Bollinger Bands(20,2)
    for a ticker using the 200 most recent candles from the database.
    Returns both raw values and plain-language interpretations.
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
            .limit(200)
        )
    ).scalars().all()

    if len(rows) < _MIN_CANDLES:
        return {
            "error": f"Insufficient data for '{ticker}': need at least {_MIN_CANDLES} candles, got {len(rows)}."
        }

    closes = np.array([r.close for r in reversed(rows)], dtype=float)
    current_price = closes[-1]

    rsi = _rsi(closes, period=14)
    macd_line, signal_line, histogram = _macd(closes, fast=12, slow=26, signal=9)
    sma20 = _sma(closes, period=20)
    sma50 = _sma(closes, period=50)
    bb_upper, bb_middle, bb_lower = _bollinger_bands(closes, period=20, num_std=2)

    return {
        "ticker": ticker,
        "current_price": round(current_price, 6),
        "indicators": {
            "RSI_14": {
                "value": _round(rsi),
                "interpretation": _interpret_rsi(rsi),
            },
            "MACD": {
                "macd_line": _round(macd_line),
                "signal_line": _round(signal_line),
                "histogram": _round(histogram),
                "interpretation": _interpret_macd(macd_line, signal_line, histogram),
            },
            "SMA_20": {
                "value": _round(sma20),
                "vs_price": _round(current_price - sma20) if sma20 else None,
                "interpretation": _interpret_sma(current_price, sma20, "SMA20"),
            },
            "SMA_50": {
                "value": _round(sma50),
                "vs_price": _round(current_price - sma50) if sma50 else None,
                "interpretation": _interpret_sma(current_price, sma50, "SMA50"),
            },
            "Bollinger_Bands_20_2": {
                "upper": _round(bb_upper),
                "middle": _round(bb_middle),
                "lower": _round(bb_lower),
                "bandwidth": _round(bb_upper - bb_lower) if bb_upper and bb_lower else None,
                "interpretation": _interpret_bb(current_price, bb_upper, bb_middle, bb_lower),
            },
        },
        "candles_used": len(closes),
    }


# ── Calculation helpers ───────────────────────────────────────────────────────

def _sma(closes: np.ndarray, period: int) -> float | None:
    if len(closes) < period:
        return None
    return float(np.mean(closes[-period:]))


def _ema(closes: np.ndarray, period: int) -> np.ndarray:
    k = 2.0 / (period + 1)
    ema = np.empty(len(closes))
    ema[0] = closes[0]
    for i in range(1, len(closes)):
        ema[i] = closes[i] * k + ema[i - 1] * (1 - k)
    return ema


def _rsi(closes: np.ndarray, period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    deltas = np.diff(closes)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)

    avg_gain = float(np.mean(gains[:period]))
    avg_loss = float(np.mean(losses[:period]))

    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return float(100 - (100 / (1 + rs)))


def _macd(
    closes: np.ndarray, fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[float | None, float | None, float | None]:
    if len(closes) < slow + signal:
        return None, None, None
    ema_fast = _ema(closes, fast)
    ema_slow = _ema(closes, slow)
    macd_line = ema_fast - ema_slow
    signal_line = _ema(macd_line, signal)
    histogram = macd_line[-1] - signal_line[-1]
    return float(macd_line[-1]), float(signal_line[-1]), float(histogram)


def _bollinger_bands(
    closes: np.ndarray, period: int = 20, num_std: float = 2.0
) -> tuple[float | None, float | None, float | None]:
    if len(closes) < period:
        return None, None, None
    window = closes[-period:]
    middle = float(np.mean(window))
    std = float(np.std(window, ddof=1))
    return middle + num_std * std, middle, middle - num_std * std


# ── Interpretation helpers ────────────────────────────────────────────────────

def _round(v: float | None, digits: int = 4) -> float | None:
    return round(v, digits) if v is not None else None


def _interpret_rsi(rsi: float | None) -> str:
    if rsi is None:
        return "Insufficient data."
    if rsi >= 70:
        return f"RSI={rsi:.1f} → Overbought. Possible pullback or reversal ahead."
    if rsi <= 30:
        return f"RSI={rsi:.1f} → Oversold. Possible bounce or reversal ahead."
    if rsi >= 55:
        return f"RSI={rsi:.1f} → Bullish momentum."
    if rsi <= 45:
        return f"RSI={rsi:.1f} → Bearish momentum."
    return f"RSI={rsi:.1f} → Neutral zone."


def _interpret_macd(
    macd: float | None, signal: float | None, hist: float | None
) -> str:
    if macd is None:
        return "Insufficient data."
    if hist > 0 and macd > 0:
        return "MACD above signal and zero line → Bullish trend confirmed."
    if hist > 0 and macd < 0:
        return "MACD crossed above signal (bullish crossover), still below zero → Potential early recovery."
    if hist < 0 and macd < 0:
        return "MACD below signal and zero line → Bearish trend confirmed."
    if hist < 0 and macd > 0:
        return "MACD crossed below signal (bearish crossover), still above zero → Potential weakening."
    return "MACD neutral."


def _interpret_sma(price: float, sma: float | None, label: str) -> str:
    if sma is None:
        return "Insufficient data."
    diff_pct = ((price - sma) / sma) * 100
    if diff_pct > 0:
        return f"Price is {diff_pct:.2f}% above {label} → Bullish. {label} acts as support."
    return f"Price is {abs(diff_pct):.2f}% below {label} → Bearish. {label} acts as resistance."


def _interpret_bb(
    price: float,
    upper: float | None,
    middle: float | None,
    lower: float | None,
) -> str:
    if upper is None:
        return "Insufficient data."
    bandwidth_pct = ((upper - lower) / middle) * 100 if middle else 0
    if price >= upper:
        return f"Price at/above upper band → Overbought zone. Band width: {bandwidth_pct:.1f}%."
    if price <= lower:
        return f"Price at/below lower band → Oversold zone. Band width: {bandwidth_pct:.1f}%."
    mid_dist = ((price - middle) / middle) * 100
    side = "upper half" if mid_dist > 0 else "lower half"
    return f"Price in {side} of Bollinger Bands. Band width: {bandwidth_pct:.1f}%."
