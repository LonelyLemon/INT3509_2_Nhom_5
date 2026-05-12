import uuid
import copy

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.price.models import Asset, PriceData
from src.indicators.models import UserIndicatorSettings
from src.indicators.schemas import (
    IndicatorSettingsBody,
    RSIResult, MACDResult, MovingAveragePoint, BollingerBandsResult,
    IndicatorDataResponse,
)

_MIN_CANDLES = 60

DEFAULT_SETTINGS = IndicatorSettingsBody()


# ── User settings ─────────────────────────────────────────────────────────────

async def get_user_settings(db: AsyncSession, user_id: uuid.UUID) -> IndicatorSettingsBody:
    row = (
        await db.execute(
            select(UserIndicatorSettings).where(UserIndicatorSettings.user_id == user_id)
        )
    ).scalar_one_or_none()
    if not row or not row.settings:
        return copy.deepcopy(DEFAULT_SETTINGS)
    return IndicatorSettingsBody.model_validate(row.settings)


async def save_user_settings(
    db: AsyncSession,
    user_id: uuid.UUID,
    new_settings: IndicatorSettingsBody,
) -> IndicatorSettingsBody:
    row = (
        await db.execute(
            select(UserIndicatorSettings).where(UserIndicatorSettings.user_id == user_id)
        )
    ).scalar_one_or_none()
    if row:
        row.settings = new_settings.model_dump()
    else:
        row = UserIndicatorSettings(user_id=user_id, settings=new_settings.model_dump())
        db.add(row)
    await db.commit()
    return new_settings


# ── Core computation ──────────────────────────────────────────────────────────

async def compute_indicators(
    db: AsyncSession,
    ticker: str,
    user_id: uuid.UUID | None = None,
    timeframe: str = "1d",
) -> IndicatorDataResponse:
    """
    Compute RSI, MACD, SMA, EMA for a ticker using user's saved settings (or defaults).
    """
    ticker = ticker.upper()
    settings = await get_user_settings(db, user_id) if user_id else DEFAULT_SETTINGS

    asset = (await db.execute(select(Asset).where(Asset.ticker == ticker))).scalar_one_or_none()
    if not asset:
        return IndicatorDataResponse(
            ticker=ticker, timeframe=timeframe,
            current_price=None, candles_used=0,
        )

    rows = (
        await db.execute(
            select(PriceData)
            .where(PriceData.asset_id == asset.id, PriceData.timeframe == "1m")
            .order_by(PriceData.timestamp.desc())
            .limit(200)
        )
    ).scalars().all()

    if len(rows) < _MIN_CANDLES:
        return IndicatorDataResponse(
            ticker=ticker, timeframe=timeframe,
            current_price=float(rows[0].close) if rows else None,
            candles_used=len(rows),
        )

    closes = np.array([r.close for r in reversed(rows)], dtype=float)
    current_price = float(closes[-1])

    rsi_val = _rsi(closes, settings.RSI.period)
    macd_line, signal_line, histogram = _macd(closes, settings.MACD.fast, settings.MACD.slow, settings.MACD.signal)
    sma_results = [
        MovingAveragePoint(
            period=p,
            value=_round(_sma(closes, p)),
            vs_price=_round(current_price - _sma(closes, p)) if _sma(closes, p) else None,
            interpretation=_interpret_sma(current_price, _sma(closes, p), f"SMA{p}"),
        )
        for p in settings.SMA.periods
    ]
    ema_results = [
        MovingAveragePoint(
            period=p,
            value=_round(float(_ema(closes, p)[-1])),
            vs_price=_round(current_price - float(_ema(closes, p)[-1])),
            interpretation=_interpret_sma(current_price, float(_ema(closes, p)[-1]), f"EMA{p}"),
        )
        for p in settings.EMA.periods
    ]

    return IndicatorDataResponse(
        ticker=ticker,
        timeframe=timeframe,
        current_price=round(current_price, 6),
        candles_used=len(closes),
        RSI=RSIResult(value=_round(rsi_val), interpretation=_interpret_rsi(rsi_val)),
        MACD=MACDResult(
            macd_line=_round(macd_line),
            signal_line=_round(signal_line),
            histogram=_round(histogram),
            interpretation=_interpret_macd(macd_line, signal_line, histogram),
        ),
        SMA=sma_results,
        EMA=ema_results,
    )


# ── Math helpers ──────────────────────────────────────────────────────────────

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
    return float(100 - (100 / (1 + avg_gain / avg_loss)))


def _macd(
    closes: np.ndarray, fast: int, slow: int, signal: int
) -> tuple[float | None, float | None, float | None]:
    if len(closes) < slow + signal:
        return None, None, None
    ema_fast = _ema(closes, fast)
    ema_slow = _ema(closes, slow)
    macd_line = ema_fast - ema_slow
    signal_arr = _ema(macd_line, signal)
    return float(macd_line[-1]), float(signal_arr[-1]), float(macd_line[-1] - signal_arr[-1])


def _round(v: float | None, digits: int = 4) -> float | None:
    return round(v, digits) if v is not None else None


def _interpret_rsi(rsi: float | None) -> str:
    if rsi is None:
        return "Insufficient data."
    if rsi >= 70:
        return f"RSI={rsi:.1f} → Overbought. Possible pullback ahead."
    if rsi <= 30:
        return f"RSI={rsi:.1f} → Oversold. Possible bounce ahead."
    if rsi >= 55:
        return f"RSI={rsi:.1f} → Bullish momentum."
    if rsi <= 45:
        return f"RSI={rsi:.1f} → Bearish momentum."
    return f"RSI={rsi:.1f} → Neutral zone."


def _interpret_macd(m: float | None, s: float | None, h: float | None) -> str:
    if m is None:
        return "Insufficient data."
    if h > 0 and m > 0:
        return "MACD above signal and zero line → Bullish trend confirmed."
    if h > 0 and m < 0:
        return "MACD crossed above signal (bullish crossover), still below zero → Potential early recovery."
    if h < 0 and m < 0:
        return "MACD below signal and zero line → Bearish trend confirmed."
    if h < 0 and m > 0:
        return "MACD crossed below signal (bearish crossover), still above zero → Potential weakening."
    return "MACD neutral."


def _interpret_sma(price: float, sma: float | None, label: str) -> str:
    if sma is None:
        return "Insufficient data."
    diff_pct = ((price - sma) / sma) * 100
    if diff_pct > 0:
        return f"Price is {diff_pct:.2f}% above {label} → Bullish. {label} acts as support."
    return f"Price is {abs(diff_pct):.2f}% below {label} → Bearish. {label} acts as resistance."
