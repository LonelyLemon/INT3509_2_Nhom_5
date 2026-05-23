/**
 * CandlestickChart — powered by TradingView Lightweight Charts.
 *
 * Update strategy:
 * - Initial load: setData() + fitContent()
 * - Earlier candles prepended (historical scroll): setData() + setVisibleRange() to preserve viewport
 * - New candles appended (real-time): series.update() per bar, preserves user scroll
 * - Same timestamp (live tick): series.update() in-place
 */
import { useEffect, useRef, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
  type LogicalRange,
  ColorType,
} from 'lightweight-charts';
import type { Candle } from '../../store/useMarketStore';

interface Props {
  candles: Candle[];
  height?: number;
  /** Called when the user scrolls near the left edge of history. */
  onLoadMore?: () => void;
  /** True while an earlier-candles request is in-flight. Prevents double-firing. */
  loadingEarlier?: boolean;
  /** False once all available history has been loaded. */
  hasMoreHistory?: boolean;
  /** Called after each render with the actual count of bars drawn on the chart. */
  onRenderedCount?: (n: number) => void;
}

const BULL = '#22c55e';
const BEAR = '#ef4444';

function isDark() {
  return document.documentElement.classList.contains('dark');
}

function themeOptions() {
  const dark = isDark();
  return {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.50)',
    },
    grid: {
      vertLines: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' },
      horzLines: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' },
    },
    rightPriceScale: {
      borderVisible: false,
      textColor: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.50)',
    },
    crosshair: {
      vertLine: {
        color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
        labelBackgroundColor: dark ? '#1e293b' : '#e2e8f0',
        width: 1 as const,
      },
      horzLine: {
        color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
        labelBackgroundColor: dark ? '#1e293b' : '#e2e8f0',
        width: 1 as const,
      },
    },
  };
}

