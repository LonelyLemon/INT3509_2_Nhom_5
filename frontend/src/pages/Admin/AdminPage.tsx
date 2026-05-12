import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import {
  RefreshCw, Newspaper, TrendingUp, CheckCircle, XCircle,
  Loader2, ShieldAlert, Plus, Trash2, Power, PowerOff,
  History, ChevronDown, AlertTriangle, Bot, ThumbsUp, ThumbsDown, MessageSquare,
} from "lucide-react";
import { cn } from "../../lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "success" | "error";

interface ActionResult {
  message: string;
  status?: string;
  fetched_count?: number;
  inserted_count?: number;
}

interface Ticker {
  id: string;
  ticker: string;
  name: string | null;
  asset_type: string;
  is_active: boolean;
}

const ASSET_TYPES = ["STOCK", "CRYPTO", "ETF", "INDEX", "FOREX"] as const;

// ── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card max-w-sm w-full mx-4 p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg flex-shrink-0",
            danger ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
          )}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-base">{title}</h3>
            <p className="text-sm opacity-60 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--border-color)] hover:bg-[var(--border-color)]/30 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer",
              danger
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-[var(--color-primary)] hover:opacity-90 text-white"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Feedback Badge ───────────────────────────────────────────────────────────

function FeedbackBadge({ status, result }: { status: Status; result: ActionResult | null }) {
  if (status === "success" && result) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle size={15} />
        <span>{result.message}</span>
      </div>
    );
  }
  if (status === "error" && result) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <XCircle size={15} />
        <span>{result.message}</span>
      </div>
    );
  }
  return null;
}

// ── Add Ticker Form ──────────────────────────────────────────────────────────

function AddTickerForm({ onAdded }: { onAdded: () => void }) {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<string>("STOCK");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = symbol.trim().toUpperCase();
    if (!ticker) return;

    setStatus("loading");
    setError(null);
    try {
      await api.post("/price/tickers", {
        ticker,
        name: name.trim() || null,
        asset_type: assetType,
        is_active: true,
      });
      setSymbol("");
      setName("");
      setAssetType("STOCK");
      setStatus("idle");
      onAdded();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Failed to add ticker.");
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs opacity-50 font-medium uppercase tracking-wider">Symbol *</label>
        <input
          type="text"
          placeholder="e.g. AAPL"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          required
          className="w-28 px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)] transition-colors uppercase"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs opacity-50 font-medium uppercase tracking-wider">Name</label>
        <input
          type="text"
          placeholder="Apple Inc."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-44 px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs opacity-50 font-medium uppercase tracking-wider">Type</label>
        <div className="relative">
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="appearance-none w-32 px-3 py-2 pr-8 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
        </div>
      </div>
      <button
        type="submit"
        disabled={status === "loading" || !symbol.trim()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {status === "loading" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Add Ticker
      </button>
      {error && (
        <span className="text-xs text-red-400 flex items-center gap-1">
          <XCircle size={12} /> {error}
        </span>
      )}
    </form>
  );
}

// ── Ticker Row ───────────────────────────────────────────────────────────────

function TickerRow({
  ticker,
  onToggle,
  onDelete,
}: {
  ticker: Ticker;
  onToggle: (t: Ticker) => void;
  onDelete: (t: Ticker) => void;
}) {
  return (
    <tr className="border-b border-[var(--border-color)]/50 hover:bg-[var(--color-primary)]/4 transition-colors">
      <td className="px-4 py-3 font-mono font-bold text-sm text-[var(--color-primary)]">
        {ticker.ticker}
      </td>
      <td className="px-4 py-3 text-sm opacity-70 max-w-[180px] truncate">
        {ticker.name ?? <span className="opacity-40 italic">—</span>}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--border-color)]/40 uppercase tracking-wider">
          {ticker.asset_type}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full",
          ticker.is_active
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-[var(--border-color)]/40 text-[var(--text-color)] opacity-50"
        )}>
          {ticker.is_active ? "Active" : "Disabled"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(ticker)}
            title={ticker.is_active ? "Disable ingestion" : "Enable ingestion"}
            className={cn(
              "p-1.5 rounded-lg border transition-all cursor-pointer",
              ticker.is_active
                ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            )}
          >
            {ticker.is_active ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          <button
            onClick={() => onDelete(ticker)}
            title="Delete ticker and all price history"
            className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Ticker Management Section ────────────────────────────────────────────────

function TickerManagementSection() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirm dialog state
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    danger: boolean;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", confirmLabel: "", danger: false, onConfirm: () => {} });

  const fetchTickers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/price/tickers", { params: { limit: 200 } });
      setTickers(res.data);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickers(); }, [fetchTickers]);

  const handleToggle = (ticker: Ticker) => {
    const next = !ticker.is_active;
    setConfirm({
      open: true,
      title: `${next ? "Enable" : "Disable"} ${ticker.ticker}`,
      description: next
        ? `Resume price ingestion for ${ticker.ticker}. The next Celery Beat cycle will start collecting data again.`
        : `Pause price ingestion for ${ticker.ticker}. Existing price history is kept. You can re-enable it at any time.`,
      confirmLabel: next ? "Enable" : "Disable",
      danger: false,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try {
          await api.patch(`/price/tickers/${ticker.ticker}`, { is_active: next });
          setTickers((prev) =>
            prev.map((t) => (t.ticker === ticker.ticker ? { ...t, is_active: next } : t))
          );
        } catch {
          /* TODO: surface error */
        }
      },
    });
  };

  const handleDelete = (ticker: Ticker) => {
    setConfirm({
      open: true,
      title: `Delete ${ticker.ticker}?`,
      description: `This will permanently delete ${ticker.ticker} and ALL of its price history from the database. This action cannot be undone.\n\nIf you only want to stop collecting new data, use the Disable button instead.`,
      confirmLabel: "Delete permanently",
      danger: true,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try {
          await api.delete(`/price/tickers/${ticker.ticker}`);
          setTickers((prev) => prev.filter((t) => t.ticker !== ticker.ticker));
        } catch {
          /* TODO: surface error */
        }
      },
    });
  };

  return (
    <>
      <ConfirmDialog
        {...confirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />

      <div className="glass-card !p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)]">
          <span className="text-sm font-semibold">
            {loading ? "Loading…" : `${tickers.length} tickers registered`}
          </span>
          <button
            onClick={fetchTickers}
            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin")} />
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32 opacity-50">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : tickers.length === 0 ? (
          <div className="flex items-center justify-center h-32 opacity-40 text-sm">
            No tickers registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  {["Symbol", "Name", "Type", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold opacity-40 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickers.map((t) => (
                  <TickerRow
                    key={t.id}
                    ticker={t}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add form */}
        <div className="px-5 py-4 border-t border-[var(--border-color)] bg-[var(--card-bg)]/30">
          <p className="text-xs opacity-40 font-semibold uppercase tracking-wider mb-3">Add New Ticker</p>
          <AddTickerForm onAdded={fetchTickers} />
        </div>
      </div>
    </>
  );
}

// ── Ingestion Action Card ────────────────────────────────────────────────────

function ActionCard({
  icon,
  title,
  description,
  status,
  result,
  onTrigger,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: Status;
  result: ActionResult | null;
  onTrigger: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-sm opacity-60 mt-0.5">{description}</p>
        </div>
      </div>

      {extra}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onTrigger}
          disabled={status === "loading"}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
            "bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {status === "loading" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RefreshCw size={15} />
          )}
          {status === "loading" ? "Dispatching…" : "Trigger Now"}
        </button>

        <FeedbackBadge status={status} result={result} />
      </div>
    </div>
  );
}

