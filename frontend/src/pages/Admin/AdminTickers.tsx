import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Loader2, Plus, Trash2, Power, PowerOff, XCircle, ChevronDown, Search, Filter, X } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "./components/ConfirmDialog";
import type { Ticker, Status, ASSET_TYPES } from "./types";
import { ASSET_TYPES as ASSET_TYPES_VALUES } from "./types";

function AddTickerForm({ onAdded }: { onAdded: () => void }) {
  const { t } = useTranslation();
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
      setError(msg ?? t("admin.failed_add_ticker"));
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs opacity-50 font-medium uppercase tracking-wider">{t("admin.symbol_label")}</label>
        <input
          type="text"
          placeholder={t("admin.symbol_placeholder")}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          required
          className="w-28 px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)] transition-colors uppercase"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs opacity-50 font-medium uppercase tracking-wider">{t("admin.name_label")}</label>
        <input
          type="text"
          placeholder={t("admin.name_placeholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-44 px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs opacity-50 font-medium uppercase tracking-wider">{t("admin.type_label")}</label>
        <div className="relative">
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="appearance-none w-32 px-3 py-2 pr-8 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
          >
            {ASSET_TYPES_VALUES.map((t) => (
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
        {t("admin.add_ticker_btn")}
      </button>
      {error && (
        <span className="text-xs text-red-400 flex items-center gap-1">
          <XCircle size={12} /> {error}
        </span>
      )}
    </form>
  );
}

function TickerRow({
  ticker,
  onToggle,
  onDelete,
}: {
  ticker: Ticker;
  onToggle: (t: Ticker) => void;
  onDelete: (t: Ticker) => void;
}) {
  const { t } = useTranslation();
  return (
    <tr className="border-b border-[var(--border-color)]/50 hover:bg-[var(--color-primary)]/4 transition-colors">
      <td className="px-4 py-3 font-mono font-bold text-sm text-[var(--color-primary)]">{ticker.ticker}</td>
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
          {ticker.is_active ? t("admin.status_active") : t("admin.status_disabled")}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(ticker)}
            title={ticker.is_active ? t("admin.disable_ingestion") : t("admin.enable_ingestion")}
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
            title={t("admin.delete_ticker_tooltip")}
            className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AdminTickers() {
  const { t } = useTranslation();
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [confirm, setConfirm] = useState<{
    open: boolean; title: string; description: string;
    confirmLabel: string; danger: boolean; onConfirm: () => void;
  }>({ open: false, title: "", description: "", confirmLabel: "", danger: false, onConfirm: () => {} });

  const fetchTickers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/price/tickers", { params: { limit: 200 } });
      setTickers(res.data);
    } catch { /* silently ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTickers(); }, [fetchTickers]);

  const filteredTickers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickers.filter((ticker) => {
      const matchesSearch =
        !q ||
        ticker.ticker.toLowerCase().includes(q) ||
        (ticker.name ?? "").toLowerCase().includes(q);
      const matchesType = filterType === "ALL" || ticker.asset_type === filterType;
      const matchesStatus =
        filterStatus === "ALL" ||
        (filterStatus === "ACTIVE" && ticker.is_active) ||
        (filterStatus === "DISABLED" && !ticker.is_active);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [tickers, searchQuery, filterType, filterStatus]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || filterType !== "ALL" || filterStatus !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("ALL");
    setFilterStatus("ALL");
  };

  const handleToggle = (ticker: Ticker) => {
    const next = !ticker.is_active;
    setConfirm({
      open: true,
      title: next ? t("admin.enable_title", { ticker: ticker.ticker }) : t("admin.disable_title", { ticker: ticker.ticker }),
      description: next
        ? t("admin.enable_desc", { ticker: ticker.ticker })
        : t("admin.disable_desc", { ticker: ticker.ticker }),
      confirmLabel: next ? t("admin.enable_ingestion") : t("admin.disable_ingestion"),
      danger: false,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try {
          await api.patch(`/price/tickers/${ticker.ticker}`, { is_active: next });
          setTickers((prev) => prev.map((tk) => tk.ticker === ticker.ticker ? { ...tk, is_active: next } : tk));
        } catch { /* TODO: surface error */ }
      },
    });
  };

  const handleDelete = (ticker: Ticker) => {
    setConfirm({
      open: true,
      title: t("admin.delete_title", { ticker: ticker.ticker }),
      description: t("admin.delete_desc", { ticker: ticker.ticker }),
      confirmLabel: t("admin.delete_permanently"),
      danger: true,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try {
          await api.delete(`/price/tickers/${ticker.ticker}`);
          setTickers((prev) => prev.filter((tk) => tk.ticker !== ticker.ticker));
        } catch { /* TODO: surface error */ }
      },
    });
  };

  return (
    <>
      <ConfirmDialog {...confirm} onCancel={() => setConfirm((c) => ({ ...c, open: false }))} />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">{t("admin.ticker_management")}</h2>
          <button
            onClick={fetchTickers}
            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer"
            title={t("admin.refresh_list")}
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin")} />
          </button>
        </div>

        <div className="glass-card !p-0 overflow-hidden">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)] text-sm font-semibold">
            <span>
              {loading
                ? t("admin.loading")
                : hasActiveFilters
                ? `${filteredTickers.length} / ${tickers.length} tickers`
                : t("admin.tickers_registered", { count: tickers.length })}
            </span>
          </div>

          {/* ── Filter Bar ── */}
          <div className="px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--card-bg)]/20 flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
              <input
                type="text"
                placeholder={t("admin.search_ticker_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Asset Type */}
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="opacity-40 flex-shrink-0" />
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-xs font-semibold focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  <option value="ALL">{t("admin.filter_all_types")}</option>
                  {ASSET_TYPES_VALUES.map((tk) => (
                    <option key={tk} value={tk}>{tk}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-xs font-semibold focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <option value="ALL">{t("admin.filter_all_status")}</option>
                <option value="ACTIVE">{t("admin.status_active")}</option>
                <option value="DISABLED">{t("admin.status_disabled")}</option>
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
            </div>

            {/* Clear */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:opacity-70 transition-opacity cursor-pointer"
              >
                <X size={11} /> {t("admin.filter_clear")}
              </button>
            )}
          </div>

          {/* ── Table ── */}
          {loading ? (
            <div className="flex items-center justify-center h-32 opacity-50">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : tickers.length === 0 ? (
            <div className="flex items-center justify-center h-32 opacity-40 text-sm">{t("admin.no_tickers")}</div>
          ) : filteredTickers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-40">
              <Search size={20} />
              <span className="text-sm">{t("admin.no_tickers_match")}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    {[t("admin.symbol_label"), t("admin.name_label"), t("admin.type_label"), t("admin.status_label"), t("admin.actions_label")].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold opacity-40 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTickers.map((tk) => (
                    <TickerRow key={tk.id} ticker={tk} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-4 border-t border-[var(--border-color)] bg-[var(--card-bg)]/30">
            <p className="text-xs opacity-40 font-semibold uppercase tracking-wider mb-3">{t("admin.add_new_ticker")}</p>
            <AddTickerForm onAdded={fetchTickers} />
          </div>
        </div>
      </div>
    </>
  );
}
