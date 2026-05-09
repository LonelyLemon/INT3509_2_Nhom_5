import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.watchlist.models import WatchlistItem
from src.price.models import PriceData


async def get_watchlist(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """
    Fetch user's watchlist items with current prices and price change.
    Returns items ordered by position.
    """
    result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.user_id == user_id)
        .options(selectinload(WatchlistItem.asset))
        .order_by(WatchlistItem.position)
    )
    items = result.scalars().all()

    if not items:
        return {
            "watchlist": [],
            "count": 0,
            "message": "Watchlist của bạn đang trống. Vào trang Dashboard để thêm mã cổ phiếu vào watchlist.",
        }

    watchlist_data = []
    for item in items:
        asset = item.asset
        if not asset:
            continue

        # Get latest 2 candles for price + change calculation
        rows = (
            await db.execute(
                select(PriceData)
                .where(
                    PriceData.asset_id == asset.id,
                    PriceData.timeframe == "1m",
                )
                .order_by(PriceData.timestamp.desc())
                .limit(2)
            )
        ).scalars().all()

        current_price = None
        change_pct = None
        change_amount = None

        if rows:
            latest = rows[0]
            current_price = latest.close
            if len(rows) == 2:
                prev_close = rows[1].close
                if prev_close:
                    change_amount = round(current_price - prev_close, 6)
                    change_pct = round((change_amount / prev_close) * 100, 4)

        watchlist_data.append({
            "ticker": asset.ticker,
            "name": asset.name or asset.ticker,
            "asset_type": asset.asset_type.value if asset.asset_type else "unknown",
            "current_price": round(current_price, 4) if current_price else None,
            "change_amount": change_amount,
            "change_percentage": change_pct,
            "position": item.position,
        })

    return {
        "watchlist": watchlist_data,
        "count": len(watchlist_data),
    }
