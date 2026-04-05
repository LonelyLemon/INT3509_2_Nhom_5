"""
Unit tests for src/news/get_news.py

All tests are pure-Python (no DB, no network). They verify the parser
and field-extractor functions against realistic yfinance payloads.
"""

from datetime import datetime, timezone

import pytest

from src.news.get_news import (
    _extract_url,
    _extract_title,
    _extract_summary,
    _extract_published_at,
    _extract_source,
    _extract_related_tickers,
    parse_yfinance_news_item,
    get_tickers_news,
)
from src.news.models import NewsArticle, NewsArticleTicker


# ── _extract_url ─────────────────────────────────────────────────────────────

class TestExtractUrl:
    def test_v1_canonical_url(self, yf_v1_item):
        url = _extract_url(yf_v1_item)
        assert url == "https://finance.yahoo.com/news/apple-surges-strong-earnings-143000.html"

    def test_v0_link(self, yf_v0_item):
        url = _extract_url(yf_v0_item)
        assert url == "https://www.bloomberg.com/news/tesla-new-model-456"

    def test_missing_url_returns_none(self, yf_item_missing_url):
        # provider present but no canonicalUrl
        result = _extract_url(yf_item_missing_url)
        assert result is None

    def test_empty_item_returns_none(self):
        assert _extract_url({}) is None


# ── _extract_title ────────────────────────────────────────────────────────────

class TestExtractTitle:
    def test_v1_title(self, yf_v1_item):
        assert _extract_title(yf_v1_item) == "Apple Surges on Strong Earnings"

    def test_v0_title(self, yf_v0_item):
        assert _extract_title(yf_v0_item) == "Tesla Unveils New Model"

    def test_empty_title_returns_empty_string(self, yf_item_missing_title):
        assert _extract_title(yf_item_missing_title) == ""


# ── _extract_summary ──────────────────────────────────────────────────────────

class TestExtractSummary:
    def test_v1_summary(self, yf_v1_item):
        assert "record quarter" in _extract_summary(yf_v1_item)

    def test_v0_no_summary_returns_empty(self, yf_v0_item):
        assert _extract_summary(yf_v0_item) == ""

    def test_missing_content_returns_empty(self):
        assert _extract_summary({}) == ""


# ── _extract_published_at ─────────────────────────────────────────────────────

class TestExtractPublishedAt:
    def test_v1_iso_format(self, yf_v1_item):
        dt = _extract_published_at(yf_v1_item)
        assert dt is not None
        assert dt.tzinfo is not None
        assert dt.year == 2026
        assert dt.month == 4
        assert dt.day == 5
        assert dt.hour == 14
        assert dt.minute == 30

    def test_v0_unix_timestamp(self, yf_v0_item):
        dt = _extract_published_at(yf_v0_item)
        assert dt is not None
        assert dt.tzinfo == timezone.utc
        assert dt.year == 2026

    def test_missing_date_returns_none(self, yf_item_missing_date):
        assert _extract_published_at(yf_item_missing_date) is None

    def test_empty_item_returns_none(self):
        assert _extract_published_at({}) is None


# ── _extract_source ───────────────────────────────────────────────────────────

class TestExtractSource:
    def test_v1_source_name_and_domain(self, yf_v1_item):
        name, domain = _extract_source(yf_v1_item)
        assert name == "Reuters"
        assert domain == "www.reuters.com"

    def test_v1_scheme_stripped_from_domain(self, yf_v1_item):
        _, domain = _extract_source(yf_v1_item)
        assert not domain.startswith("https://")
        assert not domain.startswith("http://")

    def test_v0_publisher(self, yf_v0_item):
        name, domain = _extract_source(yf_v0_item)
        assert name == "Bloomberg"
        assert domain is None

    def test_empty_item_returns_nones(self):
        name, domain = _extract_source({})
        assert name is None
        assert domain is None


# ── _extract_related_tickers ──────────────────────────────────────────────────

class TestExtractRelatedTickers:
    def test_v1_dict_format(self, yf_v1_item):
        tickers = _extract_related_tickers(yf_v1_item)
        assert "AAPL" in tickers
        assert "MSFT" in tickers

    def test_v0_string_list(self, yf_v0_item):
        tickers = _extract_related_tickers(yf_v0_item)
        assert tickers == ["TSLA", "GM"]

    def test_empty_related_tickers(self):
        item = {"content": {"title": "x", "relatedTickers": []}}
        assert _extract_related_tickers(item) == []

    def test_no_related_tickers_key(self):
        item = {"content": {"title": "x"}}
        assert _extract_related_tickers(item) == []


# ── parse_yfinance_news_item ──────────────────────────────────────────────────

