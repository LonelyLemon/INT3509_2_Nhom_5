from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.price.models import Asset, PriceData
from src.news.models import NewsArticle, NewsArticleTicker
from src.ai.tools.price_tools import get_latest_price
from src.ai.tools.indicator_tools import calculate_technical_indicators


async def list_assets(db: AsyncSession) -> dict:
    """
    List all active tickers available in the system.
    """
    result = await db.execute(
        select(Asset.ticker, Asset.name, Asset.asset_type)
        .where(Asset.is_active == True)
        .order_by(Asset.asset_type, Asset.ticker)
    )
    rows = result.all()

    assets_by_type: dict[str, list] = {}
    for ticker, name, asset_type in rows:
        type_key = asset_type.value if asset_type else "unknown"
        if type_key not in assets_by_type:
            assets_by_type[type_key] = []
        assets_by_type[type_key].append({
            "ticker": ticker,
            "name": name or ticker,
        })

    return {
        "total": len(rows),
        "assets_by_type": assets_by_type,
    }


async def get_general_news(
    db: AsyncSession,
    days_back: int = 7,
    limit: int = 15,
    category: str | None = None,
    sentiment: str | None = None,
) -> dict:
    """
    Fetch recent general market news (not filtered by ticker).
    Optional filters: category (e.g. 'macro', 'stocks', 'crypto'),
    sentiment ('BULLISH', 'BEARISH', 'NEUTRAL').
    """
    since = datetime.now(timezone.utc) - timedelta(days=days_back)

    query = (
        select(NewsArticle)
        .where(NewsArticle.published_at >= since)
        .order_by(NewsArticle.published_at.desc())
        .limit(limit)
    )

    if category:
        query = query.where(NewsArticle.category == category.lower())
    if sentiment:
        query = query.where(NewsArticle.sentiment_label == sentiment.upper())

    rows = (await db.execute(query)).scalars().all()

    if not rows:
        return {
            "articles": [],
            "message": f"No news found for the past {days_back} days with the given filters.",
        }

    articles = [
        {
            "title": a.title,
            "summary": a.summary or "",
            "published_at": a.published_at.isoformat(),
            "source": a.source or a.source_domain or "Unknown",
            "category": a.category,
            "sentiment_label": a.sentiment_label,
            "sentiment_score": a.sentiment_score,
            "url": a.url,
        }
        for a in rows
    ]

    return {
        "days_back": days_back,
        "count": len(articles),
        "articles": articles,
    }


async def compare_assets(
    db: AsyncSession,
    tickers: list[str],
) -> dict:
    """
    Compare multiple assets side-by-side: latest price + key technical indicators.
    Useful for 'compare SSI and HCM' type questions.
    """
    if not tickers:
        return {"error": "No tickers provided."}

    tickers = [t.upper() for t in tickers[:5]]  # max 5 tickers
    comparison: dict[str, dict] = {}

    for ticker in tickers:
        price_data = await get_latest_price(db, ticker)
        if "error" in price_data:
            comparison[ticker] = {"error": price_data["error"]}
            continue

        indicators = await calculate_technical_indicators(db, ticker)
        indicators_summary = {}
        if "error" not in indicators:
            ind = indicators.get("indicators", {})
            indicators_summary = {
                "RSI_14": ind.get("RSI_14", {}).get("value"),
                "RSI_signal": ind.get("RSI_14", {}).get("interpretation", ""),
                "MACD_signal": ind.get("MACD", {}).get("interpretation", ""),
                "SMA20_signal": ind.get("SMA_20", {}).get("interpretation", ""),
                "BB_signal": ind.get("Bollinger_Bands_20_2", {}).get("interpretation", ""),
            }

        comparison[ticker] = {
            "price": price_data.get("price"),
            "change_pct": price_data.get("change_percentage"),
            "change_amount": price_data.get("change_amount"),
            "volume": price_data.get("volume"),
            "timestamp": price_data.get("timestamp"),
            "indicators": indicators_summary,
        }

    return {
        "tickers": tickers,
        "comparison": comparison,
    }


async def get_market_sentiment(
    db: AsyncSession,
    ticker: str,
    days_back: int = 30,
) -> dict:
    """
    Aggregate news sentiment for a ticker over the past `days_back` days.
    Returns sentiment distribution, average score, and trend assessment.
    """
    ticker = ticker.upper()
    since = datetime.now(timezone.utc) - timedelta(days=days_back)

    rows = (
        await db.execute(
            select(NewsArticle)
            .join(NewsArticleTicker, NewsArticleTicker.article_id == NewsArticle.id)
            .where(
                NewsArticleTicker.ticker == ticker,
                NewsArticle.published_at >= since,
            )
            .order_by(NewsArticle.published_at.desc())
            .distinct()
        )
    ).scalars().all()

    if not rows:
        return {
            "ticker": ticker,
            "days_back": days_back,
            "total_articles": 0,
            "message": f"No news found for '{ticker}' in the past {days_back} days.",
        }

    sentiment_counts = {"BULLISH": 0, "BEARISH": 0, "NEUTRAL": 0, "unknown": 0}
    scores = []

    for a in rows:
        label = (a.sentiment_label or "").upper()
        if label in sentiment_counts:
            sentiment_counts[label] += 1
        else:
            sentiment_counts["unknown"] += 1
        if a.sentiment_score is not None:
            scores.append(a.sentiment_score)

    avg_score = round(sum(scores) / len(scores), 4) if scores else None

    # Determine overall sentiment
    bullish = sentiment_counts["BULLISH"]
    bearish = sentiment_counts["BEARISH"]
    total_labelled = bullish + bearish + sentiment_counts["NEUTRAL"]
    if total_labelled == 0:
        overall = "neutral"
    elif bullish / max(total_labelled, 1) >= 0.5:
        overall = "bullish"
    elif bearish / max(total_labelled, 1) >= 0.5:
        overall = "bearish"
    else:
        overall = "mixed"

    # Recent trend: compare first half vs second half
    mid = len(rows) // 2
    if mid > 0:
        recent_scores = [a.sentiment_score for a in rows[:mid] if a.sentiment_score is not None]
        older_scores = [a.sentiment_score for a in rows[mid:] if a.sentiment_score is not None]
        if recent_scores and older_scores:
            recent_avg = sum(recent_scores) / len(recent_scores)
            older_avg = sum(older_scores) / len(older_scores)
            diff = recent_avg - older_avg
            trend = "improving" if diff > 0.05 else ("worsening" if diff < -0.05 else "stable")
        else:
            trend = "stable"
    else:
        trend = "stable"

    return {
        "ticker": ticker,
        "days_back": days_back,
        "total_articles": len(rows),
        "sentiment_distribution": sentiment_counts,
        "avg_sentiment_score": avg_score,
        "overall_sentiment": overall,
        "recent_trend": trend,
    }
