import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from src.price.models import Asset
from src.portfolio.models import Portfolio, Holding


async def resolve_asset_by_ticker(db: AsyncSession, ticker: str) -> Asset | None:
    """Look up an active Asset by ticker symbol (case-insensitive)."""
    result = await db.execute(
        select(Asset).where(Asset.ticker == ticker.upper(), Asset.is_active == True)
    )
    return result.scalar_one_or_none()


async def _resolve_portfolio(
    db: AsyncSession,
    user_id: uuid.UUID,
    portfolio_name: str | None,
) -> Portfolio | None:
    """Return portfolio by name or the user's default portfolio if name is None."""
    if portfolio_name:
        result = await db.execute(
            select(Portfolio).where(
                Portfolio.user_id == user_id,
                Portfolio.name == portfolio_name,
            )
        )
    else:
        result = await db.execute(
            select(Portfolio).where(
                Portfolio.user_id == user_id,
                Portfolio.is_default == True,
            )
        )
    return result.scalar_one_or_none()


async def create_portfolio(
    db: AsyncSession,
    user_id: uuid.UUID,
    name: str,
    description: str | None = None,
) -> dict:
    """Create a new portfolio for the user."""
    portfolio = Portfolio(user_id=user_id, name=name, description=description)
    db.add(portfolio)
    try:
        await db.commit()
        await db.refresh(portfolio)
    except Exception as e:
        await db.rollback()
        return {"error": f"Failed to create portfolio: {str(e)}"}
    return {"success": True, "portfolio_id": str(portfolio.id), "name": portfolio.name}


async def add_holding(
    db: AsyncSession,
    user_id: uuid.UUID,
    ticker: str,
    quantity: float,
    portfolio_name: str | None = None,
    notes: str | None = None,
) -> dict:
    """Add a holding to a portfolio. Uses default portfolio if portfolio_name is None."""
    asset = await resolve_asset_by_ticker(db, ticker)
    if not asset:
        return {"error": f"Ticker '{ticker.upper()}' không tìm thấy trong hệ thống."}

    portfolio = await _resolve_portfolio(db, user_id, portfolio_name)
    if not portfolio:
        if portfolio_name:
            return {"error": f"Portfolio '{portfolio_name}' không tìm thấy."}
        return {"error": "Bạn chưa có portfolio mặc định. Hãy tạo portfolio trước."}

    existing = (
        await db.execute(
            select(Holding).where(
                Holding.portfolio_id == portfolio.id,
                Holding.asset_id == asset.id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.quantity += quantity
        if notes:
            existing.notes = notes
        await db.commit()
        return {
            "success": True,
            "action": "updated",
            "ticker": asset.ticker,
            "new_quantity": existing.quantity,
            "portfolio": portfolio.name,
        }

    holding = Holding(
        portfolio_id=portfolio.id,
        asset_id=asset.id,
        quantity=quantity,
        notes=notes,
    )
    db.add(holding)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return {"error": f"'{ticker.upper()}' đã tồn tại trong portfolio này."}

    return {
        "success": True,
        "action": "added",
        "ticker": asset.ticker,
        "quantity": quantity,
        "portfolio": portfolio.name,
    }


async def update_holding(
    db: AsyncSession,
    user_id: uuid.UUID,
    ticker: str,
    quantity: float,
    portfolio_name: str | None = None,
    notes: str | None = None,
) -> dict:
    """Update quantity/notes of an existing holding."""
    asset = await resolve_asset_by_ticker(db, ticker)
    if not asset:
        return {"error": f"Ticker '{ticker.upper()}' không tìm thấy."}

    portfolio = await _resolve_portfolio(db, user_id, portfolio_name)
    if not portfolio:
        return {"error": "Portfolio không tìm thấy."}

    holding = (
        await db.execute(
            select(Holding).where(
                Holding.portfolio_id == portfolio.id,
                Holding.asset_id == asset.id,
            )
        )
    ).scalar_one_or_none()

    if not holding:
        return {"error": f"'{ticker.upper()}' không có trong portfolio '{portfolio.name}'."}

    holding.quantity = quantity
    if notes is not None:
        holding.notes = notes
    await db.commit()

    return {
        "success": True,
        "ticker": asset.ticker,
        "quantity": holding.quantity,
        "portfolio": portfolio.name,
    }


async def remove_holding(
    db: AsyncSession,
    user_id: uuid.UUID,
    ticker: str,
    portfolio_name: str | None = None,
) -> dict:
    """Remove a holding from a portfolio."""
    asset = await resolve_asset_by_ticker(db, ticker)
    if not asset:
        return {"error": f"Ticker '{ticker.upper()}' không tìm thấy."}

    portfolio = await _resolve_portfolio(db, user_id, portfolio_name)
    if not portfolio:
        return {"error": "Portfolio không tìm thấy."}

    holding = (
        await db.execute(
            select(Holding).where(
                Holding.portfolio_id == portfolio.id,
                Holding.asset_id == asset.id,
            )
        )
    ).scalar_one_or_none()

    if not holding:
        return {"error": f"'{ticker.upper()}' không có trong portfolio '{portfolio.name}'."}

    await db.delete(holding)
    await db.commit()

    return {
        "success": True,
        "ticker": asset.ticker,
        "portfolio": portfolio.name,
        "message": f"Đã xóa {ticker.upper()} khỏi portfolio '{portfolio.name}'.",
    }