class TestParseYfinanceNewsItem:
    def test_v1_returns_article(self, yf_v1_item):
        article = parse_yfinance_news_item(yf_v1_item, "AAPL")
        assert isinstance(article, NewsArticle)
        assert article.title == "Apple Surges on Strong Earnings"
        assert article.url == "https://finance.yahoo.com/news/apple-surges-strong-earnings-143000.html"
        assert article.primary_ticker == "AAPL"
        assert article.source == "Reuters"
        assert article.source_domain == "www.reuters.com"

    def test_v0_returns_article(self, yf_v0_item):
        article = parse_yfinance_news_item(yf_v0_item, "TSLA")
        assert isinstance(article, NewsArticle)
        assert article.title == "Tesla Unveils New Model"
        assert article.primary_ticker == "TSLA"

    def test_source_ticker_always_in_tickers_list(self, yf_v1_item):
        # AAPL is already in relatedTickers; should not be duplicated
        article = parse_yfinance_news_item(yf_v1_item, "AAPL")
        ticker_symbols = [t.ticker for t in article.tickers]
        assert ticker_symbols.count("AAPL") == 1

    def test_source_ticker_added_when_not_in_related(self, yf_v0_item):
        # Fetch for NVDA but relatedTickers only has TSLA, GM
        article = parse_yfinance_news_item(yf_v0_item, "NVDA")
        ticker_symbols = [t.ticker for t in article.tickers]
        assert "NVDA" in ticker_symbols  # must be inserted at front
        assert "TSLA" in ticker_symbols
        assert "GM" in ticker_symbols

    def test_no_duplicate_tickers_in_tickers_list(self, yf_v1_item):
        article = parse_yfinance_news_item(yf_v1_item, "AAPL")
        ticker_symbols = [t.ticker for t in article.tickers]
        assert len(ticker_symbols) == len(set(ticker_symbols))

    def test_ticker_rows_have_null_scores(self, yf_v1_item):
        article = parse_yfinance_news_item(yf_v1_item, "AAPL")
        for t in article.tickers:
            assert t.relevance_score is None
            assert t.sentiment_score is None

    def test_sentiment_fields_null(self, yf_v1_item):
        article = parse_yfinance_news_item(yf_v1_item, "AAPL")
        assert article.overall_sentiment_score is None
        assert article.overall_sentiment_label is None

    def test_topics_always_empty(self, yf_v1_item):
        article = parse_yfinance_news_item(yf_v1_item, "AAPL")
        assert article.topics == []

    def test_missing_title_returns_none(self, yf_item_missing_title):
        result = parse_yfinance_news_item(yf_item_missing_title, "X")
        assert result is None

    def test_missing_url_returns_none(self, yf_item_missing_url):
        result = parse_yfinance_news_item(yf_item_missing_url, "X")
        assert result is None

    def test_missing_date_returns_none(self, yf_item_missing_date):
        result = parse_yfinance_news_item(yf_item_missing_date, "X")
        assert result is None

    def test_title_truncated_to_512_chars(self):
        long_title = "A" * 600
        item = {
            "content": {
                "title": long_title,
                "pubDate": "2026-04-05T10:00:00Z",
                "canonicalUrl": {"url": "https://example.com/long-title"},
            }
        }
        article = parse_yfinance_news_item(item, "TEST")
        assert len(article.title) == 512

    def test_url_truncated_to_1024_chars(self):
        long_url = "https://example.com/" + "x" * 1100
        item = {
            "content": {
                "title": "Title",
                "pubDate": "2026-04-05T10:00:00Z",
                "canonicalUrl": {"url": long_url},
            }
        }
        article = parse_yfinance_news_item(item, "TEST")
        assert len(article.url) == 1024


# ── get_tickers_news deduplication ───────────────────────────────────────────

class TestGetTickersNewsDedup:
    def test_cross_ticker_dedup_by_url(self, monkeypatch, yf_v1_item):
        """
        If two tickers return the same article URL, only the first
        (source_ticker, item) pair should appear in the result.
        """
        def mock_get_news(ticker, count):
            return [yf_v1_item]  # same article for every ticker

        monkeypatch.setattr("src.news.get_news.get_ticker_news", mock_get_news)
        monkeypatch.setattr("src.news.get_news.time.sleep", lambda _: None)

        pairs = get_tickers_news(["AAPL", "MSFT", "GOOG"], count_per_ticker=5)

        # Only one copy should survive dedup
        assert len(pairs) == 1
        assert pairs[0][0] == "AAPL"  # attributed to the first ticker

    def test_distinct_urls_all_kept(self, monkeypatch, yf_v1_item, yf_v0_item):
        """Two tickers with distinct article URLs → both kept."""
        def mock_get_news(ticker, count):
            return [yf_v1_item] if ticker == "AAPL" else [yf_v0_item]

        monkeypatch.setattr("src.news.get_news.get_ticker_news", mock_get_news)
        monkeypatch.setattr("src.news.get_news.time.sleep", lambda _: None)

        pairs = get_tickers_news(["AAPL", "TSLA"], count_per_ticker=5)
        assert len(pairs) == 2

    def test_empty_ticker_list_returns_empty(self, monkeypatch):
        monkeypatch.setattr("src.news.get_news.time.sleep", lambda _: None)
        assert get_tickers_news([], count_per_ticker=10) == []

    def test_yfinance_error_skips_ticker(self, monkeypatch):
        """A failing ticker should not crash the whole fetch."""
        def mock_get_news(ticker, count):
            if ticker == "BAD":
                raise RuntimeError("network error")
            return []

        # get_ticker_news already catches exceptions, so this tests that
        # the outer loop in get_tickers_news completes gracefully.
        monkeypatch.setattr("src.news.get_news.get_ticker_news", mock_get_news)
        monkeypatch.setattr("src.news.get_news.time.sleep", lambda _: None)

        result = get_tickers_news(["AAPL", "BAD", "TSLA"])
        assert isinstance(result, list)
