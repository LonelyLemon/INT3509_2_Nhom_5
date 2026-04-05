"""
Shared pytest fixtures.

These tests are unit / integration tests that do NOT require a live
database or a running Celery worker. External I/O (yfinance, DB) is
mocked at the boundary layer.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone


# ── Sample yfinance news payloads ────────────────────────────────────────────

@pytest.fixture
def yf_v1_item():
    """A realistic yfinance v1.x (nested 'content') news item."""
    return {
        "id": "abc-123",
        "content": {
            "title": "Apple Surges on Strong Earnings",
            "summary": "Apple Inc reported a record quarter driven by iPhone sales.",
            "pubDate": "2026-04-05T14:30:00Z",
            "provider": {
                "displayName": "Reuters",
                "url": "https://www.reuters.com",
            },
            "canonicalUrl": {
                "url": "https://finance.yahoo.com/news/apple-surges-strong-earnings-143000.html",
                "site": "finance.yahoo.com",
            },
            "relatedTickers": [
                {"symbol": "AAPL", "isPrimary": True},
                {"symbol": "MSFT", "isPrimary": False},
            ],
        },
    }


@pytest.fixture
def yf_v0_item():
    """A realistic yfinance v0.2.x (flat) news item."""
    return {
        "uuid": "def-456",
        "title": "Tesla Unveils New Model",
        "publisher": "Bloomberg",
        "link": "https://www.bloomberg.com/news/tesla-new-model-456",
        "providerPublishTime": 1775395800,  # 2026-04-05 14:30 UTC
        "type": "STORY",
        "relatedTickers": ["TSLA", "GM"],
    }


@pytest.fixture
def yf_item_missing_url():
    return {
        "content": {
            "title": "Some Article Without URL",
            "pubDate": "2026-04-05T10:00:00Z",
            "provider": {"displayName": "CNBC"},
        }
    }


@pytest.fixture
def yf_item_missing_title():
    return {
        "content": {
            "title": "",
            "pubDate": "2026-04-05T10:00:00Z",
            "canonicalUrl": {"url": "https://example.com/no-title"},
        }
    }


@pytest.fixture
def yf_item_missing_date():
    return {
        "content": {
            "title": "Article Without Date",
            "canonicalUrl": {"url": "https://example.com/no-date"},
        }
    }
