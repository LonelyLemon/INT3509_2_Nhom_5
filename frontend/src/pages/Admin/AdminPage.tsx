import { useState } from "react";
import { api } from "../../lib/api";
import { RefreshCw, Newspaper, TrendingUp, CheckCircle, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { cn } from "../../lib/utils";

type Status = "idle" | "loading" | "success" | "error";

interface ActionResult {
  message: string;
  status?: string;
  fetched_count?: number;
  inserted_count?: number;
}

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

      <div className="flex items-center gap-3">
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

        {status === "success" && result && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle size={15} />
            <span>{result.message}</span>
          </div>
        )}
        {status === "error" && result && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <XCircle size={15} />
            <span>{result.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const AdminPage = () => {
  const [priceStatus, setPriceStatus] = useState<Status>("idle");
  const [priceResult, setPriceResult] = useState<ActionResult | null>(null);

  const [newsStatus, setNewsStatus] = useState<Status>("idle");
  const [newsResult, setNewsResult] = useState<ActionResult | null>(null);
  const [newsTicker, setNewsTicker] = useState("");

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

  const triggerNewsFetch = async () => {
    setNewsStatus("loading");
    setNewsResult(null);
    try {
      const params = newsTicker.trim() ? { ticker: newsTicker.trim().toUpperCase(), limit: 20 } : undefined;
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
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-sm opacity-50 mt-0.5">Manual controls for data ingestion pipelines</p>
          </div>
        </div>

        {/* Price ingestion */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">Price Data</h2>
          <ActionCard
            icon={<TrendingUp size={20} />}
            title="Trigger Price Ingestion"
            description="Dispatches the Celery task that fetches 1-minute OHLCV data for all 18 active tickers via yfinance. Normally runs automatically every minute."
            status={priceStatus}
            result={priceResult}
            onTrigger={triggerPriceFetch}
          />
        </section>

        {/* News ingestion */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">News Data</h2>
          <ActionCard
            icon={<Newspaper size={20} />}
            title="Trigger News Ingestion"
            description="Fetches and saves news articles. Leave ticker blank to dispatch the Celery task for all active assets (runs every 3h by schedule). Enter a ticker to fetch immediately for that symbol only."
            status={newsStatus}
            result={newsResult}
            onTrigger={triggerNewsFetch}
            extra={
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Ticker (optional, e.g. AAPL)"
                  value={newsTicker}
                  onChange={(e) => setNewsTicker(e.target.value)}
                  className="w-56 px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                {newsTicker.trim() && (
                  <span className="text-xs opacity-50">
                    Fetches immediately for <span className="font-mono font-bold">{newsTicker.toUpperCase()}</span> (up to 20 articles)
                  </span>
                )}
              </div>
            }
          />
        </section>

      </div>
    </div>
  );
};
