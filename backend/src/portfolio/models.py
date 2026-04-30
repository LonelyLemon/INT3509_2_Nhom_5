import uuid

from sqlalchemy import String, Float, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base_model import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    holdings: Mapped[list["Holding"]] = relationship(
        back_populates="portfolio", cascade="all, delete-orphan", lazy="selectin"
    )


class Holding(Base):
    __tablename__ = "holdings"
    __table_args__ = (
        UniqueConstraint("portfolio_id", "asset_id", name="uq_holding_portfolio_asset"),
    )

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    avg_buy_price: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    portfolio: Mapped["Portfolio"] = relationship(back_populates="holdings")
    asset: Mapped["Asset"] = relationship(lazy="selectin")
