"""
Sentiment analysis for financial news headlines using VADER augmented with
the Loughran-McDonald (LM) financial sentiment lexicon.

Why two tools together:
  - VADER handles linguistic features: negation ("not profitable" → negative),
    intensifiers ("record-breaking growth" → stronger), punctuation/caps.
  - VADER's default lexicon is trained on social media — many financial terms
    are missing or have wrong polarity (e.g. "liability" scores neutral in VADER
    but is clearly negative in finance).
  - The full LM Master Dictionary (1993-2025) fixes the domain gap with ~2700
    classified financial terms from SEC filings research.
  - Manual overrides on top of LM base scores fine-tune key high-signal terms
    (e.g. "bankruptcy" is more negative than a generic LM negative word).

Usage:
    label, score = analyze_sentiment(title, summary)
    # label: "BULLISH" | "BEARISH" | "NEUTRAL"
    # score: float in [-1.0, 1.0]
"""

import csv
from pathlib import Path

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# ── LM CSV path ───────────────────────────────────────────────────────────────

_CSV_PATH = Path(__file__).parent / "external_resources" / "Loughran-McDonald_MasterDictionary_1993-2025.csv"

# VADER score scale is roughly -4 to +4.
# LM flags are binary (non-zero = word belongs to that category).
# Base scores by LM category:
_LM_SCORE_MAP = {
    "Negative":    -2.0,
    "Positive":    +2.0,
    "Uncertainty": -0.75,  # uncertainty signals weak/cautious tone
    "Litigious":   -1.0,   # legal risk
    "Constraining":-0.5,   # limiting language
}


def _load_lm_csv() -> dict[str, float]:
    """
    Load the Loughran-McDonald Master Dictionary CSV and convert binary
    category flags into VADER-compatible float scores.

    When a word appears in multiple categories the most extreme score wins.
    Words appear in the CSV as uppercase; we store them lowercase to match
    VADER's internal lookup convention.
    """
    if not _CSV_PATH.exists():
        return {}

    lexicon: dict[str, float] = {}
    with open(_CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = row["Word"].lower()
            best_score = 0.0
            for col, score in _LM_SCORE_MAP.items():
                if int(row.get(col, 0) or 0) != 0:
                    if abs(score) > abs(best_score):
                        best_score = score
            if best_score != 0.0:
                lexicon[word] = best_score
    return lexicon


# ── Manual overrides ──────────────────────────────────────────────────────────
# Fine-tune high-signal terms that deserve a stronger score than the LM base.
# These are applied after the CSV load, so they always take precedence.

_MANUAL_OVERRIDES: dict[str, float] = {
    # ── Strong negatives ──────────────────────────────────────────────────────
    "bankruptcy":   -3.5,
    "bankrupt":     -3.5,
    "insolvency":   -3.5,
    "insolvent":    -3.5,
    "fraud":        -3.5,
    "fraudulent":   -3.5,
    "default":      -3.0,
    "collapse":     -3.0,
    "collapsed":    -3.0,
    "crashed":      -3.0,
    "restatement":  -3.0,
    "impairment":   -2.5,
    "writedown":    -2.5,
    "write-down":   -2.5,
    "writeoff":     -2.5,
    "write-off":    -2.5,
    "penalty":      -2.5,
    "penalties":    -2.5,
    "plunge":       -2.5,
    "plunged":      -2.5,
    "shortfall":    -2.5,
    "downgrade":    -2.5,
    "downgraded":   -2.5,
    "layoffs":      -2.5,
    "layoff":       -2.5,

    # ── Strong positives ──────────────────────────────────────────────────────
    "beat":         +2.5,
    "beats":        +2.5,
    "exceeded":     +2.5,
    "exceeds":      +2.5,
    "outperform":   +2.5,
    "outperformed": +2.5,
    "upgrade":      +2.5,
    "upgraded":     +2.5,
    "breakthrough": +2.5,
    "surged":       +2.0,
    "surge":        +2.0,
    "soared":       +2.0,
    "rallied":      +2.0,
    "record":       +2.0,
    "profit":       +1.5,
    "dividend":     +1.5,
    "dividends":    +1.5,
    "expansion":    +1.5,
    "recovery":     +1.5,
    "robust":       +1.5,
    "rally":        +1.5,
}

# Singleton — built once, reused across all calls in the same worker process.
_analyzer: SentimentIntensityAnalyzer | None = None


def _get_analyzer() -> SentimentIntensityAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = SentimentIntensityAnalyzer()
        # Layer 1: full LM Master Dictionary (~2700 financial terms, base scores)
        _analyzer.lexicon.update(_load_lm_csv())
        # Layer 2: manual overrides for high-signal terms (always win)
        _analyzer.lexicon.update(_MANUAL_OVERRIDES)
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
