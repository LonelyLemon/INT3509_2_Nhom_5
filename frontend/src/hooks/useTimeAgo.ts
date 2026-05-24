import { useTranslation } from "react-i18next";

/**
 * Returns a `timeAgo(isoString)` function that is always localised.
 *
 * Root cause of timezone bug:
 *   Backend stores UTC datetimes. Pydantic may serialize them as
 *   "2026-05-24T06:30:00" (no tz suffix) OR "2026-05-24T06:30:00+00:00".
 *   JS treats strings WITHOUT a tz suffix as LOCAL time → 7-hour offset for UTC+7.
 *   Fix: if there's no Z or +/- timezone info, append "Z" to force UTC.
 */
function normalizeToUTC(isoStr: string): string {
  // Already has timezone info: ends with Z, or has +HH:MM / -HH:MM
  if (/Z$|[+-]\d{2}:\d{2}$/.test(isoStr)) return isoStr;
  // Naive datetime from backend → treat as UTC
  return isoStr + "Z";
}

export function useTimeAgo() {
  const { t } = useTranslation();

  return function timeAgo(isoStr: string): string {
    const diff = Date.now() - new Date(normalizeToUTC(isoStr)).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return t("common.just_now");
    if (m < 60) return `${m}${t("common.minutes_ago")}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}${t("common.hours_ago")}`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}${t("common.days_ago")}`;
    return new Date(normalizeToUTC(isoStr)).toLocaleDateString();
  };
}
