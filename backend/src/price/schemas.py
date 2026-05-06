from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

from src.price.constants import AssetType

# --- ASSET SCHEMAS ---

class AssetBase(BaseModel):
    ticker: str = Field(..., description="The unique ticker symbol of the asset (e.g., AAPL)")
    name: str | None = Field(None, description="The full name of the company or asset")
    asset_type: AssetType = Field(..., description="The category of the asset")
    is_active: bool = Field(True, description="Whether the asset is actively being tracked by the scheduler")

class AssetCreate(AssetBase):
    """Schema used when an admin adds a new ticker to be tracked."""
    pass

class AssetResponse(AssetBase):
    """Schema used when returning asset details to the client."""
    id: UUID

    model_config = {
        "from_attributes": True
    }

# --- PRICE DATA SCHEMAS ---

class PriceDataResponse(BaseModel):
    """Schema representing a single OHLCV candlestick."""
    timestamp: datetime = Field(..., description="The closing timestamp of the timeframe")
    open: float
    high: float
    low: float
    close: float
    adj_close: float | None = Field(None, description="Adjusted close price (typically null for intraday)")
    volume: float

    model_config = {
        "from_attributes": True
    }

class PriceHistoryResponse(BaseModel):
    """Schema for returning a full historical chart dataset to the frontend or AI agent."""
    ticker: str = Field(..., description="The requested ticker symbol")
    timeframe: str = Field(..., description="The requested timeframe (e.g., 1d, 15m)")
    data: list[PriceDataResponse] = Field(..., description="Chronological list of price points")


class AssetUpdate(BaseModel):
    """Fields the admin may update on a tracked ticker."""
    name: str | None = Field(None, description="Display name")
    asset_type: AssetType | None = Field(None, description="Asset category")
    is_active: bool | None = Field(None, description="Whether this ticker is actively ingested")


class LatestPriceResponse(BaseModel):
    """Most recent OHLCV candle — for live price display."""
    ticker: str
    has_data: bool = Field(True, description="False when the ticker exists but has no ingested price data yet")
    timestamp: datetime | None = None
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: float | None = None
    change_amount: float | None = Field(None, description="Price change vs previous close")
    change_percentage: float | None = Field(None, description="Percentage change vs previous close")

    model_config = {"from_attributes": True}