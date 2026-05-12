import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, Plus, Trash2, Power, PowerOff, XCircle, ChevronDown } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { ConfirmDialog } from "./components/ConfirmDialog";
import type { Ticker, Status, ASSET_TYPES } from "./types";
import { ASSET_TYPES as ASSET_TYPES_VALUES } from "./types";

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

export function AdminTickers() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleToggle = (ticker: Ticker) => {
    const next = !ticker.is_active;
    setConfirm({
      open: true,
      title: `${next ? "Enable" : "Disable"} ${ticker.ticker}`,
      description: next
        ? `Resume price ingestion for ${ticker.ticker}.`
        : `Pause price ingestion for ${ticker.ticker}. Existing history is kept.`,
      confirmLabel: next ? "Enable" : "Disable",
      danger: false,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try {
          await api.patch(`/price/tickers/${ticker.ticker}`, { is_active: next });
          setTickers((prev) => prev.map((t) => t.ticker === ticker.ticker ? { ...t, is_active: next } : t));
        } catch { /* TODO: surface error */ }
      },
    });
  };

  const handleDelete = (ticker: Ticker) => {
    setConfirm({
      open: true,
      title: `Delete ${ticker.ticker}?`,
      description: `This will permanently delete ${ticker.ticker} and ALL of its price history. This action cannot be undone.`,
      confirmLabel: "Delete permanently",
      danger: true,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try {
          await api.delete(`/price/tickers/${ticker.ticker}`);
          setTickers((prev) => prev.filter((t) => t.ticker !== ticker.ticker));
        } catch { /* TODO: surface error */ }
      },
    });
  };

  return (
    <>
      <ConfirmDialog {...confirm} onCancel={() => setConfirm((c) => ({ ...c, open: false }))} />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">Ticker Management</h2>
          <button
            onClick={fetchTickers}
            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin")} />
          </button>
        </div>

        <div className="glass-card !p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-color)] text-sm font-semibold">
            {loading ? "Loading…" : `${tickers.length} tickers registered`}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 opacity-50">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : tickers.length === 0 ? (
            <div className="flex items-center justify-center h-32 opacity-40 text-sm">No tickers registered yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    {["Symbol", "Name", "Type", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold opacity-40 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickers.map((t) => (
                    <TickerRow key={t.id} ticker={t} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-4 border-t border-[var(--border-color)] bg-[var(--card-bg)]/30">
            <p className="text-xs opacity-40 font-semibold uppercase tracking-wider mb-3">Add New Ticker</p>
            <AddTickerForm onAdded={fetchTickers} />
          </div>
        </div>
      </div>
    </>
  );
}
