from pydantic import BaseModel, Field


# ── Settings ──────────────────────────────────────────────────────────────────

class RSIParams(BaseModel):
    period: int = Field(default=14, ge=2, le=100)

class MACDParams(BaseModel):
    fast: int = Field(default=12, ge=2, le=100)
    slow: int = Field(default=26, ge=2, le=200)
    signal: int = Field(default=9, ge=2, le=50)

class SMAParams(BaseModel):
    periods: list[int] = Field(default=[20, 50])

class EMAParams(BaseModel):
    periods: list[int] = Field(default=[9, 21])

class IndicatorSettingsBody(BaseModel):
    RSI: RSIParams = RSIParams()
    MACD: MACDParams = MACDParams()
    SMA: SMAParams = SMAParams()
    EMA: EMAParams = EMAParams()

class IndicatorSettingsResponse(BaseModel):
    settings: IndicatorSettingsBody

class IndicatorSettingsUpdate(BaseModel):
    RSI: RSIParams | None = None
    MACD: MACDParams | None = None
    SMA: SMAParams | None = None
    EMA: EMAParams | None = None


# ── Computed data ─────────────────────────────────────────────────────────────

class RSIResult(BaseModel):
    value: float | None
    interpretation: str

class MACDResult(BaseModel):
    macd_line: float | None
    signal_line: float | None
    histogram: float | None
    interpretation: str

class MovingAveragePoint(BaseModel):
    period: int
    value: float | None
    vs_price: float | None
    interpretation: str

class BollingerBandsResult(BaseModel):
    upper: float | None
    middle: float | None
    lower: float | None
    bandwidth: float | None
    interpretation: str

class IndicatorDataResponse(BaseModel):
    ticker: str
    timeframe: str
    current_price: float | None
    candles_used: int
    RSI: RSIResult | None = None
    MACD: MACDResult | None = None
    SMA: list[MovingAveragePoint] = []
    EMA: list[MovingAveragePoint] = []