export const CandlestickChart: React.FC<Props> = ({
  candles,
  height = 420,
  onLoadMore,
  loadingEarlier = false,
  hasMoreHistory = true,
  onRenderedCount,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Timestamps of the outermost bars currently fed to the series (UTC+7 seconds).
  const lastCandleTimeRef  = useRef<number | null>(null);
  const firstCandleTimeRef = useRef<number | null>(null);

  // Refs that mirror props so the stale chart-setup closure can read live values.
  // This avoids re-running the heavy chart-creation effect on every render.
  const onLoadMoreRef       = useRef(onLoadMore);
  const loadingEarlierRef   = useRef(loadingEarlier);
  const hasMoreHistoryRef   = useRef(hasMoreHistory);

  useEffect(() => { onLoadMoreRef.current     = onLoadMore;     }, [onLoadMore]);
  useEffect(() => { loadingEarlierRef.current  = loadingEarlier; }, [loadingEarlier]);
  useEffect(() => { hasMoreHistoryRef.current  = hasMoreHistory; }, [hasMoreHistory]);

  // Convert raw candles → Lightweight Charts format.
  // The store guarantees candles are sorted ascending (prepend older, append newer),
  // so we avoid a full re-sort: only sort if the array is somehow out of order
  // (detected by the first pair).  This is O(n) in the common case.
  const lwData = useMemo<CandlestickData[]>(() => {
    const UTC7_OFFSET = 7 * 3600;
    const filtered = candles.filter((c) => c.high !== c.low || c.volume > 0);

    // Check whether the store already delivered them in ascending order.
    const needsSort =
      filtered.length > 1 &&
      new Date(filtered[0].timestamp).getTime() > new Date(filtered[1].timestamp).getTime();

    if (needsSort) {
      filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    return filtered.map((c) => ({
      time:  ((new Date(c.timestamp).getTime() / 1000) + UTC7_OFFSET) as UTCTimestamp,
      open:  c.open,
      high:  c.high,
      low:   c.low,
      close: c.close,
    }));
  }, [candles]);

  // Report the actual rendered bar count to the parent after each data change.
  useEffect(() => {
    onRenderedCount?.(lwData.length);
  }, [lwData.length, onRenderedCount]);

  // ── Chart creation (runs once per mount / height change) ──────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height,
      ...themeOptions(),
      timeScale: {
        borderVisible:  false,
        timeVisible:    true,
        secondsVisible: false,
        fixLeftEdge:    false, // allow scrolling into history; we load on demand
        fixRightEdge:   false,
      },
      handleScroll: true,
      handleScale:  true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor:       BULL,
      downColor:     BEAR,
      borderUpColor: BULL,
      borderDownColor: BEAR,
      wickUpColor:   BULL,
      wickDownColor: BEAR,
    });

    chartRef.current     = chart;
    seriesRef.current    = series;
    lastCandleTimeRef.current  = null;
    firstCandleTimeRef.current = null;

    // Resize observer — keeps canvas width in sync with the container.
    const ro = new ResizeObserver((entries) => {
      chart.applyOptions({ width: entries[0].contentRect.width });
    });
    ro.observe(containerRef.current);

    // MutationObserver — re-theme when the dark-mode class toggles.
    const mo = new MutationObserver(() => chart.applyOptions(themeOptions()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Visible-range listener — triggers historical load when near the left edge.
    // Uses refs instead of captured closure values so it always reads the latest
    // loadingEarlier / hasMoreHistory without needing to re-subscribe.
    const handleRangeChange = (range: LogicalRange | null) => {
      if (!range) return;
      if (!onLoadMoreRef.current) return;
      if (!hasMoreHistoryRef.current) return;   // already at the beginning of history
      if (loadingEarlierRef.current) return;     // fetch already in-flight

      if (range.from <= 5) {
        onLoadMoreRef.current();
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      ro.disconnect();
      mo.disconnect();
      chart.remove();
      chartRef.current     = null;
      seriesRef.current    = null;
      lastCandleTimeRef.current  = null;
      firstCandleTimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  // ── Data feed (runs whenever lwData changes) ───────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !lwData.length) return;

    const firstBar = lwData[0];
    const lastBar  = lwData[lwData.length - 1];
    const prevFirst = firstCandleTimeRef.current;
    const prevLast  = lastCandleTimeRef.current;

    if (prevLast === null) {
      // Initial load — replace series data and zoom to fit.
      seriesRef.current.setData(lwData);
      chartRef.current.timeScale().fitContent();

    } else if (prevFirst !== null && (firstBar.time as number) < prevFirst) {
      // Earlier candles were prepended — rebuild the series while keeping the
      // viewport locked to the same time window the user was looking at.
      const visibleRange = chartRef.current.timeScale().getVisibleRange();
      seriesRef.current.setData(lwData);
      if (visibleRange) {
        chartRef.current.timeScale().setVisibleRange(visibleRange);
      }

    } else {
      // New candles appended (real-time) or live-tick in-place update.
      const newBars = lwData.filter((b) => (b.time as number) > prevLast);
      if (newBars.length > 0) {
        for (const bar of newBars) {
          seriesRef.current.update(bar);
        }
      } else {
        seriesRef.current.update(lastBar);
      }
    }

    firstCandleTimeRef.current = firstBar.time as number;
    lastCandleTimeRef.current  = lastBar.time as number;
  }, [lwData]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height }}
        className="rounded-xl overflow-hidden"
      />
      {/* Loading indicator shown while fetching earlier candles */}
      {loadingEarlier && (
        <div
          style={{ position: 'absolute', top: 8, left: 12 }}
          className="flex items-center gap-1.5 text-xs opacity-60"
        >
          <div className="w-3 h-3 border border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <span>Loading history…</span>
        </div>
      )}
      {/* End-of-history indicator */}
      {!hasMoreHistory && !loadingEarlier && (
        <div
          style={{ position: 'absolute', top: 8, left: 12 }}
          className="text-xs opacity-40"
        >
          Beginning of available data
        </div>
      )}
    </div>
  );
};
