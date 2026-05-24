import { useTranslation } from "react-i18next";

/**
 * Hook trả về hàm translateInterpretation(text) — dịch các chuỗi interpretation
 * trả về từ backend sang ngôn ngữ hiện tại.
 *
 * Backend trả về các pattern cố định, frontend nhận dạng và dịch.
 */
export function useInterpretation() {
  const { t } = useTranslation();

  return function translateInterpretation(text: string): string {
    if (!text) return text;

    // ── "Insufficient data." ───────────────────────────────────────────────
    if (text === "Insufficient data.") return t("interpretation.no_data");

    // ── RSI patterns ──────────────────────────────────────────────────────
    // "RSI=74.3 → Overbought. Possible pullback ahead."
    const rsiOverbought = text.match(/^RSI=([\d.]+) → Overbought\. Possible pullback ahead\.$/);
    if (rsiOverbought) return t("interpretation.rsi_overbought", { value: rsiOverbought[1] });

    // "RSI=22.1 → Oversold. Possible bounce ahead."
    const rsiOversold = text.match(/^RSI=([\d.]+) → Oversold\. Possible bounce ahead\.$/);
    if (rsiOversold) return t("interpretation.rsi_oversold", { value: rsiOversold[1] });

    // "RSI=60.5 → Bullish momentum."
    const rsiBullish = text.match(/^RSI=([\d.]+) → Bullish momentum\.$/);
    if (rsiBullish) return t("interpretation.rsi_bullish", { value: rsiBullish[1] });

    // "RSI=38.2 → Bearish momentum."
    const rsiBearish = text.match(/^RSI=([\d.]+) → Bearish momentum\.$/);
    if (rsiBearish) return t("interpretation.rsi_bearish", { value: rsiBearish[1] });

    // "RSI=50.0 → Neutral zone."
    const rsiNeutral = text.match(/^RSI=([\d.]+) → Neutral zone\.$/);
    if (rsiNeutral) return t("interpretation.rsi_neutral", { value: rsiNeutral[1] });

    // ── MACD patterns ─────────────────────────────────────────────────────
    if (text === "MACD above signal and zero line → Bullish trend confirmed.")
      return t("interpretation.macd_bullish_confirmed");

    if (text === "MACD crossed above signal (bullish crossover), still below zero → Potential early recovery.")
      return t("interpretation.macd_bullish_crossover");

    if (text === "MACD below signal and zero line → Bearish trend confirmed.")
      return t("interpretation.macd_bearish_confirmed");

    if (text === "MACD crossed below signal (bearish crossover), still above zero → Potential weakening.")
      return t("interpretation.macd_bearish_crossover");

    if (text === "MACD neutral.") return t("interpretation.macd_neutral");

    // ── SMA / EMA patterns ────────────────────────────────────────────────
    // "Price is 2.34% above SMA20 → Bullish. SMA20 acts as support."
    const maAbove = text.match(/^Price is ([\d.]+)% above (\S+) → Bullish\. (\S+) acts as support\.$/);
    if (maAbove) return t("interpretation.ma_above", { pct: maAbove[1], label: maAbove[2] });

    // "Price is 1.12% below SMA50 → Bearish. SMA50 acts as resistance."
    const maBelow = text.match(/^Price is ([\d.]+)% below (\S+) → Bearish\. (\S+) acts as resistance\.$/);
    if (maBelow) return t("interpretation.ma_below", { pct: maBelow[1], label: maBelow[2] });

    // Fallback — trả nguyên bản nếu không khớp pattern nào
    return text;
  };
}
