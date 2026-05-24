import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTimeAgo } from "../../hooks/useTimeAgo";
import {
  Search, ExternalLink, TrendingUp, TrendingDown, Minus,
  RefreshCw, ChevronLeft, ChevronRight, Newspaper, Tag,
} from "lucide-react";
import { api } from "../../lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface TickerRef { ticker: string }

interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  published_at: string;
  authors: string[] | null;
  url: string;
  source: string | null;
  source_domain: string | null;
  tickers: TickerRef[];
  sentiment_label?: "BULLISH" | "BEARISH" | "NEUTRAL" | null;
  sentiment_score?: number | null;
  category?: string | null;
}

interface NewsListResponse {
  items: NewsArticle[];
  total: number;
  skip: number;
  limit: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SentimentBadge({ label, score }: { label?: string | null; score?: number | null }) {
  if (!label) return null;
  if (label === "BULLISH") return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <TrendingUp size={11} /> BULLISH {score != null ? `${(score * 100).toFixed(0)}%` : ""}
    </span>
  );
  if (label === "BEARISH") return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
      <TrendingDown size={11} /> BEARISH {score != null ? `${(score * 100).toFixed(0)}%` : ""}
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
      <Minus size={11} /> NEUTRAL
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5 animate-pulse space-y-3">
      <div className="flex gap-2 items-center">
        <div className="h-4 w-16 bg-white/10 rounded" />
        <div className="h-4 w-24 bg-white/10 rounded" />
      </div>
      <div className="h-5 w-4/5 bg-white/10 rounded" />
      <div className="h-4 w-full bg-white/10 rounded" />
      <div className="h-4 w-3/4 bg-white/10 rounded" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;
const SENTIMENT_OPTIONS = ["All", "BULLISH", "BEARISH", "NEUTRAL"] as const;

export const NewsAndCalendar = () => {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tickerFilter, setTickerFilter] = useState("");
  const [debouncedTicker, setDebouncedTicker] = useState("");
  const [sentiment, setSentiment] = useState<typeof SENTIMENT_OPTIONS[number]>("All");

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    clearTimeout(searchTimer.current ?? undefined);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 400);
    return () => clearTimeout(searchTimer.current ?? undefined);
  }, [search]);

  useEffect(() => {
    clearTimeout(tickerTimer.current ?? undefined);
    tickerTimer.current = setTimeout(() => { setDebouncedTicker(tickerFilter.toUpperCase()); setPage(0); }, 400);
    return () => clearTimeout(tickerTimer.current ?? undefined);
  }, [tickerFilter]);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        sort_by: "published_at",
        order: "desc",
      };
      if (debouncedSearch) params.q = debouncedSearch;
      if (debouncedTicker) params.ticker = debouncedTicker;
      if (sentiment !== "All") params.sentiment = sentiment;

      const res = await api.get<NewsListResponse>("/news", { params });
      setArticles(res.data.items);
      setTotal(res.data.total);
    } catch {
      setError(t("news.error_loading"));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, debouncedTicker, sentiment]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div
      id="news-page"
      className="flex flex-col min-h-full bg-[var(--bg-color)] text-[var(--text-color)]"
    >
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden px-6 pt-8 pb-6 border-b border-[var(--border-color)]">
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 60% at 50% 0%, var(--color-primary), transparent)" }}
        />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Newspaper size={22} className="text-[var(--color-primary)]" />
            <h1 className="text-2xl font-bold tracking-tight">{t("news.title")}</h1>
          </div>
          <p className="text-sm text-[var(--text-color)]/50 mb-5">
            {total > 0 ? t("news.article_count", { count: total.toLocaleString() }) : t("news.subtitle")}
          </p>

          {/* ── Search + filters ── */}
          <div className="flex flex-wrap gap-3">
            {/* Keyword search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-color)]/40" />
              <input
                id="news-search"
                type="text"
                placeholder={t("news.search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            {/* Ticker filter */}
            <div className="relative w-36">
              <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-color)]/40" />
              <input
                id="news-ticker-filter"
                type="text"
                placeholder={t("news.ticker_placeholder")}
                value={tickerFilter}
                onChange={(e) => setTickerFilter(e.target.value)}
                maxLength={10}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-sm font-mono uppercase focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            {/* Sentiment filter */}
            <div className="flex gap-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-1">
              {SENTIMENT_OPTIONS.map((s) => (
                <button
                  key={s}
                  id={`news-sentiment-${s.toLowerCase()}`}
                  onClick={() => { setSentiment(s); setPage(0); }}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    sentiment === s
                      ? s === "BULLISH" ? "bg-emerald-500 text-white"
                        : s === "BEARISH" ? "bg-rose-500 text-white"
                        : "bg-[var(--color-primary)] text-white"
                      : "hover:bg-white/5",
                  ].join(" ")}
                >
                  {s === "All" ? t("news.sentiment_all") : s}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              id="news-refresh"
              onClick={fetchNews}
              disabled={loading}
              className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
              title={t("dashboard.refresh_tooltip")}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-6">
        {error ? (
          <div className="glass-card p-8 text-center">
            <p className="text-rose-400 font-medium">{error}</p>
            <button
              onClick={fetchNews}
              className="mt-4 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition-opacity"
            >
              {t("news.retry")}
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : articles.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Newspaper size={40} className="mx-auto mb-4 text-[var(--text-color)]/20" />
            <p className="text-lg font-semibold mb-1">{t("news.no_articles")}</p>
            <p className="text-sm text-[var(--text-color)]/50">
              {t("news.no_articles_hint")}
              <code className="ml-1 px-1.5 py-0.5 rounded bg-white/5 font-mono text-xs">
                POST /news/fetch
              </code>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-[var(--border-color)]">
            <span className="text-sm text-[var(--text-color)]/50">
              {t("news.pagination", { page: page + 1, total: totalPages, count: total })}
            </span>
            <div className="flex gap-2">
              <button
                id="news-prev-page"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm disabled:opacity-30 hover:border-[var(--color-primary)] transition-colors"
              >
                <ChevronLeft size={15} /> {t("news.prev_btn")}
              </button>
              <button
                id="news-next-page"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm disabled:opacity-30 hover:border-[var(--color-primary)] transition-colors"
              >
                {t("news.next_btn")} <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Article card ─────────────────────────────────────────────────────────────

function ArticleCard({ article }: { article: NewsArticle }) {
  const timeAgo = useTimeAgo();
  const hasBullish = article.sentiment_label === "BULLISH";
  const hasBearish = article.sentiment_label === "BEARISH";

  const accentColor = hasBullish
    ? "var(--color-bull, #10b981)"
    : hasBearish
    ? "var(--color-bear, #ef4444)"
    : "var(--color-primary)";

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group glass-card block p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 relative overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
    >
      {/* Subtle glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(ellipse 50% 80% at 0% 50%, ${accentColor}08, transparent)` }}
      />

      <div className="relative">
        {/* Top row: meta */}
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          {/* Source */}
          {article.source && (
            <span className="text-xs font-semibold text-[var(--color-primary)]">
              {article.source}
            </span>
          )}
          <span className="text-[var(--text-color)]/20">·</span>
          {/* Time */}
          <span className="text-xs text-[var(--text-color)]/50">
            {timeAgo(article.published_at)}
          </span>

          {/* Sentiment badge */}
          <div className="ml-auto">
            <SentimentBadge label={article.sentiment_label} score={article.sentiment_score} />
          </div>
        </div>

        {/* Title */}
        <h2 className="font-semibold text-base leading-snug mb-2 group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
          {article.title}
          <ExternalLink size={12} className="inline ml-1.5 opacity-0 group-hover:opacity-40 transition-opacity" />
        </h2>

        {/* Summary */}
        {article.summary && (
          <p className="text-sm text-[var(--text-color)]/60 leading-relaxed line-clamp-2 mb-3">
            {article.summary}
          </p>
        )}

        {/* Bottom row: tickers + authors */}
        <div className="flex flex-wrap items-center gap-2">
          {article.tickers.slice(0, 6).map((t) => (
            <span
              key={t.ticker}
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20"
            >
              ${t.ticker}
            </span>
          ))}
          {article.tickers.length > 6 && (
            <span className="text-xs text-[var(--text-color)]/40">
              +{article.tickers.length - 6} more
            </span>
          )}
          {article.authors?.length ? (
            <span className="text-xs text-[var(--text-color)]/40 ml-auto truncate max-w-[200px]">
              {article.authors.slice(0, 2).join(", ")}
            </span>
          ) : null}
        </div>
      </div>
    </a>
  );
}

export default NewsAndCalendar;
