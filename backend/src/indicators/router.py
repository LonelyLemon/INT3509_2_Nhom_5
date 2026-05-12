from fastapi import APIRouter, Depends

from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.core.database import SessionDep
from src.indicators.schemas import (
    IndicatorSettingsResponse,
    IndicatorSettingsUpdate,
    IndicatorSettingsBody,
    IndicatorDataResponse,
)
from src.indicators.service import get_user_settings, save_user_settings, compute_indicators

indicators_router = APIRouter(prefix="/indicators", tags=["Indicators"])


@indicators_router.get("/settings", response_model=IndicatorSettingsResponse)
async def get_settings(
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Return the current user's indicator settings (defaults if not set)."""
    settings = await get_user_settings(db, current_user.id)
    return IndicatorSettingsResponse(settings=settings)


@indicators_router.put("/settings", response_model=IndicatorSettingsResponse)
async def update_settings(
    payload: IndicatorSettingsUpdate,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Update indicator settings. Only provided fields are changed; others keep current values."""
    current = await get_user_settings(db, current_user.id)

    # Merge: only override fields that are explicitly sent
    merged = IndicatorSettingsBody(
        RSI=payload.RSI or current.RSI,
        MACD=payload.MACD or current.MACD,
        SMA=payload.SMA or current.SMA,
        EMA=payload.EMA or current.EMA,
    )
    saved = await save_user_settings(db, current_user.id, merged)
    return IndicatorSettingsResponse(settings=saved)


@indicators_router.get("/compute", response_model=IndicatorDataResponse)
async def compute(
    ticker: str,
    db: SessionDep,
    timeframe: str = "1d",
    current_user: User = Depends(get_current_user),
):
    """Compute RSI, MACD, SMA, EMA for a ticker using this user's saved settings."""
    return await compute_indicators(db, ticker, current_user.id, timeframe)
