import { useTranslation } from "react-i18next";

/**
 * Returns a `timeAgo(isoString)` function that is always localised.
 * Call this inside any React component that needs to display relative times.
 *
 * Example:
 *   const timeAgo = useTimeAgo();
 *   return <span>{timeAgo(post.created_at)}</span>
 */
export function useTimeAgo() {
  const { t } = useTranslation();

  return function timeAgo(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return t("common.just_now");
    if (m < 60) return `${m}${t("common.minutes_ago")}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}${t("common.hours_ago")}`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}${t("common.days_ago")}`;
    return new Date(isoStr).toLocaleDateString();
  };
}
