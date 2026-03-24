from datetime import datetime, timezone, timedelta

from src.news.utils import _make_api_request, format_datetime_for_api


# ── Alpha Vantage fetch helpers ──

def get_news(ticker: str, start_date, end_date, limit: int = 5) -> dict | str:
    """Fetch news from Alpha Vantage for a specific ticker."""
    params = {
        "tickers": ticker,
        "time_from": format_datetime_for_api(start_date),
        "time_to": format_datetime_for_api(end_date),
        "sort": "LATEST",
        "limit": limit,
    }
    return _make_api_request("NEWS_SENTIMENT", params)


def get_global_news(curr_date, look_back_days: int = 7, limit: int = 5) -> dict | str:
    """Fetch global market news from Alpha Vantage."""
    curr_dt = datetime.strptime(curr_date, "%Y-%m-%d")
    start_dt = curr_dt - timedelta(days=look_back_days)
    start_date = start_dt.strftime("%Y-%m-%d")

    params = {
        "topics": "financial_markets,economy_macro,economy_monetary",
        "time_from": format_datetime_for_api(start_date),
        "time_to": format_datetime_for_api(curr_date),
        "limit": str(limit),
    }
    return _make_api_request("NEWS_SENTIMENT", params)

# ──  Parsing ──

def _parse_published_time(time_str: str) -> datetime:
    """Parse Alpha Vantage time format '20260318T081300' into a datetime."""
    return datetime.strptime(time_str, "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)
