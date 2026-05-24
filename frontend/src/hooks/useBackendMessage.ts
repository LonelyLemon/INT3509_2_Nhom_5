import { useTranslation } from "react-i18next";

/**
 * Hook trả về hàm translateBackendMessage(text) — dịch các chuỗi message
 * cố định trả về từ backend sang ngôn ngữ hiện tại.
 *
 * Các pattern được nhận dạng:
 *   Price:
 *     "Price ingestion task dispatched."
 *     "Historical backfill dispatched for {label}."
 *   News:
 *     "News ingestion task dispatched for all active assets."
 *     "No news found for ticker."
 *     "Successfully fetched and saved news."
 *     "No news found for '{ticker}' in the past {N} days."
 *     "No recent news found for '{ticker}' in the past {N} days."
 *     "No news found for the past {N} days with the given filters."
 */
export function useBackendMessage() {
  const { t } = useTranslation();

  return function translateBackendMessage(text: string): string {
    if (!text) return text;

    // ── Price ──────────────────────────────────────────────────────────────
    if (text === "Price ingestion task dispatched.")
      return t("admin.msg_price_dispatched");

    // "Historical backfill dispatched for All tickers." / "for VNM."
    const backfill = text.match(/^Historical backfill dispatched for (.+)\.$/);
    if (backfill)
      return t("admin.msg_backfill_dispatched", { label: backfill[1] });

    // ── News ───────────────────────────────────────────────────────────────
    if (text === "News ingestion task dispatched for all active assets.")
      return t("admin.msg_news_dispatched");

    if (text === "No news found for ticker.")
      return t("admin.msg_news_not_found_ticker");

    if (text === "Successfully fetched and saved news.")
      return t("admin.msg_news_success");

    // "No news found for 'VNM' in the past 7 days."
    const noNewsTicker = text.match(/^No news found for '(.+)' in the past (\d+) days\.$/);
    if (noNewsTicker)
      return t("admin.msg_news_not_found_days", { ticker: noNewsTicker[1], days: noNewsTicker[2] });

    // "No recent news found for 'VNM' in the past 7 days."
    const noRecentTicker = text.match(/^No recent news found for '(.+)' in the past (\d+) days\.$/);
    if (noRecentTicker)
      return t("admin.msg_news_no_recent", { ticker: noRecentTicker[1], days: noRecentTicker[2] });

    // "No news found for the past 7 days with the given filters."
    const noNewsFilter = text.match(/^No news found for the past (\d+) days with the given filters\.$/);
    if (noNewsFilter)
      return t("admin.msg_news_not_found_filter", { days: noNewsFilter[1] });

    // Fallback — trả nguyên bản
    return text;
  };
}
