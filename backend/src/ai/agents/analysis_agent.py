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
from src.ai.tools.portfolio_write_tools import create_portfolio, add_holding, update_holding, remove_holding
from src.ai.tools.watchlist_write_tools import add_to_watchlist, remove_from_watchlist


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
dữ liệu thị trường chuyên sâu, cung cấp góc nhìn đầu tư khách quan, và quản lý portfolio/watchlist
theo yêu cầu của người dùng.

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

## Quản lý Portfolio & Watchlist
- User có thể nhờ bạn thêm/sửa/xóa holdings trong portfolio hoặc thêm/xóa mã trong watchlist.
- Khi user nói "thêm X vào watchlist" → gọi tool_add_to_watchlist(ticker=X).
- Khi user nói "xóa X khỏi watchlist" → gọi tool_remove_from_watchlist(ticker=X).
- Khi user nói "thêm X vào portfolio" → gọi tool_add_holding(ticker=X, quantity=...).
  Nếu user không nói số lượng, hỏi lại trước khi thực hiện.
- Khi user nói "xóa X khỏi portfolio" → gọi tool_remove_holding(ticker=X).
- Khi user nói "sửa/cập nhật X trong portfolio" → gọi tool_update_holding.
- Khi user muốn tạo portfolio mới → gọi tool_create_portfolio(name=...).
- Sau khi thực hiện, xác nhận kết quả với user.

## Phạm vi và giới hạn
- Trả lời bằng ngôn ngữ người dùng (tiếng Việt hoặc tiếng Anh).
- Chỉ phân tích tài chính và thị trường. Từ chối câu hỏi ngoài chủ đề lịch sự.
- **Không** đưa ra lời khuyên cụ thể về thời điểm hoặc số tiền mua/bán.
- **Về portfolio:** FinAI không lưu giá mua hay lịch sử giao dịch. Nếu user hỏi về lãi/lỗ (P&L),
  giải thích rõ ứng dụng chỉ theo dõi holdings và giá trị hiện tại theo thời gian thực.
- Khi phân tích portfolio: tập trung vào cơ cấu tài sản, phân bổ, và giá trị hiện tại.
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
        Calculate technical indicators for a ticker: RSI, MACD, SMA, EMA
        using the user's saved settings (configurable via /indicators/settings).
        Always use this when performing technical analysis.
        """
        return await calculate_technical_indicators(ctx.deps.db, ticker, ctx.deps.user_id)

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

    # ── Portfolio write tools ────────────────────────────────────────────────

    @agent.tool
    async def tool_create_portfolio(
        ctx: RunContext[AgentDeps],
        name: str,
        description: str | None = None,
    ) -> dict:
        """
        Create a new portfolio for the user with the given name and optional description.
        Use when user explicitly asks to create a new portfolio.
        """
        return await create_portfolio(ctx.deps.db, ctx.deps.user_id, name, description)

    @agent.tool
    async def tool_add_holding(
        ctx: RunContext[AgentDeps],
        ticker: str,
        quantity: float,
        portfolio_name: str | None = None,
        notes: str | None = None,
    ) -> dict:
        """
        Add or increase a holding in a portfolio.
        If portfolio_name is None, uses the user's default portfolio.
        Always ask for quantity if user did not specify it.
        If ticker already exists, quantity is added to existing amount.
        """
        return await add_holding(ctx.deps.db, ctx.deps.user_id, ticker, quantity, portfolio_name, notes)

    @agent.tool
    async def tool_update_holding(
        ctx: RunContext[AgentDeps],
        ticker: str,
        quantity: float,
        portfolio_name: str | None = None,
        notes: str | None = None,
    ) -> dict:
        """
        Update the quantity (and optionally notes) of an existing holding.
        Use when user wants to change the amount, not add to it.
        If portfolio_name is None, uses the user's default portfolio.
        """
        return await update_holding(ctx.deps.db, ctx.deps.user_id, ticker, quantity, portfolio_name, notes)

    @agent.tool
    async def tool_remove_holding(
        ctx: RunContext[AgentDeps],
        ticker: str,
        portfolio_name: str | None = None,
    ) -> dict:
        """
        Remove a holding from a portfolio entirely.
        If portfolio_name is None, uses the user's default portfolio.
        """
        return await remove_holding(ctx.deps.db, ctx.deps.user_id, ticker, portfolio_name)

    # ── Watchlist write tools ────────────────────────────────────────────────

    @agent.tool
    async def tool_add_to_watchlist(
        ctx: RunContext[AgentDeps],
        ticker: str,
    ) -> dict:
        """
        Add a ticker to the user's watchlist.
        Use when user says 'add X to my watchlist' or 'theo dõi X'.
        Silent if ticker already exists.
        """
        return await add_to_watchlist(ctx.deps.db, ctx.deps.user_id, ticker)

    @agent.tool
    async def tool_remove_from_watchlist(
        ctx: RunContext[AgentDeps],
        ticker: str,
    ) -> dict:
        """
        Remove a ticker from the user's watchlist.
        Use when user says 'remove X from watchlist' or 'xóa X khỏi watchlist'.
        """
        return await remove_from_watchlist(ctx.deps.db, ctx.deps.user_id, ticker)

    return agent
