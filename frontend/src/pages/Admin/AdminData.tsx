import { useState, useEffect } from "react";
import { TrendingUp, History, Newspaper, ChevronDown } from "lucide-react";
import { api } from "../../lib/api";
import { ActionCard } from "./components/ActionCard";
import type { Status, ActionResult, Ticker } from "./types";

function NewsTickerSelect({ tickers, value, onChange }: {
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

export function AdminData() {
  const [allTickers, setAllTickers] = useState<Ticker[]>([]);

  const [priceStatus, setPriceStatus] = useState<Status>("idle");
  const [priceResult, setPriceResult] = useState<ActionResult | null>(null);

  const [backfillStatus, setBackfillStatus] = useState<Status>("idle");
  const [backfillResult, setBackfillResult] = useState<ActionResult | null>(null);

  const [newsStatus, setNewsStatus] = useState<Status>("idle");
  const [newsResult, setNewsResult] = useState<ActionResult | null>(null);
  const [newsTicker, setNewsTicker] = useState("");

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
    <div className="flex flex-col gap-6">
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
          description="Downloads the full price history for all active tickers: daily candles (max available), hourly (2 years), and 1-minute (7 days). Also runs automatically every day at 06:00 HCM."
          status={backfillStatus}
          result={backfillResult}
          onTrigger={triggerBackfill}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">News Data</h2>
        <ActionCard
          icon={<Newspaper size={20} />}
          title="Trigger News Ingestion"
          description="Fetches and saves news articles. Select a specific ticker to fetch immediately for that symbol only (up to 20 articles). Leave as 'All active tickers' to dispatch the Celery batch task (runs every 3h)."
          status={newsStatus}
          result={newsResult}
          onTrigger={triggerNewsFetch}
          extra={
            <NewsTickerSelect tickers={allTickers} value={newsTicker} onChange={setNewsTicker} />
          }
        />
      </section>
    </div>
  );
}
