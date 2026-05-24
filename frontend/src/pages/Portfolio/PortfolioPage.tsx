import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus, Trash2, Pencil, Check, X, ChevronRight,
  TrendingUp, TrendingDown, Loader2, Star,
} from "lucide-react";
import { api } from "../../lib/api";
import { useMarketStore } from "../../store/useMarketStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssetBrief { id: string; ticker: string; name: string | null; asset_type: string; }
interface Holding {
  id: string; asset: AssetBrief; quantity: number;
  notes: string | null;
  current_price: number | null; current_value: number | null;
  allocation: number | null;
}
interface PortfolioSummary {
  total_value: number;
}
interface Portfolio { id: string; name: string; description: string | null; is_default: boolean; }
interface PortfolioDetail extends Portfolio { holdings: Holding[]; summary: PortfolioSummary; }

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number | null, d = 2) =>
  n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
// Compact: 1,234,567 → $1.23M, 12,345 → $12.3K
const fmtC = (n: number | null) => {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean | null }) {
  const valueColor = positive == null ? "" : positive ? "text-emerald-500" : "text-rose-500";
  return (
    <div className="glass-card !p-4 flex flex-col gap-1">
      <p className="text-xs text-[var(--text-color)]/50">{label}</p>
      <div className={`flex items-center gap-1 ${valueColor}`}>
        {positive === true && <TrendingUp size={18} className="flex-shrink-0" />}
        {positive === false && <TrendingDown size={18} className="flex-shrink-0" />}
        <p className="text-xl font-bold break-all leading-tight">{value}</p>
      </div>
      {sub && (
        <p className={`text-xs font-medium ${positive == null ? "text-[var(--text-color)]/50" : positive ? "text-emerald-500" : "text-rose-500"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export const PortfolioPage = () => {
  const { t } = useTranslation();
  const { tickers, fetchTickers, latestPrices, fetchLatestPrice } = useMarketStore();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [active, setActive] = useState<PortfolioDetail | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Portfolio create
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Portfolio rename
  const [editingPortfolio, setEditingPortfolio] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Holding add
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [holdingSearch, setHoldingSearch] = useState("");
  const [holdingAssetId, setHoldingAssetId] = useState("");
  const [holdingQty, setHoldingQty] = useState("");
  const [holdingNotes, setHoldingNotes] = useState("");
  const [addingHolding, setAddingHolding] = useState(false);

  // Holding edit
  const [editHolding, setEditHolding] = useState<Holding | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Portfolio description edit
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDescValue, setEditDescValue] = useState("");

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadPortfolios = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await api.get<Portfolio[]>("/portfolio");
      setPortfolios(res.data);
      if (res.data.length > 0 && !active) {
        loadDetail(res.data.find(p => p.is_default)?.id ?? res.data[0].id);
      }
    } finally { setListLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get<PortfolioDetail>(`/portfolio/${id}`);
      setActive(res.data);
      res.data.holdings.forEach(h => fetchLatestPrice(h.asset.ticker));
    } finally { setDetailLoading(false); }
  }, [fetchLatestPrice]);

  useEffect(() => {
    loadPortfolios();
    if (tickers.length === 0) fetchTickers();
  }, [loadPortfolios, fetchTickers, tickers.length]);

  // ── Portfolio CRUD ────────────────────────────────────────────────────────────

  const createPortfolio = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post<Portfolio>("/portfolio", { name: newName.trim(), description: newDesc.trim() || null });
      setPortfolios(prev => [...prev, res.data]);
      setNewName(""); setNewDesc(""); setShowCreate(false);
      loadDetail(res.data.id);
    } finally { setCreating(false); }
  };

  const renamePortfolio = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const res = await api.patch<Portfolio>(`/portfolio/${id}`, { name: editName.trim() });
      setPortfolios(prev => prev.map(p => p.id === id ? res.data : p));
      if (active?.id === id) setActive(prev => prev ? { ...prev, name: res.data.name } : prev);
    } finally { setEditingPortfolio(null); }
  };

  const saveDescription = async () => {
    if (!active) return;
    const desc = editDescValue.trim() || null;
    await api.patch(`/portfolio/${active.id}`, { description: desc });
    setActive(prev => prev ? { ...prev, description: desc } : prev);
    setPortfolios(prev => prev.map(p => p.id === active.id ? { ...p, description: desc } : p));
    setEditingDesc(false);
  };

  const deletePortfolio = async (id: string) => {
    await api.delete(`/portfolio/${id}`);
    const remaining = portfolios.filter(p => p.id !== id);
    setPortfolios(remaining);
    if (active?.id === id) {
      setActive(null);
      if (remaining.length > 0) loadDetail(remaining[0].id);
    }
  };

  // ── Holding CRUD ──────────────────────────────────────────────────────────────

  const filteredTickers = tickers.filter(t =>
    t.ticker.toUpperCase().includes(holdingSearch.toUpperCase()) ||
    (t.name ?? "").toLowerCase().includes(holdingSearch.toLowerCase())
  );

  const addHolding = async () => {
    if (!active || !holdingAssetId || !holdingQty) return;
    setAddingHolding(true);
    try {
      await api.post(`/portfolio/${active.id}/holdings`, {
        asset_id: holdingAssetId,
        quantity: parseFloat(holdingQty),
        notes: holdingNotes.trim() || null,
      });
      setShowAddHolding(false);
      setHoldingAssetId(""); setHoldingSearch(""); setHoldingQty(""); setHoldingNotes("");
      loadDetail(active.id);
    } finally { setAddingHolding(false); }
  };

  const saveHolding = async () => {
    if (!active || !editHolding) return;
    await api.patch(`/portfolio/${active.id}/holdings/${editHolding.id}`, {
      quantity: parseFloat(editQty),
      notes: editNotes.trim() || null,
    });
    setEditHolding(null);
    loadDetail(active.id);
  };

  const deleteHolding = async (holdingId: string) => {
    if (!active) return;
    await api.delete(`/portfolio/${active.id}/holdings/${holdingId}`);
    loadDetail(active.id);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: portfolio list ─────────────────────────────────────────── */}
      <aside className="w-50 flex-shrink-0 flex flex-col border-r border-[var(--border-color)] bg-[var(--card-bg)]/50">
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border-color)]">
          <h1 className="font-bold text-base">{t("portfolio.portfolios_title")}</h1>
          <button onClick={() => setShowCreate(v => !v)} className="p-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors" title={t("portfolio.new_portfolio_tooltip")}>
            <Plus size={14} />
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="p-3 border-b border-[var(--border-color)] space-y-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("portfolio.portfolio_name_placeholder")} className="input-field w-full text-sm" />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder={t("portfolio.portfolio_desc_placeholder")} className="input-field w-full text-sm" />
            <div className="flex gap-2">
              <button onClick={createPortfolio} disabled={creating || !newName.trim()} className="btn-primary flex-1 text-xs py-1.5 disabled:opacity-50 flex items-center justify-center gap-1">
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {t("portfolio.create_btn")}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] hover:bg-[var(--border-color)]/30 transition-colors">
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Portfolio items */}
        <div className="flex-1 overflow-y-auto py-2">
          {listLoading ? (
            <div className="space-y-2 p-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-[var(--border-color)]/20 animate-pulse" />)}
            </div>
          ) : portfolios.length === 0 ? (
            <p className="text-xs text-[var(--text-color)]/40 text-center p-6">{t("portfolio.no_portfolios")}</p>
          ) : portfolios.map(p => (
            <div
              key={p.id}
              onClick={() => loadDetail(p.id)}
              className={[
                "group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors",
                active?.id === p.id
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-l-2 border-[var(--color-primary)]"
                  : "hover:bg-[var(--border-color)]/20",
              ].join(" ")}
            >
              {p.is_default && <Star size={11} className="text-yellow-400 flex-shrink-0 fill-yellow-400" />}
              {editingPortfolio === p.id ? (
                <input
                  value={editName} onChange={e => setEditName(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => { if (e.key === "Enter") renamePortfolio(p.id); if (e.key === "Escape") setEditingPortfolio(null); }}
                  className="flex-1 text-sm bg-transparent border-b border-[var(--color-primary)] outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm truncate font-medium">{p.name}</span>
              )}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                {editingPortfolio === p.id ? (
                  <>
                    <button onClick={e => { e.stopPropagation(); renamePortfolio(p.id); }} className="p-1 rounded hover:text-emerald-400"><Check size={11} /></button>
                    <button onClick={e => { e.stopPropagation(); setEditingPortfolio(null); }} className="p-1 rounded hover:text-rose-400"><X size={11} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={e => { e.stopPropagation(); setEditingPortfolio(p.id); setEditName(p.name); }} className="p-1 rounded hover:text-[var(--color-primary)]"><Pencil size={11} /></button>
                    <button onClick={e => { e.stopPropagation(); deletePortfolio(p.id); }} className="p-1 rounded hover:text-rose-400"><Trash2 size={11} /></button>
                  </>
                )}
              </div>
              <ChevronRight size={13} className="flex-shrink-0 opacity-40" />
            </div>
          ))}
        </div>
      </aside>

      {/* ── Right: portfolio detail ──────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {detailLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : !active ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <button
              onClick={() => setShowCreate(v => !v)}
              className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 flex items-center justify-center transition-colors cursor-pointer"
              title={t("portfolio.create_new_tooltip")}
            >
              <Plus size={28} className="text-[var(--color-primary)]" />
            </button>
            <p className="text-lg font-semibold">{t("portfolio.select_or_create")}</p>
            <p className="text-sm text-[var(--text-color)]/50">{t("portfolio.select_or_create_hint")}</p>
            <button
              onClick={() => setShowCreate(v => !v)}
              className="btn-primary flex items-center gap-2 text-sm px-5 py-2"
            >
              <Plus size={15} /> {t("portfolio.new_portfolio_btn")}
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold">{active.name}</h2>
                {editingDesc ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      value={editDescValue}
                      onChange={e => setEditDescValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveDescription(); if (e.key === "Escape") setEditingDesc(false); }}
                      placeholder={t("portfolio.add_description_placeholder")}
                      className="input-field text-sm flex-1"
                      autoFocus
                    />
                    <button onClick={saveDescription} className="p-1 rounded hover:text-emerald-400 transition-colors"><Check size={13} /></button>
                    <button onClick={() => setEditingDesc(false)} className="p-1 rounded hover:text-rose-400 transition-colors"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group/desc mt-0.5">
                    <p className="text-sm text-[var(--text-color)]/50">
                      {active.description ?? <span className="italic">{t("portfolio.no_description")}</span>}
                    </p>
                    <button
                      onClick={() => { setEditingDesc(true); setEditDescValue(active.description ?? ""); }}
                      className="opacity-0 group-hover/desc:opacity-100 p-0.5 rounded hover:text-[var(--color-primary)] transition-all"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => { setShowAddHolding(v => !v); setHoldingSearch(""); setHoldingAssetId(""); }}
                className="btn-primary flex items-center gap-2 text-sm px-4 py-2 flex-shrink-0"
              >
                <Plus size={15} /> {t("portfolio.add_holding_btn")}
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label={t("portfolio.total_value")} value={`$${fmt(active.summary.total_value)}`} />
            </div>

            {/* Add holding form */}
            {showAddHolding && (
              <div className="glass-card !p-5 space-y-4">
                <h3 className="font-semibold text-sm">{t("portfolio.add_holding_title")}</h3>

                {/* Ticker search */}
                {!holdingAssetId ? (
                  <div>
                    <input
                      value={holdingSearch} onChange={e => setHoldingSearch(e.target.value)}
                      placeholder={t("portfolio.search_ticker_placeholder")}
                      className="input-field w-full text-sm"
                      autoFocus
                    />
                    {holdingSearch && (
                      <div className="mt-1 border border-[var(--border-color)] rounded-lg overflow-hidden max-h-40 overflow-y-auto bg-[var(--card-bg)]">
                        {filteredTickers.slice(0, 10).map(t => (
                          <button key={t.id} onClick={() => { setHoldingAssetId(t.id); setHoldingSearch(t.ticker); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--border-color)]/20 transition-colors">
                            <span className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-[10px] font-bold flex-shrink-0">{t.ticker.slice(0, 2)}</span>
                            <div>
                              <p className="text-xs font-semibold">{t.ticker}</p>
                              <p className="text-[10px] text-[var(--text-color)]/50 truncate">{t.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-[var(--color-primary)]">{holdingSearch}</span>
                    <button onClick={() => { setHoldingAssetId(""); setHoldingSearch(""); }} className="text-[var(--text-color)]/40 hover:text-rose-400 transition-colors"><X size={13} /></button>
                  </div>
                )}

                <div>
                  <label className="text-xs text-[var(--text-color)]/50 mb-1 block">{t("portfolio.qty_label")}</label>
                  <input type="number" min="0" value={holdingQty} onChange={e => setHoldingQty(e.target.value)} placeholder="e.g. 100" className="input-field w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-color)]/50 mb-1 block">{t("portfolio.notes_label")}</label>
                  <input value={holdingNotes} onChange={e => setHoldingNotes(e.target.value)} placeholder={t("portfolio.notes_placeholder")} className="input-field w-full text-sm" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddHolding(false)} className="px-4 py-1.5 text-sm rounded-lg border border-[var(--border-color)] hover:bg-[var(--border-color)]/30 transition-colors">{t("forum.cancel_btn")}</button>
                  <button
                    onClick={addHolding}
                    disabled={addingHolding || !holdingAssetId || !holdingQty}
                    className="btn-primary px-4 py-1.5 text-sm disabled:opacity-50 flex items-center gap-1"
                  >
                    {addingHolding ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {t("portfolio.add_btn")}
                  </button>
                </div>
              </div>
            )}

            {/* Holdings table */}
            {active.holdings.length === 0 ? (
              <button
                onClick={() => { setShowAddHolding(v => !v); setHoldingSearch(""); setHoldingAssetId(""); }}
                className="glass-card !p-10 w-full text-center flex flex-col items-center gap-3 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 group-hover:bg-[var(--color-primary)]/20 flex items-center justify-center transition-colors">
                  <Plus size={22} className="text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-color)]/70">{t("portfolio.no_holdings")}</p>
                  <p className="text-xs text-[var(--text-color)]/40 mt-0.5">{t("portfolio.no_holdings_hint")}</p>
                </div>
              </button>
            ) : (
              <div className="glass-card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--border-color)] text-xs text-[var(--text-color)]/50 uppercase">
                      <tr>
                        {[t("portfolio.table_asset"), t("portfolio.table_qty"), t("portfolio.table_price"), t("portfolio.table_value"), t("portfolio.table_alloc"), ""].map(h => (
                          <th key={h} className="px-3 py-3 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {active.holdings.map(h => {
                        const lp = latestPrices[h.asset.ticker];
                        const price = h.current_price ?? lp?.close ?? null;
                        const value = price != null ? h.quantity * price : h.current_value;
                        const isEditing = editHolding?.id === h.id;

                        return (
                          <tr key={h.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--border-color)]/10 transition-colors align-top">
                            {/* Asset + note */}
                            <td className="px-3 py-2.5">
                              <div className="flex items-start gap-2">
                                <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                                  {h.asset.ticker.slice(0, 3)}
                                </div>
                                <div>
                                  <p className="font-semibold text-xs">{h.asset.ticker}</p>
                                  <p className="text-[10px] text-[var(--text-color)]/50">{h.asset.name}</p>
                                  {isEditing ? (
                                    <input
                                      value={editNotes}
                                      onChange={e => setEditNotes(e.target.value)}
                                      placeholder={t("portfolio.add_note_placeholder")}
                                      className="input-field w-full text-[10px] py-0.5 mt-0.5"
                                    />
                                  ) : h.notes ? (
                                    <p className="text-[10px] text-[var(--color-primary)]/70 italic mt-0.5">📝 {h.notes}</p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            {/* Qty */}
                            <td className="px-3 py-2.5">
                              {isEditing
                                ? <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} className="input-field w-20 text-xs py-1" />
                                : <span className="text-xs">{fmt(h.quantity, 0)}</span>}
                            </td>
                            {/* Current price */}
                            <td className="px-3 py-2.5 text-xs">{price != null ? fmtC(price) : "—"}</td>
                            {/* Value */}
                            <td className="px-3 py-2.5 text-xs">{value != null ? fmtC(value) : "—"}</td>
                            {/* Allocation */}
                            <td className="px-3 py-2.5 text-xs">{h.allocation != null ? `${h.allocation.toFixed(1)}%` : "—"}</td>
                            {/* Actions */}
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1 flex-nowrap">
                                {isEditing ? (
                                  <>
                                    <button onClick={saveHolding} className="p-1 rounded hover:text-emerald-400 transition-colors"><Check size={12} /></button>
                                    <button onClick={() => setEditHolding(null)} className="p-1 rounded hover:text-rose-400 transition-colors"><X size={12} /></button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => { setEditHolding(h); setEditQty(String(h.quantity)); setEditNotes(h.notes ?? ""); }} className="p-1 rounded hover:text-[var(--color-primary)] transition-colors"><Pencil size={12} /></button>
                                    <button onClick={() => deleteHolding(h.id)} className="p-1 rounded hover:text-rose-400 transition-colors"><Trash2 size={12} /></button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
