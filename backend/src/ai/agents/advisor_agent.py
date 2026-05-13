from functools import lru_cache

from pydantic_ai import Agent, RunContext
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from src.core.config import settings
from src.ai.tools.price_tools import get_latest_price, get_price_history
from src.ai.tools.indicator_tools import calculate_technical_indicators
from src.ai.tools.news_tools import get_news_for_ticker
from src.ai.tools.market_tools import compare_assets, get_market_sentiment
from src.ai.tools.portfolio_tools import get_portfolio_summary
from src.ai.tools.watchlist_tools import get_watchlist


@lru_cache(maxsize=1)
def get_advisor_agent() -> Agent:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model = GoogleModel(
        settings.GEMINI_MODEL,
        provider=GoogleProvider(api_key=settings.GEMINI_API_KEY),
    )

    from src.ai.agent import AgentDeps

    agent: Agent[AgentDeps, str] = Agent(
        model=model,
        deps_type=AgentDeps,
        system_prompt="""
Bạn là chuyên gia tư vấn tài chính của FinAI. Nhiệm vụ của bạn là đưa ra phân tích đầu tư
khách quan, có căn cứ dữ liệu thực và lời khuyên có giá trị tham khảo cho nhà đầu tư.

## Quy trình tư vấn bắt buộc

Khi tư vấn về một ticker cụ thể, luôn thực hiện theo thứ tự:
1. Gọi tool_get_latest_price → lấy giá hiện tại
2. Gọi tool_calculate_technical_indicators → phân tích kỹ thuật
3. Gọi tool_get_news → cập nhật tin tức gần đây
4. Gọi tool_get_market_sentiment → đánh giá tâm lý thị trường

Khi so sánh nhiều tickers: dùng tool_compare_assets (một lần, tất cả tickers cùng lúc).
Khi tư vấn về danh mục hoặc user hỏi danh mục gồm gì: BẮT BUỘC gọi tool_get_portfolio_summary ngay lập tức. KHÔNG hướng dẫn user điều hướng đến trang Portfolio.
Khi tư vấn về watchlist hoặc user hỏi watchlist gồm gì: BẮT BUỘC gọi tool_get_watchlist ngay lập tức. KHÔNG hướng dẫn user điều hướng đến trang Watchlist.

## Cấu trúc phân tích tư vấn

### 1. Tổng quan kỹ thuật
- Giá hiện tại, xu hướng ngắn hạn và trung hạn
- Tín hiệu từ RSI, MACD, SMA, Bollinger Bands
- Các mức hỗ trợ/kháng cự quan trọng

### 2. Phân tích Sentiment
- Tóm tắt tin tức quan trọng gần đây
- Tâm lý thị trường (bullish / bearish / mixed)
- Các yếu tố catalyst tiềm năng

### 3. Đánh giá rủi ro
- **Ngắn hạn (1-4 tuần):** rủi ro kỹ thuật, biến động giá
- **Trung hạn (1-3 tháng):** rủi ro tin tức, xu hướng ngành
- **Mức độ tổng thể:** Thấp / Trung bình / Cao (kèm lý do)

### 4. Outlook & Điểm tham khảo
- Outlook tổng hợp: **Bullish / Bearish / Neutral**
- Vùng giá vào tham khảo (nếu xu hướng tích cực)
- Mức cắt lỗ tham khảo (stop-loss zone)
- Mục tiêu giá ngắn hạn tham khảo

### 5. Disclaimer
Luôn kết thúc bằng: *"⚠️ Thông tin trên chỉ mang tính tham khảo, không phải lời khuyên đầu tư
chính thức. Quyết định đầu tư cuối cùng thuộc về nhà đầu tư. FinAI không chịu trách nhiệm
về bất kỳ tổn thất nào phát sinh từ việc sử dụng thông tin này."*

## Nguyên tắc

- **Không bịa số liệu.** Chỉ dùng dữ liệu từ tools.
- Không khuyên số tiền đầu tư cụ thể.
- Trả lời bằng ngôn ngữ user đang dùng (tiếng Việt hoặc tiếng Anh).
- Chỉ phân tích trong phạm vi tài chính và thị trường.
- Nếu không đủ dữ liệu để tư vấn, nói rõ lý do thay vì đưa ra kết luận không có căn cứ.
""",
    )

    @agent.tool
    async def tool_get_latest_price(ctx: RunContext[AgentDeps], ticker: str) -> dict:
        """Get the most recent price for a financial asset by ticker symbol."""
        return await get_latest_price(ctx.deps.db, ticker)

    @agent.tool
    async def tool_get_price_history(
        ctx: RunContext[AgentDeps],
        ticker: str,
        timeframe: str = "1d",
        limit: int = 30,
    ) -> dict:
        """Get OHLCV candlestick history for a ticker. Supported timeframes: 1m, 5m, 15m, 30m, 1h, 4h, 1d."""
        return await get_price_history(ctx.deps.db, ticker, timeframe, limit)

    @agent.tool
    async def tool_calculate_technical_indicators(
        ctx: RunContext[AgentDeps],
        ticker: str,
    ) -> dict:
        """
        Calculate technical indicators (RSI, MACD, SMA, EMA) using the user's saved settings.
        Always call this when advising on a ticker.
        """
        return await calculate_technical_indicators(ctx.deps.db, ticker, ctx.deps.user_id)

    @agent.tool
    async def tool_get_news(
        ctx: RunContext[AgentDeps],
        ticker: str,
        days_back: int = 14,
    ) -> dict:
        """Fetch recent news articles related to a specific ticker."""
        return await get_news_for_ticker(ctx.deps.db, ticker, days_back)

    @agent.tool
    async def tool_get_market_sentiment(
        ctx: RunContext[AgentDeps],
        ticker: str,
        days_back: int = 30,
    ) -> dict:
        """
        Aggregate news sentiment for a ticker over the past `days_back` days.
        Returns bullish/bearish/neutral distribution and trend.
        """
        return await get_market_sentiment(ctx.deps.db, ticker, days_back)

    @agent.tool
    async def tool_compare_assets(
        ctx: RunContext[AgentDeps],
        tickers: list[str],
    ) -> dict:
        """
        Compare multiple assets side-by-side: latest price + key technical indicators.
        Use for 'compare X and Y' or portfolio comparison questions.
        """
        return await compare_assets(ctx.deps.db, tickers)

    @agent.tool
    async def tool_get_portfolio_summary(ctx: RunContext[AgentDeps]) -> dict:
        """Fetch the user's portfolio holdings with current market values and allocation percentages."""
        return await get_portfolio_summary(ctx.deps.db, ctx.deps.user_id)

    @agent.tool
    async def tool_get_watchlist(ctx: RunContext[AgentDeps]) -> dict:
        """Fetch the user's watchlist with current prices and price changes."""
        return await get_watchlist(ctx.deps.db, ctx.deps.user_id)

    return agent
