import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.portfolio.models import Portfolio, Holding
from src.price.models import Asset, PriceData


async def get_portfolio_summary(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """
    Fetch user's portfolio holdings with current market values.
    Note: The app does not store purchase price or transaction history,
    so P&L cannot be calculated. Only current value is provided.
    """
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.user_id == user_id)
        .options(
            selectinload(Portfolio.holdings).selectinload(Holding.asset)
        )
        .order_by(Portfolio.is_default.desc(), Portfolio.created_at)
    )
    portfolios = result.scalars().all()

    if not portfolios:
        return {
            "portfolios": [],
            "total_portfolio_value": 0.0,
            "message": "Bạn chưa có danh mục đầu tư nào. Vào trang /portfolio để tạo danh mục và thêm tài sản.",
            "note": "Ứng dụng không lưu giá mua/lịch sử giao dịch, không tính được P&L.",
        }

    portfolio_summaries = []
    grand_total = 0.0

    for portfolio in portfolios:
        if not portfolio.holdings:
            portfolio_summaries.append({
                "name": portfolio.name,
                "description": portfolio.description,
                "is_default": portfolio.is_default,
                "holdings": [],
                "total_value": 0.0,
            })
            continue

        holdings_data = []
        portfolio_total = 0.0

        for holding in portfolio.holdings:
            asset = holding.asset
            if not asset:
                continue

            # Get latest price for this asset
            price_row = (
                await db.execute(
                    select(PriceData)
                    .where(
                        PriceData.asset_id == asset.id,
                        PriceData.timeframe == "1m",
                    )
                    .order_by(PriceData.timestamp.desc())
                    .limit(1)
                )
            ).scalar_one_or_none()

            current_price = price_row.close if price_row else None
            current_value = (holding.quantity * current_price) if current_price else None

            if current_value:
                portfolio_total += current_value

            holdings_data.append({
                "ticker": asset.ticker,
                "name": asset.name or asset.ticker,
                "asset_type": asset.asset_type.value if asset.asset_type else "unknown",
                "quantity": holding.quantity,
                "current_price": round(current_price, 4) if current_price else None,
                "current_value": round(current_value, 2) if current_value else None,
            })

        # Calculate allocation percentages
        if portfolio_total > 0:
            for h in holdings_data:
                if h["current_value"] is not None:
                    h["allocation_pct"] = round(h["current_value"] / portfolio_total * 100, 2)
                else:
                    h["allocation_pct"] = None

        grand_total += portfolio_total
        portfolio_summaries.append({
            "name": portfolio.name,
            "description": portfolio.description,
            "is_default": portfolio.is_default,
            "holdings": holdings_data,
            "total_value": round(portfolio_total, 2),
        })

    return {
        "portfolios": portfolio_summaries,
        "total_portfolio_value": round(grand_total, 2),
        "note": "Ứng dụng không lưu giá mua/lịch sử giao dịch, không tính được P&L.",
    }
