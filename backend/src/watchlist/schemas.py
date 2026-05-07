from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from src.portfolio.schemas import AssetBrief


class WatchlistItemCreate(BaseModel):
    asset_id: UUID


class WatchlistReorderEntry(BaseModel):
    asset_id: UUID
    position: int


class WatchlistReorder(BaseModel):
    items: list[WatchlistReorderEntry]


class WatchlistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    asset: AssetBrief
    position: int
    created_at: datetime
    # Price snapshot — None when no price data available
    current_price: float | None = None
    change_amount: float | None = None
    change_percentage: float | None = None


class WatchlistResponse(BaseModel):
    items: list[WatchlistItemResponse]
    total: int
