import uuid
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select, update, func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.core.database import SessionDep
from src.portfolio.models import Portfolio, Holding
from src.portfolio.schemas import (
    PortfolioCreate,
    PortfolioUpdate,
    HoldingCreate,
    HoldingUpdate,
    PortfolioResponse,
    PortfolioDetailResponse,
    HoldingResponse,
    PortfolioSummary,
    AssetBrief,
)
from src.portfolio.exceptions import PortfolioNotFound, HoldingNotFound, HoldingAlreadyExists
from src.price.exceptions import AssetNotFound
from src.price.models import Asset, PriceData

portfolio_route = APIRouter(
    prefix="/portfolio",
    tags=["Portfolio"],
)


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_portfolio_or_404(db: SessionDep, portfolio_id: UUID, user_id: UUID) -> Portfolio:
    result = await db.execute(
        select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.user_id == user_id)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise PortfolioNotFound()
    return portfolio


async def _latest_prices(db: SessionDep, asset_ids: list[UUID]) -> dict[UUID, float]:
    """Return {asset_id: latest_close} using DISTINCT ON for each asset."""
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
    rows = await db.execute(select(subq.c.asset_id, subq.c.close).where(subq.c.rn == 1))
    return {row.asset_id: row.close for row in rows}


async def _latest_two_prices(db: SessionDep, asset_ids: list[UUID]) -> dict[UUID, list[float]]:
    """Return {asset_id: [latest_close, prev_close]} (list may have 1 element if only one row)."""
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

    result: dict[UUID, list[float]] = {}
    for row in rows:
        result.setdefault(row.asset_id, [None, None])
        result[row.asset_id][row.rn - 1] = row.close
    return result


def _build_holding_response(
    holding: Holding,
    prices: dict[UUID, float],
    total_portfolio_value: float | None,
) -> HoldingResponse:
    current_price = prices.get(holding.asset_id)
    cost_basis = holding.quantity * holding.avg_buy_price

    current_value = holding.quantity * current_price if current_price is not None else None
    pl_amount = (current_value - cost_basis) if current_value is not None else None
    pl_percentage = (pl_amount / cost_basis * 100) if (pl_amount is not None and cost_basis > 0) else None
    allocation = (
        (current_value / total_portfolio_value * 100)
        if (current_value is not None and total_portfolio_value and total_portfolio_value > 0)
        else None
    )

    return HoldingResponse(
        id=holding.id,
        asset=AssetBrief.model_validate(holding.asset),
        quantity=holding.quantity,
        avg_buy_price=holding.avg_buy_price,
        notes=holding.notes,
        created_at=holding.created_at,
        updated_at=holding.updated_at,
        current_price=current_price,
        current_value=current_value,
        cost_basis=cost_basis,
        pl_amount=pl_amount,
        pl_percentage=pl_percentage,
        allocation=allocation,
    )


# ── List portfolios ───────────────────────────────────────────────────────────

@portfolio_route.get("", response_model=list[PortfolioResponse])
async def list_portfolios(
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == current_user.id)
    )
    return result.scalars().all()


# ── Create portfolio ──────────────────────────────────────────────────────────

