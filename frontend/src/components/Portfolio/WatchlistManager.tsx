import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus, TrendingUp, TrendingDown, Trash2, X, Search, RefreshCw, GripVertical,
} from "lucide-react";
import { api } from "../../lib/api";
import { useMarketStore } from "../../store/useMarketStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssetBrief {
  id: string;
  ticker: string;
  name: string;
  asset_type: string;
}

interface WatchlistItem {
  id: string;
  asset: AssetBrief;
  position: number;
  current_price: number | null;
  change_amount: number | null;
  change_percentage: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number | null): string {
  if (n == null) return "";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

// ── Skeleton card ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-[var(--border-color)]/30 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-16 bg-[var(--border-color)]/30 rounded" />
        <div className="h-2.5 w-24 bg-[var(--border-color)]/20 rounded" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-3 w-14 bg-[var(--border-color)]/30 rounded" />
        <div className="h-2.5 w-10 bg-[var(--border-color)]/20 rounded" />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export const WatchlistManager = () => {
  const { t } = useTranslation();
  const { tickers, fetchTickers, latestPrices, fetchLatestPrice, setActiveTicker, activeTicker } = useMarketStore();

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add panel
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null); // asset id being added

  // Deleting
  const [deleting, setDeleting] = useState<string | null>(null);

  // Drag-and-drop reorder
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Fetch watchlist ──────────────────────────────────────────────────────────

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: WatchlistItem[]; total: number }>("/watchlist");
      const loaded = res.data.items;
      setItems(loaded);
      // Backend price uses 1d data — supplement with latest 1m prices from the price API
      loaded.forEach(item => fetchLatestPrice(item.asset.ticker));
    } catch {
      setError(t("portfolio.watchlist_error_load"));
    } finally {
      setLoading(false);
    }
  }, [fetchLatestPrice]);

  useEffect(() => {
    fetchWatchlist();
    if (tickers.length === 0) fetchTickers();
  }, [fetchWatchlist, fetchTickers, tickers.length]);

  useEffect(() => {
    if (showAdd) {
      setSearch("");
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [showAdd]);

  // ── Add ──────────────────────────────────────────────────────────────────────

  const addItem = async (assetId: string) => {
    setAdding(assetId);
    try {
      const res = await api.post<WatchlistItem>("/watchlist", { asset_id: assetId });
      setItems(prev => {
        // Replace if already present (idempotent), otherwise append
        const exists = prev.some(i => i.asset.id === assetId);
        if (exists) return prev;
        return [...prev, res.data];
      });
      setShowAdd(false);
    } catch {
      // silently ignore — could be duplicate or auth error
    } finally {
      setAdding(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const removeItem = async (assetId: string) => {
    setDeleting(assetId);
    try {
      await api.delete(`/watchlist/${assetId}`);
      setItems(prev => prev.filter(i => i.asset.id !== assetId));
    } catch {
      // silently ignore
    } finally {
      setDeleting(null);
    }
  };

  // ── Reorder ───────────────────────────────────────────────────────────────────

  const handleDrop = async (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) return;
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const withPos = reordered.map((item, i) => ({ ...item, position: i }));
    setItems(withPos); // optimistic update
    setDragIndex(null);
    setDropIndex(null);
    try {
      await api.patch("/watchlist/reorder", {
        items: withPos.map(item => ({ asset_id: item.asset.id, position: item.position })),
      });
    } catch {
      fetchWatchlist(); // restore server order on error
    }
  };

  // ── Filtered tickers for add panel ───────────────────────────────────────────


  const watchlistAssetIds = new Set(items.map(i => i.asset.id));
  const filteredTickers = tickers.filter(t =>
    !watchlistAssetIds.has(t.id) &&
    (
      t.ticker.toUpperCase().includes(search.toUpperCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
    )
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[var(--bg-color)] border-l border-[var(--border-color)] relative overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] flex-shrink-0">
        <div>
          <h2 className="font-semibold text-sm">{t("portfolio.watchlist_title")}</h2>
          {!loading && (
            <p className="text-[10px] text-[var(--text-color)]/40">{items.length} {items.length !== 1 ? t("portfolio.watchlist_assets") : t("portfolio.watchlist_asset")}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchWatchlist}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-[var(--border-color)]/30 transition-colors disabled:opacity-40"
            title={t("dashboard.refresh_tooltip")}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            id="watchlist-add-btn"
            onClick={() => setShowAdd(v => !v)}
            className="p-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
            title={t("portfolio.watchlist_add_tooltip")}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Add panel */}
      {showAdd && (
        <div className="border-b border-[var(--border-color)] bg-[var(--card-bg)] flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2">
            <Search size={13} className="text-[var(--text-color)]/40 flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("portfolio.watchlist_search_placeholder")}
              className="flex-1 text-xs bg-transparent outline-none"
            />
            <button onClick={() => setShowAdd(false)} className="text-[var(--text-color)]/40 hover:text-[var(--text-color)] transition-colors">
              <X size={13} />
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filteredTickers.length === 0 ? (
              <p className="text-xs text-[var(--text-color)]/40 px-4 py-3">
                {search ? t("portfolio.watchlist_no_matches") : t("portfolio.watchlist_all_added")}
              </p>
            ) : (
              filteredTickers.slice(0, 20).map(t => (
                <button
                  key={t.id}
                  onClick={() => addItem(t.id)}
                  disabled={adding === t.id}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[var(--border-color)]/20 transition-colors disabled:opacity-50"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {t.ticker.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{t.ticker}</p>
                    <p className="text-[10px] text-[var(--text-color)]/50 truncate">{t.name}</p>
                  </div>
                  <Plus size={12} className="text-[var(--text-color)]/30 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-2">
            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          <div className="p-4 text-xs text-rose-400 text-center">
            {error}
            <button onClick={fetchWatchlist} className="block mx-auto mt-2 text-[var(--color-primary)] hover:underline">{t("news.retry")}</button>
          </div>
        ) : items.length === 0 ? (
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex flex-col items-center justify-center h-full gap-3 text-center px-4 w-full hover:bg-[var(--color-primary)]/5 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 group-hover:bg-[var(--color-primary)]/20 flex items-center justify-center transition-colors">
              <Plus size={22} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium mb-0.5">{t("portfolio.watchlist_empty")}</p>
              <p className="text-xs text-[var(--text-color)]/50">{t("portfolio.watchlist_empty_hint")}</p>
            </div>
          </button>
        ) : (
          <ul className="py-1">
            {items.map((item, idx) => {
              // Backend price comes from 1d data; fall back to latestPrices (1m) if null
              const lp = latestPrices[item.asset.ticker];
              const displayPrice = item.current_price ?? lp?.close ?? null;
              const displayPct = item.change_percentage ?? lp?.change_percentage ?? null;

              const isBull = (displayPct ?? 0) > 0;
              const isBear = (displayPct ?? 0) < 0;
              const avatarBg = isBull
                ? "bg-emerald-500/10 text-emerald-500"
                : isBear
                  ? "bg-rose-500/10 text-rose-500"
                  : "bg-[var(--border-color)]/30 text-[var(--text-color)]/50";

              const isDragging = dragIndex === idx;
              const isDropTarget = dropIndex === idx && dragIndex !== null && dragIndex !== idx;

              const isActive = item.asset.ticker === activeTicker;

              return (
                <li
                  key={item.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={e => { e.preventDefault(); setDropIndex(idx); }}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => { setDragIndex(null); setDropIndex(null); }}
                  onClick={() => setActiveTicker(item.asset.ticker)}
                  className={[
                    "group flex items-center gap-2 px-2 py-2.5 transition-colors cursor-pointer",
                    isDragging ? "opacity-40" : "opacity-100",
                    isDropTarget
                      ? "border-t-2 border-[var(--color-primary)]"
                      : "border-t-2 border-transparent",
                    isActive
                      ? "bg-[var(--color-primary)]/8 border-l-2 border-l-[var(--color-primary)]"
                      : "hover:bg-[var(--border-color)]/15",
                  ].join(" ")}
                >
                  {/* Drag handle */}
                  <div
                    className="flex-shrink-0 cursor-grab active:cursor-grabbing text-[var(--text-color)]/20 group-hover:text-[var(--text-color)]/40 transition-colors"
                    title={t("portfolio.watchlist_drag_tooltip")}
                  >
                    <GripVertical size={14} />
                  </div>

                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarBg}`}>
                    {item.asset.ticker.slice(0, 3)}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{item.asset.ticker}</p>
                    <p className="text-[10px] text-[var(--text-color)]/50 truncate">{item.asset.name}</p>
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold">{fmtPrice(displayPrice)}</p>
                    <p className={`text-[10px] flex items-center justify-end gap-0.5 ${isBull ? "text-emerald-500" : isBear ? "text-rose-500" : "text-[var(--text-color)]/40"}`}>
                      {isBull ? <TrendingUp size={10} /> : isBear ? <TrendingDown size={10} /> : null}
                      {fmtPct(displayPct)}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeItem(item.asset.id)}
                    disabled={deleting === item.asset.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-rose-400 disabled:opacity-30 flex-shrink-0"
                    title={t("portfolio.watchlist_remove_tooltip")}
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
