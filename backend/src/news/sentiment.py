"""
Sentiment analysis for financial news headlines using VADER augmented with
the Loughran-McDonald (LM) financial sentiment lexicon.

Why two tools together:
  - VADER handles linguistic features: negation ("not profitable" → negative),
    intensifiers ("record-breaking growth" → stronger), punctuation/caps.
  - VADER's default lexicon is trained on social media — many financial terms
    are missing or have wrong polarity (e.g. "liability" scores neutral in VADER
    but is clearly negative in finance).
  - The LM additions fix the domain gap by overriding / adding scores for
    common financial terms based on the Loughran-McDonald Master Dictionary.

Usage:
    label, score = analyze_sentiment(title, summary)
    # label: "BULLISH" | "BEARISH" | "NEUTRAL"
    # score: float in [-1.0, 1.0]
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# ── Loughran-McDonald financial vocabulary additions ─────────────────────────
# Scores follow VADER's internal scale (roughly -4 to +4).
# Sources: Loughran & McDonald (2011) "When Is a Liability Not a Liability?"
#          + common extensions from fintech literature.

_LM_LEXICON: dict[str, float] = {
    # ── Strong negatives ──────────────────────────────────────────────────────
    "bankruptcy": -3.5,
    "bankrupt": -3.5,
    "insolvency": -3.5,
    "insolvent": -3.5,
    "fraud": -3.5,
    "fraudulent": -3.5,
    "default": -3.0,
    "collapse": -3.0,
    "collapsed": -3.0,
    "crashed": -3.0,
    "restatement": -3.0,
    "impairment": -2.5,
    "writedown": -2.5,
    "write-down": -2.5,
    "writeoff": -2.5,
    "write-off": -2.5,
    "penalty": -2.5,
    "penalties": -2.5,
    "violation": -2.5,
    "violations": -2.5,
    "layoffs": -2.5,
    "layoff": -2.5,
    "downgrade": -2.5,
    "downgraded": -2.5,
    "distress": -2.5,
    "delinquent": -2.5,
    "delinquency": -2.5,
    "plunge": -2.5,
    "plunged": -2.5,
    "shortfall": -2.5,
    "suspended": -2.0,
    "investigation": -2.0,
    "lawsuit": -2.0,
    "litigation": -2.0,
    "miss": -2.0,
    "missed": -2.0,
    "misses": -2.0,
    "deficit": -2.0,
    "deteriorate": -2.0,
    "deteriorating": -2.0,
    "slump": -2.0,
    "crash": -2.0,
    "restructuring": -1.5,
    "decline": -1.5,
    "declined": -1.5,
    "declining": -1.5,
    "recall": -1.5,
    "halted": -1.5,

    # ── Strong positives ──────────────────────────────────────────────────────
    "beat": 2.5,
    "beats": 2.5,
    "exceeded": 2.5,
    "exceeds": 2.5,
    "outperform": 2.5,
    "outperformed": 2.5,
    "upgrade": 2.5,
    "upgraded": 2.5,
    "breakthrough": 2.5,
    "surged": 2.0,
    "surge": 2.0,
    "soared": 2.0,
    "soar": 2.0,
    "rallied": 2.0,
    "record": 2.0,
    "profit": 1.5,
    "profitable": 1.5,
    "profitability": 1.5,
    "dividend": 1.5,
    "dividends": 1.5,
    "expansion": 1.5,
    "recovery": 1.5,
    "robust": 1.5,
    "rally": 1.5,
    "innovation": 1.5,
    "partnership": 1.0,
    "acquisition": 1.0,
    "deal": 0.5,
    "merger": 0.5,
}

# Singleton — built once, reused across all calls in the same worker process.
_analyzer: SentimentIntensityAnalyzer | None = None


def _get_analyzer() -> SentimentIntensityAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = SentimentIntensityAnalyzer()
        _analyzer.lexicon.update(_LM_LEXICON)
    return _analyzer


def analyze_sentiment(title: str, summary: str | None = None) -> tuple[str, float]:
    """
    Analyze the sentiment of a news article from its title and optional summary.

    Returns:
        (label, score)
        - label: "BULLISH" | "BEARISH" | "NEUTRAL"
        - score: VADER compound score in [-1.0, 1.0]

    Thresholds (standard VADER convention):
        score >= +0.05  → BULLISH
        score <= -0.05  → BEARISH
        otherwise       → NEUTRAL
    """
    text = f"{title}. {summary}" if summary else title
    compound = _get_analyzer().polarity_scores(text)["compound"]

    if compound >= 0.05:
        label = "BULLISH"
    elif compound <= -0.05:
        label = "BEARISH"
    else:
        label = "NEUTRAL"

    return label, round(compound, 4)
