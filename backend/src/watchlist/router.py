from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.core.database import SessionDep
from src.watchlist.models import WatchlistItem
from src.watchlist.schemas import (
    WatchlistItemCreate,
    WatchlistReorder,
    WatchlistItemResponse,
    WatchlistResponse,
)
from src.watchlist.exceptions import WatchlistItemNotFound
from src.price.exceptions import AssetNotFound
from src.price.models import Asset, PriceData
from src.portfolio.schemas import AssetBrief

watchlist_route = APIRouter(
    prefix="/watchlist",
    tags=["Watchlist"],
)


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _latest_two_prices(
    db: SessionDep, asset_ids: list[UUID]
) -> dict[UUID, tuple[float | None, float | None]]:
    """Return {asset_id: (latest_close, prev_close)}."""
    if not asset_ids:
        return {}

    subq = (
        select(
            PriceData.asset_id,
            PriceData.close,
            func.row_number().over(
                partition_by=PriceData.asset_id,
                order_by=PriceData.timestamp.desc(),
            ).label("rn"),
        )
        .where(PriceData.asset_id.in_(asset_ids), PriceData.timeframe == "1d")
        .subquery()
    )
    rows = await db.execute(
        select(subq.c.asset_id, subq.c.close, subq.c.rn).where(subq.c.rn <= 2)
    )

    result: dict[UUID, list] = {}
    for row in rows:
        if row.asset_id not in result:
            result[row.asset_id] = [None, None]
        result[row.asset_id][row.rn - 1] = row.close

    return {aid: (closes[0], closes[1]) for aid, closes in result.items()}


def _build_item_response(
    item: WatchlistItem,
    prices: dict[UUID, tuple[float | None, float | None]],
) -> WatchlistItemResponse:
    latest, prev = prices.get(item.asset_id, (None, None))

    change_amount = None
    change_pct = None
    if latest is not None and prev is not None and prev > 0:
        change_amount = latest - prev
        change_pct = change_amount / prev * 100

    return WatchlistItemResponse(
        id=item.id,
        asset=AssetBrief.model_validate(item.asset),
        position=item.position,
        created_at=item.created_at,
        current_price=latest,
        change_amount=change_amount,
        change_percentage=change_pct,
    )


# ── List watchlist ────────────────────────────────────────────────────────────

@watchlist_route.get("", response_model=WatchlistResponse)
async def get_watchlist(
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.user_id == current_user.id)
        .order_by(WatchlistItem.position.asc(), WatchlistItem.created_at.asc())
    )
    items = result.scalars().all()

    asset_ids = [item.asset_id for item in items]
    prices = await _latest_two_prices(db, asset_ids)

    responses = [_build_item_response(item, prices) for item in items]
    return WatchlistResponse(items=responses, total=len(responses))


# ── Add to watchlist ──────────────────────────────────────────────────────────

@watchlist_route.post("", response_model=WatchlistItemResponse, status_code=201)
async def add_to_watchlist(
    payload: WatchlistItemCreate,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    asset_result = await db.execute(select(Asset).where(Asset.id == payload.asset_id))
    if not asset_result.scalar_one_or_none():
        raise AssetNotFound()

    # Determine next position
    pos_result = await db.execute(
        select(func.coalesce(func.max(WatchlistItem.position), -1))
        .where(WatchlistItem.user_id == current_user.id)
    )
    next_pos = pos_result.scalar_one() + 1

    # Silent ignore on duplicate via ON CONFLICT DO NOTHING, then fetch existing
    stmt = (
        pg_insert(WatchlistItem)
        .values(
            user_id=current_user.id,
            asset_id=payload.asset_id,
            position=next_pos,
        )
        .on_conflict_do_nothing(constraint="uq_watchlist_user_asset")
        .returning(WatchlistItem.id)
    )
    insert_result = await db.execute(stmt)
    new_id = insert_result.scalar_one_or_none()
    await db.commit()

    # Fetch the row (whether newly inserted or pre-existing)
    row_result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.user_id == current_user.id,
            WatchlistItem.asset_id == payload.asset_id,
        )
    )
    item = row_result.scalar_one()
    prices = await _latest_two_prices(db, [item.asset_id])
    return _build_item_response(item, prices)


# ── Remove from watchlist ─────────────────────────────────────────────────────

@watchlist_route.delete("/{asset_id}", status_code=204)
async def remove_from_watchlist(
    asset_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.user_id == current_user.id,
            WatchlistItem.asset_id == asset_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise WatchlistItemNotFound()

    await db.delete(item)
    await db.commit()


# ── Reorder ───────────────────────────────────────────────────────────────────

@watchlist_route.patch("/reorder", status_code=200)
async def reorder_watchlist(
    payload: WatchlistReorder,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Batch-update position for each asset_id. Unknown asset_ids are silently ignored."""
    for entry in payload.items:
        await db.execute(
            select(WatchlistItem)
            .where(
                WatchlistItem.user_id == current_user.id,
                WatchlistItem.asset_id == entry.asset_id,
            )
            .with_for_update()
        )
        await db.execute(
            WatchlistItem.__table__.update()
            .where(
                WatchlistItem.user_id == current_user.id,
                WatchlistItem.asset_id == entry.asset_id,
            )
            .values(position=entry.position)
        )

    await db.commit()
    return {"message": "Watchlist reordered."}
