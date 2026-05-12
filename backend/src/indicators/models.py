import uuid

from sqlalchemy import ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.core.base_model import Base


class UserIndicatorSettings(Base):
    __tablename__ = "user_indicator_settings"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_indicator_settings_user_id"),
        Index("ix_user_indicator_settings_user_id", "user_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # JSON structure:
    # {
    #   "RSI":  {"period": 14},
    #   "MACD": {"fast": 12, "slow": 26, "signal": 9},
    #   "SMA":  {"periods": [20, 50]},
    #   "EMA":  {"periods": [9, 21]}
    # }
    settings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
