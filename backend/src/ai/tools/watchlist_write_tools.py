import uuid

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.price.models import Asset
from src.watchlist.models import WatchlistItem


async def _resolve_asset(db: AsyncSession, ticker: str) -> Asset | None:
    result = await db.execute(
        select(Asset).where(Asset.ticker == ticker.upper(), Asset.is_active == True)
    )
    return result.scalar_one_or_none()


async def add_to_watchlist(
    db: AsyncSession,
    user_id: uuid.UUID,
    ticker: str,
) -> dict:
    """Add a ticker to the user's watchlist. Silent if already present."""
    asset = await _resolve_asset(db, ticker)
    if not asset:
        return {"error": f"Ticker '{ticker.upper()}' không tìm thấy trong hệ thống."}

    # Check duplicate
    existing = (
        await db.execute(
            select(WatchlistItem).where(
                WatchlistItem.user_id == user_id,
                WatchlistItem.asset_id == asset.id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        return {
            "success": True,
            "already_existed": True,
            "ticker": asset.ticker,
            "message": f"'{asset.ticker}' đã có trong watchlist của bạn.",
        }

    # Determine next position
    max_pos = (
        await db.execute(
            select(func.max(WatchlistItem.position)).where(WatchlistItem.user_id == user_id)
        )
    ).scalar_one()
    next_pos = (max_pos or 0) + 1

    item = WatchlistItem(user_id=user_id, asset_id=asset.id, position=next_pos)
    db.add(item)
    await db.commit()

    return {
        "success": True,
        "ticker": asset.ticker,
        "name": asset.name or asset.ticker,
        "message": f"Đã thêm '{asset.ticker}' vào watchlist.",
    }


async def remove_from_watchlist(
    db: AsyncSession,
    user_id: uuid.UUID,
    ticker: str,
) -> dict:
    """Remove a ticker from the user's watchlist."""
    asset = await _resolve_asset(db, ticker)
    if not asset:
        return {"error": f"Ticker '{ticker.upper()}' không tìm thấy."}

    item = (
        await db.execute(
            select(WatchlistItem).where(
                WatchlistItem.user_id == user_id,
                WatchlistItem.asset_id == asset.id,
            )
        )
    ).scalar_one_or_none()

    if not item:
        return {
            "error": f"'{ticker.upper()}' không có trong watchlist của bạn.",
        }

    await db.delete(item)
    await db.commit()

    return {
        "success": True,
        "ticker": asset.ticker,
        "message": f"Đã xóa '{asset.ticker}' khỏi watchlist.",
    }
