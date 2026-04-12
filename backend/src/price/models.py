import uuid
from datetime import datetime

from sqlalchemy import (String, Float, TIMESTAMP, Boolean, 
                        ForeignKey, UniqueConstraint, Index, Enum)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base_model import Base
from src.price.constants import AssetType


class Asset(Base):
    __tablename__ = "assets"

    ticker: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    
    asset_type: Mapped[AssetType] = mapped_column(Enum(AssetType, native_enum=False), nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    price_data: Mapped[list["PriceData"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan", lazy="noload"
    )


class PriceData(Base):
    __tablename__ = "price_data"
    __table_args__ = (
        UniqueConstraint("asset_id", "timestamp", "timeframe", name="uq_asset_time_frame"),
        Index("ix_price_data_asset_time", "asset_id", "timestamp", postgresql_using="btree"),
    )

    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(10), nullable=False)
    
    open: Mapped[float] = mapped_column(Float, nullable=False)
    high: Mapped[float] = mapped_column(Float, nullable=False)
    low: Mapped[float] = mapped_column(Float, nullable=False)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    adj_close: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    volume: Mapped[float] = mapped_column(Float, nullable=False) 

    # Relationships
    asset: Mapped["Asset"] = relationship(back_populates="price_data")