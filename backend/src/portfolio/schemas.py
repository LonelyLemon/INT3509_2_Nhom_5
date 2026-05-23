from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    description: str | None = None
    is_default: bool = False


class PortfolioUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=256)
    description: str | None = None
    is_default: bool | None = None


class HoldingCreate(BaseModel):
    asset_id: UUID
    quantity: float = Field(..., gt=0)
    notes: str | None = None


class HoldingUpdate(BaseModel):
    quantity: float | None = Field(None, gt=0)
    notes: str | None = None


# ── Response schemas ─────────────────────────────────────────────────────────

class AssetBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ticker: str
    name: str | None
    asset_type: str


class HoldingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    asset: AssetBrief
    quantity: float
    notes: str | None
    created_at: datetime
    updated_at: datetime
    current_price: float | None = None
    current_value: float | None = None
    allocation: float | None = None  # filled in after portfolio total is known


class PortfolioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    is_default: bool
    created_at: datetime
    updated_at: datetime


class PortfolioSummary(BaseModel):
    total_value: float


class PortfolioDetailResponse(PortfolioResponse):
    holdings: list[HoldingResponse]
    summary: PortfolioSummary
