import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, MessageSquare, ThumbsUp, ThumbsDown, Bot } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";
import type { AIStats } from "./types";

export function AdminAI() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<AIStats>("/ai/admin/stats");
      setStats(res.data);
    } catch {
      setError(t("admin.failed_ai_stats"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm opacity-50">
        <Loader2 size={14} className="animate-spin" /> {t("admin.loading_ai_stats")}
      </div>
    );
  }
  if (error) return <div className="text-sm text-red-400">{error}</div>;
  if (!stats) return null;

  const summaryCards = [
    { icon: <MessageSquare size={16} />, label: t("admin.total_conversations"), value: stats.total_conversations, color: "text-[var(--color-primary)]" },
    { icon: <ThumbsUp size={16} />, label: t("admin.likes"), value: `${stats.like_count} (${stats.like_rate_pct}%)`, color: "text-emerald-400" },
    { icon: <ThumbsDown size={16} />, label: t("admin.dislikes"), value: `${stats.dislike_count} (${stats.dislike_rate_pct}%)`, color: "text-rose-400" },
    { icon: <Bot size={16} />, label: t("admin.unrated"), value: stats.unrated_count, color: "text-amber-400" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">{t("admin.ai_quality")}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(({ icon, label, value, color }) => (
          <div key={label} className="glass-card p-4 flex flex-col gap-1">
            <div className={cn("flex items-center gap-1.5 text-xs font-medium", color)}>{icon}{label}</div>
            <div className="text-xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {stats.recent_feedback.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--border-color)] text-xs font-semibold uppercase tracking-wider opacity-50">
            {t("admin.recent_feedback")}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-xs opacity-50">
                  <th className="text-left px-4 py-2 font-medium">{t("admin.table_conversation")}</th>
                  <th className="text-left px-4 py-2 font-medium">{t("admin.table_rating")}</th>
                  <th className="text-left px-4 py-2 font-medium">{t("admin.table_comment")}</th>
                  <th className="text-left px-4 py-2 font-medium">{t("admin.table_date")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_feedback.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--border-color)]/10">
                    <td className="px-4 py-2.5 max-w-[180px] truncate opacity-80">{item.title}</td>
                    <td className="px-4 py-2.5">
                      {item.rating === "like"
                        ? <span className="flex items-center gap-1 text-emerald-400"><ThumbsUp size={12} /> {t("admin.rating_like")}</span>
                        : <span className="flex items-center gap-1 text-rose-400"><ThumbsDown size={12} /> {t("admin.rating_dislike")}</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 max-w-[220px] truncate opacity-60 text-xs">{item.feedback_text ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs opacity-50 whitespace-nowrap">
                      {item.rated_at ? new Date(item.rated_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={load}
        className="flex items-center gap-1.5 text-xs opacity-50 hover:opacity-80 transition-opacity self-start"
      >
        <RefreshCw size={12} /> {t("admin.refresh_btn")}
      </button>
    </div>
  );
}
