from functools import lru_cache
from typing import Literal

from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from src.core.config import settings


class IntentResult(BaseModel):
    intent: Literal["app_guide", "market_data", "market_analysis", "general"]
    tickers: list[str]
    language: Literal["vi", "en"]


@lru_cache(maxsize=1)
def get_intent_agent() -> Agent:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model = GoogleModel(
        settings.GEMINI_MODEL,
        provider=GoogleProvider(api_key=settings.GEMINI_API_KEY),
    )
    return Agent(
        model=model,
        output_type=IntentResult,
        system_prompt="""
You are an intent classifier for a financial market application called FinAI.
Classify the user's message into exactly one of these intents and extract any ticker symbols mentioned.

## Intent definitions

- **app_guide**: User asks how to use the application, its features, navigation, or what the app can do.
  Examples: "How do I add to watchlist?", "Cách sử dụng watchlist?", "App có những tính năng gì?"

- **market_data**: User asks for simple data lookups — current price, price history, news for a ticker.
  Examples: "VNM giá bao nhiêu?", "Giá BTC hiện tại", "Tin tức về SSI", "Lịch sử giá HPG"

- **market_analysis**: User asks for technical analysis, ticker comparisons, investment outlook,
  market trends, or info about their own portfolio/watchlist.
  Examples: "Phân tích kỹ thuật VNM", "So sánh SSI và HCM", "Xu hướng thị trường",
  "Portfolio của tôi gồm gì?", "Danh sách watchlist", "Thị trường hôm nay thế nào?"

- **general**: Greetings, unclear, or off-topic messages.
  Examples: "Xin chào", "Bạn là ai?", "Bạn có thể làm gì?"

## Ticker extraction
Extract uppercase ticker symbols (e.g. VNM, SSI, BTC, AAPL). Return [] if none found.

## Language
Return "vi" for Vietnamese, "en" for English.
""",
    )