// ── News Ticker Dropdown ─────────────────────────────────────────────────────

function NewsTickerSelect({
  tickers,
  value,
  onChange,
}: {
  tickers: Ticker[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-56 px-3 py-2 pr-8 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
        >
          <option value="">All active tickers (batch)</option>
          {tickers.filter((t) => t.is_active).map((t) => (
            <option key={t.ticker} value={t.ticker}>
              {t.ticker}{t.name ? ` — ${t.name}` : ""}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
      </div>
      {value && (
        <span className="text-xs opacity-50">
          Fetches immediately for <span className="font-mono font-bold">{value}</span> (up to 20 articles)
        </span>
      )}
    </div>
  );
}

// ── AI Stats Section ─────────────────────────────────────────────────────────

interface RecentFeedbackItem {
  id: string;
  title: string;
  rating: "like" | "dislike" | null;
  feedback_text: string | null;
  rated_at: string | null;
  created_at: string;
}

interface AIStats {
  total_conversations: number;
  like_count: number;
  dislike_count: number;
  unrated_count: number;
  like_rate_pct: number;
  dislike_rate_pct: number;
  recent_feedback: RecentFeedbackItem[];
}

function AIStatsSection() {
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
      setError("Failed to load AI stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center gap-2 text-sm opacity-50"><Loader2 size={14} className="animate-spin" /> Loading AI stats…</div>;
  if (error) return <div className="text-sm text-red-400">{error}</div>;
  if (!stats) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <MessageSquare size={16} />, label: "Total Conversations", value: stats.total_conversations, color: "text-[var(--color-primary)]" },
          { icon: <ThumbsUp size={16} />, label: "Likes", value: `${stats.like_count} (${stats.like_rate_pct}%)`, color: "text-emerald-400" },
          { icon: <ThumbsDown size={16} />, label: "Dislikes", value: `${stats.dislike_count} (${stats.dislike_rate_pct}%)`, color: "text-rose-400" },
          { icon: <Bot size={16} />, label: "Unrated", value: stats.unrated_count, color: "text-amber-400" },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="glass-card p-4 flex flex-col gap-1">
            <div className={cn("flex items-center gap-1.5 text-xs font-medium", color)}>{icon}{label}</div>
            <div className="text-xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Recent feedback table */}
      {stats.recent_feedback.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--border-color)] text-xs font-semibold uppercase tracking-wider opacity-50">
            Recent Feedback
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-xs opacity-50">
                  <th className="text-left px-4 py-2 font-medium">Conversation</th>
                  <th className="text-left px-4 py-2 font-medium">Rating</th>
                  <th className="text-left px-4 py-2 font-medium">Comment</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_feedback.map(item => (
                  <tr key={item.id} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--border-color)]/10">
                    <td className="px-4 py-2.5 max-w-[180px] truncate opacity-80">{item.title}</td>
                    <td className="px-4 py-2.5">
                      {item.rating === "like"
                        ? <span className="flex items-center gap-1 text-emerald-400"><ThumbsUp size={12} /> Like</span>
                        : <span className="flex items-center gap-1 text-rose-400"><ThumbsDown size={12} /> Dislike</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 max-w-[220px] truncate opacity-60 text-xs">{item.feedback_text ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs opacity-50 whitespace-nowrap">
                      {item.rated_at ? new Date(item.rated_at).toLocaleDateString("vi-VN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button onClick={load} className="flex items-center gap-1.5 text-xs opacity-50 hover:opacity-80 transition-opacity self-start">
        <RefreshCw size={12} /> Refresh
      </button>
    </div>
  );
}

// ── Main Admin Page ──────────────────────────────────────────────────────────

export const AdminPage = () => {
  const [allTickers, setAllTickers] = useState<Ticker[]>([]);

  const [priceStatus, setPriceStatus] = useState<Status>("idle");
  const [priceResult, setPriceResult] = useState<ActionResult | null>(null);

  const [backfillStatus, setBackfillStatus] = useState<Status>("idle");
  const [backfillResult, setBackfillResult] = useState<ActionResult | null>(null);

  const [newsStatus, setNewsStatus] = useState<Status>("idle");
  const [newsResult, setNewsResult] = useState<ActionResult | null>(null);
  const [newsTicker, setNewsTicker] = useState("");

  // Load tickers for the news dropdown (all tickers, not just active).
  useEffect(() => {
    api.get("/price/tickers", { params: { limit: 200 } })
      .then((res) => setAllTickers(res.data))
      .catch(() => {});
  }, []);

  const triggerPriceFetch = async () => {
    setPriceStatus("loading");
    setPriceResult(null);
    try {
      const res = await api.post("/price/fetch");
      setPriceResult(res.data);
      setPriceStatus("success");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPriceResult({ message: msg ?? "Failed to dispatch task." });
      setPriceStatus("error");
    }
  };

  const triggerBackfill = async () => {
    setBackfillStatus("loading");
    setBackfillResult(null);
    try {
      const res = await api.post("/price/backfill");
      setBackfillResult(res.data);
      setBackfillStatus("success");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setBackfillResult({ message: msg ?? "Failed to dispatch backfill." });
      setBackfillStatus("error");
    }
  };

  const triggerNewsFetch = async () => {
    setNewsStatus("loading");
    setNewsResult(null);
    try {
      const params = newsTicker ? { ticker: newsTicker, limit: 20 } : undefined;
      const res = await api.post("/news/fetch", null, { params });
      setNewsResult(res.data);
      setNewsStatus("success");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setNewsResult({ message: msg ?? "Failed to dispatch task." });
      setNewsStatus("error");
    }
  };

  return (
    <div className="min-h-full bg-[var(--bg-color)] text-[var(--text-color)] p-6 md:p-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-sm opacity-50 mt-0.5">Manage tickers and data ingestion pipelines</p>
          </div>
        </div>

        {/* ── Ticker Management ── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">Ticker Management</h2>
          <TickerManagementSection />
        </section>

        {/* ── Price Data ── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">Price Data</h2>

          <ActionCard
            icon={<TrendingUp size={20} />}
            title="Trigger Price Ingestion (1m)"
            description="Dispatches the Celery task that fetches the last 7 days of 1-minute OHLCV data for all active tickers via yfinance. Normally runs automatically every minute."
            status={priceStatus}
            result={priceResult}
            onTrigger={triggerPriceFetch}
          />

          <ActionCard
            icon={<History size={20} />}
            title="Trigger Historical Backfill"
            description="Downloads the full price history for all active tickers: daily candles (max available — decades), hourly (2 years), and 1-minute (7 days). Use this once after adding new tickers. Also runs automatically every day at 06:00 HCM."
            status={backfillStatus}
            result={backfillResult}
            onTrigger={triggerBackfill}
          />
        </section>

        {/* ── News Data ── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">News Data</h2>
          <ActionCard
            icon={<Newspaper size={20} />}
            title="Trigger News Ingestion"
            description="Fetches and saves news articles. Select a specific ticker to fetch immediately for that symbol only (up to 20 articles). Leave as 'All active tickers' to dispatch the Celery batch task (runs every 3h by schedule)."
            status={newsStatus}
            result={newsResult}
            onTrigger={triggerNewsFetch}
            extra={
              <NewsTickerSelect
                tickers={allTickers}
                value={newsTicker}
                onChange={setNewsTicker}
              />
            }
          />
        </section>

        {/* ── AI Stats ── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">AI Quality Stats</h2>
          <AIStatsSection />
        </section>

      </div>
    </div>
  );
};
