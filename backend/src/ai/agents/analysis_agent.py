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
def get_analysis_agent() -> Agent:
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
Bạn là chuyên gia phân tích thị trường tài chính của FinAI. Nhiệm vụ của bạn là phân tích
dữ liệu thị trường chuyên sâu và cung cấp góc nhìn đầu tư khách quan, có căn cứ.

## Nguyên tắc phân tích
- **Luôn lấy dữ liệu thực trước khi phân tích.** Không bịa số liệu.
- Khi phân tích một ticker: luôn gọi tool_get_latest_price VÀ tool_calculate_technical_indicators.
  Bổ sung tool_get_news và tool_get_market_sentiment để đánh giá sentiment.
- Khi so sánh nhiều tickers: dùng tool_compare_assets (một lần cho tất cả).
- Khi user hỏi về portfolio: gọi tool_get_portfolio_summary.
- Khi user hỏi về watchlist: gọi tool_get_watchlist.

## Cấu trúc phân tích (cho mỗi ticker)
1. **Tổng quan giá** — giá hiện tại, xu hướng ngắn hạn (tăng/giảm/đi ngang)
2. **Phân tích kỹ thuật** — RSI, MACD, SMA, Bollinger Bands + diễn giải tín hiệu
3. **Sentiment & tin tức** — tóm tắt tin tức gần đây, tâm lý thị trường
4. **Kết luận** — tín hiệu tổng hợp (bullish/bearish/neutral) và lý do

## Phạm vi và giới hạn
- Trả lời bằng ngôn ngữ người dùng (tiếng Việt hoặc tiếng Anh).
- Chỉ phân tích tài chính và thị trường. Từ chối câu hỏi ngoài chủ đề lịch sự.
- **Không** đưa ra lời khuyên cụ thể về thời điểm hoặc số tiền mua/bán.
- **Về portfolio:** FinAI không lưu giá mua hay lịch sử giao dịch. Nếu user hỏi về lãi/lỗ (P&L),
  giải thích rõ ứng dụng chỉ theo dõi holdings và giá trị hiện tại theo thời gian thực,
  không hỗ trợ giao dịch trực tiếp nên không tính được P&L.
- Khi phân tích portfolio: tập trung vào cơ cấu tài sản, phân bổ, và giá trị hiện tại.
  Bổ sung phân tích ngắn về triển vọng từng tài sản trong danh mục nếu phù hợp.
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
    async def tool_calculate_technical_indicators(
        ctx: RunContext[AgentDeps],
        ticker: str,
    ) -> dict:
        """
        Calculate technical indicators for a ticker: RSI(14), MACD(12,26,9),
        SMA(20), SMA(50), and Bollinger Bands(20,2) with plain-language interpretations.
        Always use this when performing technical analysis.
        """
        return await calculate_technical_indicators(ctx.deps.db, ticker)

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
    async def tool_compare_assets(
        ctx: RunContext[AgentDeps],
        tickers: list[str],
    ) -> dict:
        """
        Compare multiple assets side-by-side: latest price + key technical indicators.
        Use this for 'so sánh SSI và HCM', 'compare BTC and ETH' type questions.
        Pass all tickers at once — do not call tool_get_latest_price separately for each.
        """
        return await compare_assets(ctx.deps.db, tickers)

    @agent.tool
    async def tool_get_portfolio_summary(ctx: RunContext[AgentDeps]) -> dict:
        """
        Fetch the user's portfolio holdings with current market values and allocation percentages.
        Note: The app does not store purchase price or transactions, so P&L cannot be calculated.
        Use when user asks about their portfolio, holdings, or asset allocation.
        """
        return await get_portfolio_summary(ctx.deps.db, ctx.deps.user_id)

    @agent.tool
    async def tool_get_watchlist(ctx: RunContext[AgentDeps]) -> dict:
        """
        Fetch the user's watchlist with current prices and price changes.
        Use when user asks about their watchlist or which stocks they are tracking.
        """
        return await get_watchlist(ctx.deps.db, ctx.deps.user_id)

    @agent.tool
    async def tool_get_market_sentiment(
        ctx: RunContext[AgentDeps],
        ticker: str,
        days_back: int = 30,
    ) -> dict:
        """
        Aggregate news sentiment for a ticker over the past `days_back` days.
        Returns sentiment distribution (bullish/bearish/neutral counts), average score,
        overall sentiment, and recent trend (improving/worsening/stable).
        Use this to assess the news-driven sentiment backdrop for a ticker.
        """
        return await get_market_sentiment(ctx.deps.db, ticker, days_back)

    return agent
