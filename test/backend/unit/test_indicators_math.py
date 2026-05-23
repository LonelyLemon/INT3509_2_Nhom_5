"""
Unit tests for the pure math helpers in src.indicators.service.
No DB or network required — all functions are deterministic given the same input.
"""
import numpy as np
import pytest

from src.indicators.service import (
    _sma,
    _ema,
    _rsi,
    _macd,
    _round,
    _interpret_rsi,
    _interpret_macd,
    _interpret_sma,
)


# ── _sma ──────────────────────────────────────────────────────────────────────

def test_sma_basic():
    closes = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    # SMA(3) of last 3 values [3, 4, 5] = 4.0
    assert _sma(closes, 3) == pytest.approx(4.0)


def test_sma_insufficient_data_returns_none():
    closes = np.array([1.0, 2.0])
    assert _sma(closes, 5) is None


def test_sma_exact_window():
    closes = np.array([10.0, 20.0, 30.0])
    assert _sma(closes, 3) == pytest.approx(20.0)


# ── _ema ──────────────────────────────────────────────────────────────────────

def test_ema_length_equals_input():
    closes = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    ema = _ema(closes, 3)
    assert len(ema) == len(closes)


def test_ema_first_value_equals_first_close():
    closes = np.array([10.0, 11.0, 12.0])
    ema = _ema(closes, 2)
    assert ema[0] == pytest.approx(10.0)


def test_ema_lags_behind_rising_prices():
    # For strictly increasing prices, EMA[-1] should be < closes[-1]
    closes = np.array([10.0, 11.0, 12.0, 13.0, 14.0, 15.0])
    ema = _ema(closes, 3)
    assert float(ema[-1]) < closes[-1]


# ── _rsi ──────────────────────────────────────────────────────────────────────

def test_rsi_all_gains_returns_100():
    closes = np.array([float(i) for i in range(1, 22)])  # strictly increasing
    result = _rsi(closes, 14)
    assert result == pytest.approx(100.0)


def test_rsi_all_losses_returns_0():
    closes = np.array([float(i) for i in range(21, 0, -1)])  # strictly decreasing
    result = _rsi(closes, 14)
    assert result == pytest.approx(0.0)


def test_rsi_insufficient_data_returns_none():
    closes = np.array([1.0, 2.0, 3.0])  # fewer than period + 1
    assert _rsi(closes, 14) is None


def test_rsi_value_in_valid_range():
    np.random.seed(42)
    closes = np.cumsum(np.random.randn(50)) + 100.0
    result = _rsi(closes, 14)
    assert result is not None
    assert 0.0 <= result <= 100.0


# ── _macd ─────────────────────────────────────────────────────────────────────

def test_macd_returns_three_non_none_values():
    closes = np.array([float(i) for i in range(1, 42)])  # 41 data points > 26+9
    macd_line, signal_line, histogram = _macd(closes, 12, 26, 9)
    assert macd_line is not None
    assert signal_line is not None
    assert histogram is not None


def test_macd_insufficient_data_returns_triple_none():
    closes = np.array([1.0, 2.0, 3.0])
    result = _macd(closes, 12, 26, 9)
    assert result == (None, None, None)


def test_macd_histogram_equals_line_minus_signal():
    closes = np.array([float(i) for i in range(1, 42)])
    macd_line, signal_line, histogram = _macd(closes, 12, 26, 9)
    assert histogram == pytest.approx(macd_line - signal_line, abs=1e-9)


# ── _round ────────────────────────────────────────────────────────────────────

def test_round_none_returns_none():
    assert _round(None) is None


def test_round_applies_digits():
    assert _round(3.14159265, 4) == pytest.approx(3.1416)


# ── _interpret_rsi ────────────────────────────────────────────────────────────

def test_interpret_rsi_overbought():
    assert "Overbought" in _interpret_rsi(75.0)


def test_interpret_rsi_oversold():
    assert "Oversold" in _interpret_rsi(25.0)


def test_interpret_rsi_none_returns_insufficient():
    assert "Insufficient" in _interpret_rsi(None)


# ── _interpret_sma ────────────────────────────────────────────────────────────

def test_interpret_sma_price_above_is_bullish():
    result = _interpret_sma(105.0, 100.0, "SMA20")
    assert "Bullish" in result


def test_interpret_sma_price_below_is_bearish():
    result = _interpret_sma(95.0, 100.0, "SMA20")
    assert "Bearish" in result


def test_interpret_sma_none_returns_insufficient():
    assert "Insufficient" in _interpret_sma(100.0, None, "SMA20")
