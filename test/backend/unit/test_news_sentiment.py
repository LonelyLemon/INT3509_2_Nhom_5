"""
Unit tests for src.news.sentiment — VADER + Loughran-McDonald sentiment analysis.
No DB or network required.
"""
from src.news.sentiment import analyze_sentiment


def test_bullish_headline_returns_bullish():
    label, _ = analyze_sentiment("Apple beats earnings expectations with record profits")
    assert label == "BULLISH"


def test_bearish_headline_returns_bearish():
    label, _ = analyze_sentiment("Company files for bankruptcy amid massive losses")
    assert label == "BEARISH"


def test_score_always_in_valid_range():
    _, score = analyze_sentiment("Company announces quarterly results")
    assert -1.0 <= score <= 1.0


def test_label_is_always_one_of_three_values():
    for headline in [
        "Stocks rally as market surges higher",
        "Revenue declined sharply this quarter",
        "Board meets to discuss strategy",
    ]:
        label, _ = analyze_sentiment(headline)
        assert label in {"BULLISH", "BEARISH", "NEUTRAL"}


def test_bearish_summary_reinforces_neutral_title():
    label, score = analyze_sentiment(
        "Market update",
        "Company collapsed with massive layoffs and bankruptcy filing",
    )
    assert label == "BEARISH"
    assert score < 0


def test_strong_positive_headline_gets_positive_score():
    _, score = analyze_sentiment(
        "Company surged to record profits beating all analyst expectations"
    )
    assert score > 0.05
