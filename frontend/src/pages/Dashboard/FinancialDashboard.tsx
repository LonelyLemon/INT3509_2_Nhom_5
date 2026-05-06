import React, { useEffect, useState, useRef } from 'react';
import { useMarketStore } from '../../store/useMarketStore';
import { CandlestickChart } from '../../components/Market/CandlestickChart';
import { WatchlistManager } from '../../components/Portfolio/WatchlistManager';
import {
  Search, TrendingUp, TrendingDown,
  Activity, RefreshCw, ChevronRight, Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return String(n);
}

// ── Ticker Card ──────────────────────────────────────────────────────────────
const TickerCard: React.FC<{ symbol: string; isActive: boolean; onClick: () => void }> = ({
  symbol, isActive, onClick,
}) => {
  const { latestPrices } = useMarketStore();
  const q = latestPrices[symbol];
  const bullish = (q?.change_percentage ?? 0) >= 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 w-44 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer',
        isActive
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-md'
          : 'border-[var(--border-color)] bg-[var(--card-bg)]/60 hover:border-[var(--color-primary)]/50 hover:bg-[var(--card-bg)]'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono font-bold tracking-wider text-[var(--color-primary)]">{symbol}</span>
        {isActive && <Zap size={12} className="text-[var(--color-primary)]" />}
      </div>
      {q ? (
        <>
          <div className="text-base font-semibold font-mono">{fmt(q.close)}</div>
          <div className={cn('flex items-center gap-1 text-xs font-medium mt-0.5', bullish ? 'text-green-500' : 'text-red-500')}>
            {bullish ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {bullish ? '+' : ''}{fmt(q.change_percentage)}%
          </div>
        </>
      ) : (
        <div className="space-y-1.5 mt-1">
          <div className="h-3 w-2/3 bg-[var(--border-color)]/60 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-[var(--border-color)]/60 rounded animate-pulse" />
        </div>
      )}
    </button>
  );
};

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string; sub?: string; positive?: boolean }> = ({
  label, value, sub, positive,
}) => (
  <div className="glass-card !p-4 flex flex-col gap-1">
    <span className="text-xs font-medium opacity-50 uppercase tracking-widest">{label}</span>
    <span className={cn('text-xl font-bold font-mono', positive === true ? 'text-green-500' : positive === false ? 'text-red-500' : '')}>{value}</span>
    {sub && <span className="text-xs opacity-50">{sub}</span>}
  </div>
);

