"""
News fetching via yfinance (Yahoo Finance).

yfinance returns news items in two formats depending on the version:
  v1.x  — nested:  item["content"]["title"], item["content"]["canonicalUrl"]["url"], …
  v0.2.x — flat:   item["title"], item["link"], item["providerPublishTime"], …

All public helpers are written to handle both layouts defensively.
"""

import time
from datetime import datetime, timezone

import yfinance as yf
from loguru import logger

from src.news.models import NewsArticle, NewsArticleTicker

# Polite delay between per-ticker API calls to avoid Yahoo rate-limiting.
_REQUEST_DELAY = 0.3  # seconds


# ── Low-level field extractors ──────────────────────────────────────────────

def _extract_url(item: dict) -> str | None:
    """Return the canonical URL from a yfinance news item (both formats)."""
    content = item.get("content", {})
    if content:
        canonical = content.get("canonicalUrl") or {}
        url = canonical.get("url") or content.get("url")
        if url:
            return url
    return item.get("link")


def _extract_title(item: dict) -> str:
    content = item.get("content", {})
    return (content.get("title") if content else None) or item.get("title", "")


def _extract_summary(item: dict) -> str:
    content = item.get("content", {})
    return (content.get("summary") if content else None) or ""


def _extract_published_at(item: dict) -> datetime | None:
    content = item.get("content", {})
    if content:
        pub = content.get("pubDate") or content.get("publishedAt")
        if pub:
            try:
                return datetime.fromisoformat(pub.replace("Z", "+00:00"))
            except ValueError:
                pass
    # v0.2.x: Unix timestamp
    ts = item.get("providerPublishTime")
    if ts:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc)
    return None


def _extract_source(item: dict) -> tuple[str | None, str | None]:
    """Return (source_name, source_domain)."""
    content = item.get("content", {})
    if content:
        provider = content.get("provider") or {}
        name = provider.get("displayName") or provider.get("name")
        domain = provider.get("url") or ""
        # strip scheme from domain string
        for scheme in ("https://", "http://"):
            if domain.startswith(scheme):
                domain = domain[len(scheme):]
                break
        return name or None, domain or None
    return item.get("publisher"), None


def _extract_related_tickers(item: dict) -> list[str]:
    """Return related ticker symbols from a yfinance news item."""
    content = item.get("content", {})
    if content:
        related = content.get("relatedTickers") or []
        # v1.x: [{"symbol": "AAPL", "isPrimary": true}, …]
        if related and isinstance(related[0], dict):
            return [t["symbol"] for t in related if t.get("symbol")]
        # fallback flat list inside content
        return [str(t) for t in related if t]
    # v0.2.x: ["AAPL", "TSLA", …]
    return [str(t) for t in item.get("relatedTickers", []) if t]


# ── Public fetch helpers ────────────────────────────────────────────────────

def get_ticker_news(ticker: str, count: int = 20) -> list[dict]:
    """Fetch news items for a single ticker via yfinance."""
    try:
        items = yf.Ticker(ticker).news or []
        return items[:count]
    except Exception as e:
        logger.warning(f"yfinance news fetch failed for {ticker}: {e}")
        return []


def get_tickers_news(tickers: list[str], count_per_ticker: int = 10) -> list[tuple[str, dict]]:
    """
    Fetch news for every ticker in the list.

    Returns a list of (source_ticker, raw_item) pairs with URL-level
    deduplication already applied across tickers.
    """
    seen_urls: set[str] = set()
    results: list[tuple[str, dict]] = []

    for ticker in tickers:
        try:
            items = get_ticker_news(ticker, count_per_ticker)
        except Exception as e:
            logger.warning(f"Skipping ticker {ticker} due to error: {e}")
            items = []
        for item in items:
            url = _extract_url(item)
            if url and url not in seen_urls:
                seen_urls.add(url)
                results.append((ticker, item))
        time.sleep(_REQUEST_DELAY)

    return results


# ── Parser ──────────────────────────────────────────────────────────────────

def parse_yfinance_news_item(item: dict, source_ticker: str) -> NewsArticle | None:
    """
    Convert a raw yfinance news dict into a NewsArticle ORM model.
    Returns None if the item is missing essential fields (title or URL).
    """
    title = _extract_title(item)[:512]
    if not title:
        return None

    url = _extract_url(item)
    if not url:
        return None
    url = url[:1024]

    published_at = _extract_published_at(item)
    if not published_at:
        return None

    summary = _extract_summary(item)
    source_name, source_domain = _extract_source(item)
    related = _extract_related_tickers(item)

    # Build NewsArticleTicker rows; ensure the fetch ticker is always present.
    seen: set[str] = set()
    tickers_list: list[NewsArticleTicker] = []

    for symbol in [source_ticker] + related:
        if symbol and symbol not in seen:
            seen.add(symbol)
            tickers_list.append(
                NewsArticleTicker(ticker=symbol, relevance_score=None)
            )

    return NewsArticle(
        title=title,
        summary=summary or None,
        published_at=published_at,
        authors=None,
        url=url,
        source=source_name,
        source_domain=source_domain,
        tickers=tickers_list,
    )
