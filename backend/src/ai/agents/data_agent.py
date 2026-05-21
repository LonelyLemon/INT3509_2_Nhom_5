from functools import lru_cache

from pydantic_ai import Agent, RunContext

from src.ai.model_factory import make_model
from src.ai.tools.price_tools import get_latest_price, get_price_history
from src.ai.tools.indicator_tools import calculate_technical_indicators
from src.ai.tools.news_tools import get_news_for_ticker
from src.ai.tools.market_tools import list_assets, get_general_news


@lru_cache(maxsize=1)
def get_data_agent() -> Agent:
    from src.ai.agent import AgentDeps

    agent: Agent[AgentDeps, str] = Agent(
        model=make_model(),
        deps_type=AgentDeps,
        system_prompt="""
Bạn là trợ lý dữ liệu thị trường tài chính. Nhiệm vụ của bạn là tra cứu và trình bày
dữ liệu thị trường một cách chính xác và dễ hiểu.

## Nguyên tắc
- Luôn dùng tools để lấy dữ liệu thực. Không bịa số liệu.
- Trả lời bằng ngôn ngữ người dùng đang dùng (tiếng Việt hoặc tiếng Anh).
- Trình bày rõ ràng: giá, thay đổi, khối lượng, thời gian.
- Nếu ticker không tồn tại trong hệ thống, gợi ý dùng tool_list_assets để xem danh sách có sẵn.
- Giữ câu trả lời súc tích, tập trung vào dữ liệu được hỏi.

## Phạm vi
- Giá hiện tại, lịch sử giá, tin tức theo mã
- Danh sách tài sản có trong hệ thống
- Tin tức thị trường chung
- Không phân tích sâu hoặc tư vấn đầu tư (đó là nhiệm vụ của trợ lý phân tích)
""",
    )

    @agent.tool
    async def tool_get_latest_price(ctx: RunContext[AgentDeps], ticker: str) -> dict:
        """
        Get the most recent price for a financial asset by ticker symbol.
        Returns current price, OHLC, volume, and change vs previous candle.
        """
        return await get_latest_price(ctx.deps.db, ticker)

    @agent.tool
    async def tool_get_price_history(
        ctx: RunContext[AgentDeps],
        ticker: str,
        timeframe: str = "1d",
        limit: int = 30,
    ) -> dict:
        """
        Get OHLCV candlestick history for a ticker.
        Supported timeframes: 1m, 5m, 15m, 30m, 1h, 4h, 1d.
        """
        return await get_price_history(ctx.deps.db, ticker, timeframe, limit)

    @agent.tool
    async def tool_get_news(
        ctx: RunContext[AgentDeps],
        ticker: str,
        days_back: int = 7,
    ) -> dict:
        """
        Fetch recent news articles related to a specific ticker.
        Returns titles, summaries, sentiment, and publication times.
        """
        return await get_news_for_ticker(ctx.deps.db, ticker, days_back)

    @agent.tool
    async def tool_list_assets(ctx: RunContext[AgentDeps]) -> dict:
        """
        List all active tickers available in the system, grouped by asset type.
        Use this when user asks what tickers/assets are supported, or when a ticker is not found.
        """
        return await list_assets(ctx.deps.db)

    @agent.tool
    async def tool_get_general_news(
        ctx: RunContext[AgentDeps],
        days_back: int = 7,
        limit: int = 15,
        category: str | None = None,
        sentiment: str | None = None,
    ) -> dict:
        """
        Fetch recent general market news not filtered by a specific ticker.
        Optional: category (e.g. 'macro', 'stocks', 'crypto'), sentiment ('BULLISH', 'BEARISH', 'NEUTRAL').
        Use for questions like 'tin tức thị trường hôm nay', 'crypto news this week'.
        """
        return await get_general_news(ctx.deps.db, days_back, limit, category, sentiment)

    return agent