// ── Main Dashboard ───────────────────────────────────────────────────────────
export const FinancialDashboard: React.FC = () => {
  const {
    tickers, tickersLoading,
    activeTicker, activeTimeframe,
    candles, candlesLoading, candlesError,
    latestPrices,
    fetchTickers, fetchCandles, fetchLatestPrice,
    setActiveTicker, setActiveTimeframe,
  } = useMarketStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Initial load
  useEffect(() => {
    fetchTickers();
  }, [fetchTickers]);

  // Load candles when active ticker/timeframe changes
  useEffect(() => {
    if (activeTicker) {
      fetchCandles(activeTicker, activeTimeframe);
    }
  }, [activeTicker, activeTimeframe, fetchCandles]);

  // Auto-refresh latest prices every 30s
  useEffect(() => {
    if (!tickers.length) return;
    const id = setInterval(() => {
      tickers.slice(0, 10).forEach((t) => fetchLatestPrice(t.ticker));
    }, 30_000);
    return () => clearInterval(id);
  }, [tickers, fetchLatestPrice]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = searchQuery.trim().toUpperCase();
    if (!sym) return;
    setActiveTicker(sym);
    setSearchQuery('');
    setSearchFocused(false);
    searchRef.current?.blur();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCandles(activeTicker, activeTimeframe),
      ...tickers.slice(0, 10).map((t) => fetchLatestPrice(t.ticker)),
    ]);
    setTimeout(() => setRefreshing(false), 600);
  };

  const activePrice = latestPrices[activeTicker];
  const isBull = (activePrice?.change_percentage ?? 0) >= 0;

  // Filtered tickers for watchlist scroll
  const visibleTickers = tickers.filter(
    (t) => !searchQuery || t.ticker.includes(searchQuery.toUpperCase()) || t.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-[var(--bg-color)]">


      {/* ── CENTER: Chart & Market Data ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0">

        {/* Ticker ribbon */}
        <div className="flex-shrink-0 border-b border-[var(--border-color)] bg-[var(--card-bg)]/40 backdrop-blur px-4 py-3">
          {tickersLoading ? (
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 w-44 rounded-xl bg-[var(--border-color)]/40 animate-pulse flex-shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
              {visibleTickers.map((t) => (
                <TickerCard
                  key={t.ticker}
                  symbol={t.ticker}
                  isActive={activeTicker === t.ticker}
                  onClick={() => setActiveTicker(t.ticker)}
                />
              ))}
              {!tickers.length && (
                <p className="text-sm opacity-50 py-4">No active tickers found. Add some from the admin panel.</p>
              )}
            </div>
          )}
        </div>

        {/* Chart area */}
        <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">

          {/* Header row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight font-mono">{activeTicker || '—'}</h1>
                {activePrice && (
                  <span className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full',
                    isBull ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'
                  )}>
                    {isBull ? '▲' : '▼'} LIVE
                  </span>
                )}
              </div>
              {activePrice ? (
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl font-bold font-mono">{fmt(activePrice.close)}</span>
                  <span className={cn('text-sm font-semibold', isBull ? 'text-green-500' : 'text-red-500')}>
                    {isBull ? '+' : ''}{fmt(activePrice.change_amount)} ({isBull ? '+' : ''}{fmt(activePrice.change_percentage)}%)
                  </span>
                </div>
              ) : activeTicker ? (
                <div className="flex gap-3 mt-1">
                  <div className="h-8 w-28 bg-[var(--border-color)]/40 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-[var(--border-color)]/40 rounded animate-pulse" />
                </div>
              ) : null}
            </div>

            {/* Toolbar: search + timeframe + refresh */}
            <div className="flex items-center gap-2 flex-wrap">
              <form onSubmit={handleSearch} className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none"
                />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  placeholder="Symbol…"
                  className={cn(
                    'pl-8 pr-3 py-1.5 text-sm rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] outline-none font-mono transition-all',
                    searchFocused ? 'w-36 border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'w-24'
                  )}
                />
              </form>

              {/* Timeframe pills */}
              <div className="flex gap-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-1">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setActiveTimeframe(tf.value)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                      activeTimeframe === tf.value
                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                        : 'hover:bg-[var(--border-color)]/40'
                    )}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--color-primary)]/50 transition-all cursor-pointer"
                title="Refresh"
              >
                <RefreshCw size={14} className={cn('transition-transform', refreshing && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Candlestick chart */}
          <div className="glass-card !p-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={14} className="text-[var(--color-primary)]" />
              <span className="text-sm font-semibold opacity-70">
                {activeTicker} · {activeTimeframe.toUpperCase()} · {candles.length} candles
              </span>
            </div>

            {candlesLoading ? (
              <div className="h-[420px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 opacity-50">
                  <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading chart…</span>
                </div>
              </div>
            ) : candlesError ? (
              <div className="h-[420px] flex items-center justify-center">
                <div className="text-center opacity-50">
                  <div className="text-2xl mb-2">📉</div>
                  <p className="text-sm font-medium">{candlesError}</p>
                  <p className="text-xs mt-1 opacity-70">Ticker: {activeTicker} · {activeTimeframe}</p>
                </div>
              </div>
            ) : candles.length === 0 ? (
              <div className="h-[420px] flex items-center justify-center">
                <div className="text-center opacity-50">
                  <div className="text-2xl mb-2">📊</div>
                  <p className="text-sm font-medium">No chart data available</p>
                  <p className="text-xs mt-1 opacity-70">Price data hasn't been ingested for {activeTicker} yet.</p>
                </div>
              </div>
            ) : (
              <CandlestickChart candles={candles} height={420} />
            )}
          </div>

          {/* Stats row */}
          {activePrice && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-shrink-0">
              <StatCard label="Open" value={fmt(activePrice.open)} />
              <StatCard label="High" value={fmt(activePrice.high)} positive />
              <StatCard label="Low" value={fmt(activePrice.low)} positive={false} />
              <StatCard label="Volume" value={fmtCompact(activePrice.volume)} sub="Last 1-min candle" />
            </div>
          )}

          {/* All tickers overview table */}
          {tickers.length > 0 && (
            <div className="glass-card !p-0 overflow-hidden flex-shrink-0">
              <div className="px-5 py-3 border-b border-[var(--border-color)] flex items-center gap-2">
                <TrendingUp size={14} className="text-[var(--color-primary)]" />
                <h3 className="text-sm font-semibold">Market Overview</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-color)]">
                      {['Symbol', 'Type', 'Last Price', 'Change', 'Change %', ''].map((h) => (
                        <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold opacity-50 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tickers.map((t) => {
                      const lp = latestPrices[t.ticker];
                      const bull = (lp?.change_percentage ?? 0) >= 0;
                      return (
                        <tr
                          key={t.ticker}
                          onClick={() => setActiveTicker(t.ticker)}
                          className={cn(
                            'border-b border-[var(--border-color)]/50 cursor-pointer transition-colors hover:bg-[var(--color-primary)]/5',
                            activeTicker === t.ticker && 'bg-[var(--color-primary)]/8'
                          )}
                        >
                          <td className="px-5 py-3 font-mono font-semibold text-[var(--color-primary)]">{t.ticker}</td>
                          <td className="px-5 py-3 opacity-60 text-xs uppercase">{t.asset_type}</td>
                          <td className="px-5 py-3 font-mono">{fmt(lp?.close)}</td>
                          <td className={cn('px-5 py-3 font-mono', bull ? 'text-green-500' : 'text-red-500')}>
                            {lp ? `${bull ? '+' : ''}${fmt(lp.change_amount)}` : '—'}
                          </td>
                          <td className={cn('px-5 py-3 font-mono', bull ? 'text-green-500' : 'text-red-500')}>
                            {lp ? `${bull ? '+' : ''}${fmt(lp.change_percentage)}%` : '—'}
                          </td>
                          <td className="px-5 py-3">
                            <ChevronRight size={14} className="opacity-30" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Watchlist Panel ──────────────────────────────────── */}
      <div className="h-full flex-shrink-0 hidden lg:block w-[18%] min-w-[240px]">
        <WatchlistManager />
      </div>

    </div>
  );
};

export default FinancialDashboard;
