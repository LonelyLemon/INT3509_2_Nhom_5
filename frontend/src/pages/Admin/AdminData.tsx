import { useState, useEffect } from "react";
import { TrendingUp, History, Newspaper, ChevronDown } from "lucide-react";
import { api } from "../../lib/api";
import { useTranslation } from "react-i18next";
import { ActionCard } from "./components/ActionCard";
import type { Status, ActionResult, Ticker } from "./types";

function NewsTickerSelect({ tickers, value, onChange }: {
  tickers: Ticker[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-56 px-3 py-2 pr-8 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
        >
          <option value="">{t("admin.all_tickers_batch")}</option>
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
          {t("admin.fetch_for_ticker", { ticker: value })}
        </span>
      )}
    </div>
  );
}

export function AdminData() {
  const { t } = useTranslation();
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
      setPriceResult({ message: msg ?? t("admin.failed_dispatch") });
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
      setBackfillResult({ message: msg ?? t("admin.failed_backfill") });
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
      setNewsResult({ message: msg ?? t("admin.failed_news") });
      setNewsStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">{t("admin.price_data")}</h2>
        <ActionCard
          icon={<TrendingUp size={20} />}
          title={t("admin.price_fetch_title")}
          description={t("admin.price_fetch_desc")}
          status={priceStatus}
          result={priceResult}
          onTrigger={triggerPriceFetch}
        />
        <ActionCard
          icon={<History size={20} />}
          title={t("admin.backfill_title")}
          description={t("admin.backfill_desc")}
          status={backfillStatus}
          result={backfillResult}
          onTrigger={triggerBackfill}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">{t("admin.news_data")}</h2>
        <ActionCard
          icon={<Newspaper size={20} />}
          title={t("admin.news_fetch_title")}
          description={t("admin.news_fetch_desc")}
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