@portfolio_route.post("", response_model=PortfolioResponse, status_code=201)
async def create_portfolio(
    payload: PortfolioCreate,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    if payload.is_default:
        await db.execute(
            update(Portfolio)
            .where(Portfolio.user_id == current_user.id)
            .values(is_default=False)
        )

    portfolio = Portfolio(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        is_default=payload.is_default,
    )
    db.add(portfolio)
    await db.commit()
    await db.refresh(portfolio)
    return portfolio


# ── Get portfolio detail ──────────────────────────────────────────────────────

@portfolio_route.get("/{portfolio_id}", response_model=PortfolioDetailResponse)
async def get_portfolio(
    portfolio_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    portfolio = await _get_portfolio_or_404(db, portfolio_id, current_user.id)

    asset_ids = [h.asset_id for h in portfolio.holdings]
    prices = await _latest_prices(db, asset_ids)

    holding_values = [
        h.quantity * prices[h.asset_id]
        for h in portfolio.holdings
        if h.asset_id in prices
    ]
    total_value = sum(holding_values)

    holding_responses = [
        _build_holding_response(h, prices, total_value)
        for h in portfolio.holdings
    ]

    total_cost = sum(h.quantity * h.avg_buy_price for h in portfolio.holdings)
    total_pl_amount = total_value - total_cost
    total_pl_pct = (total_pl_amount / total_cost * 100) if total_cost > 0 else None

    return PortfolioDetailResponse(
        id=portfolio.id,
        name=portfolio.name,
        description=portfolio.description,
        is_default=portfolio.is_default,
        created_at=portfolio.created_at,
        updated_at=portfolio.updated_at,
        holdings=holding_responses,
        summary=PortfolioSummary(
            total_value=total_value,
            total_cost=total_cost,
            total_pl_amount=total_pl_amount,
            total_pl_percentage=total_pl_pct,
        ),
    )


# ── Update portfolio ──────────────────────────────────────────────────────────

@portfolio_route.patch("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: UUID,
    payload: PortfolioUpdate,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    portfolio = await _get_portfolio_or_404(db, portfolio_id, current_user.id)

    if payload.is_default is True:
        await db.execute(
            update(Portfolio)
            .where(Portfolio.user_id == current_user.id, Portfolio.id != portfolio_id)
            .values(is_default=False)
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(portfolio, field, value)

    await db.commit()
    await db.refresh(portfolio)
    return portfolio


# ── Delete portfolio ──────────────────────────────────────────────────────────

@portfolio_route.delete("/{portfolio_id}", status_code=204)
async def delete_portfolio(
    portfolio_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    portfolio = await _get_portfolio_or_404(db, portfolio_id, current_user.id)

    was_default = portfolio.is_default
    await db.delete(portfolio)
    await db.flush()

    if was_default:
        next_result = await db.execute(
            select(Portfolio)
            .where(Portfolio.user_id == current_user.id)
            .order_by(Portfolio.created_at.asc())
            .limit(1)
        )
        next_portfolio = next_result.scalar_one_or_none()
        if next_portfolio:
            next_portfolio.is_default = True

    await db.commit()


# ── Add holding ───────────────────────────────────────────────────────────────

@portfolio_route.post("/{portfolio_id}/holdings", response_model=HoldingResponse, status_code=201)
async def add_holding(
    portfolio_id: UUID,
    payload: HoldingCreate,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    await _get_portfolio_or_404(db, portfolio_id, current_user.id)

    asset_result = await db.execute(select(Asset).where(Asset.id == payload.asset_id))
    if not asset_result.scalar_one_or_none():
        raise AssetNotFound()

    existing = await db.execute(
        select(Holding).where(
            Holding.portfolio_id == portfolio_id,
            Holding.asset_id == payload.asset_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HoldingAlreadyExists()

    holding = Holding(
        portfolio_id=portfolio_id,
        asset_id=payload.asset_id,
        quantity=payload.quantity,
        avg_buy_price=payload.avg_buy_price,
        notes=payload.notes,
    )
    db.add(holding)
    await db.commit()
    await db.refresh(holding)

    prices = await _latest_prices(db, [holding.asset_id])
    return _build_holding_response(holding, prices, total_portfolio_value=None)


# ── Update holding ────────────────────────────────────────────────────────────

@portfolio_route.patch("/{portfolio_id}/holdings/{holding_id}", response_model=HoldingResponse)
async def update_holding(
    portfolio_id: UUID,
    holding_id: UUID,
    payload: HoldingUpdate,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    await _get_portfolio_or_404(db, portfolio_id, current_user.id)

    result = await db.execute(
        select(Holding).where(Holding.id == holding_id, Holding.portfolio_id == portfolio_id)
    )
    holding = result.scalar_one_or_none()
    if not holding:
        raise HoldingNotFound()

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(holding, field, value)

    await db.commit()
    await db.refresh(holding)

    prices = await _latest_prices(db, [holding.asset_id])
    return _build_holding_response(holding, prices, total_portfolio_value=None)


# ── Delete holding ────────────────────────────────────────────────────────────

@portfolio_route.delete("/{portfolio_id}/holdings/{holding_id}", status_code=204)
async def delete_holding(
    portfolio_id: UUID,
    holding_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    await _get_portfolio_or_404(db, portfolio_id, current_user.id)

    result = await db.execute(
        select(Holding).where(Holding.id == holding_id, Holding.portfolio_id == portfolio_id)
    )
    holding = result.scalar_one_or_none()
    if not holding:
        raise HoldingNotFound()

    await db.delete(holding)
    await db.commit()
