/**
 * CandlestickChart — powered by TradingView Lightweight Charts.
 *
 * Lightweight Charts renders a proper candlestick series on a <canvas>,
 * so wicks, bodies, and colours are pixel-perfect at any zoom level.
 * The chart auto-fits to the container width via a ResizeObserver and
 * updates grid/text/bg colours whenever the dark-mode class on <html> changes.
 *
 * Update strategy:
 * - On initial data load (or after ticker/timeframe change via key remount):
 *   setData() + fitContent() to show the full history.
 * - On subsequent silent refreshes (new candle every ~1 min):
 *   series.update() for the last bar only — preserves the user's zoom/scroll.
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
  /** Called when the user scrolls to (or near) the left edge of history. */
  onLoadMore?: () => void;
}

const BULL = '#22c55e'; // green-500
const BEAR = '#ef4444'; // red-500

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
      vertLine: { color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', labelBackgroundColor: dark ? '#1e293b' : '#e2e8f0', width: 1 as const },
      horzLine: { color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', labelBackgroundColor: dark ? '#1e293b' : '#e2e8f0', width: 1 as const },
    },
  };
}

export const CandlestickChart: React.FC<Props> = ({ candles, height = 420, onLoadMore }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Timestamps used to detect what changed between renders:
  //  lastCandleTimeRef  — timestamp of the rightmost (newest) bar
  //  firstCandleTimeRef — timestamp of the leftmost (oldest) bar
  // Both are in the chart's shifted-UTC seconds space.
  const lastCandleTimeRef = useRef<number | null>(null);
  const firstCandleTimeRef = useRef<number | null>(null);
  // Keep a stable ref to onLoadMore to avoid re-running the chart-setup
  // effect every time the parent re-renders.
  const onLoadMoreRef = useRef<(() => void) | undefined>(onLoadMore);
  // Prevent firing loadMore multiple times while a fetch is already in-flight.
  const loadingEarlierRef = useRef(false);

  // Sync the ref whenever the prop changes.
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Convert candles → Lightweight Charts CandlestickData (sorted asc)
  const lwData = useMemo<CandlestickData[]>(() => {
    const UTC7_OFFSET = 7 * 3600; // seconds
    return [...candles]
      .filter((c) => c.high !== c.low || c.volume > 0) // skip flat bars (yfinance live tick artifacts)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((c) => ({
        time: ((new Date(c.timestamp).getTime() / 1000) + UTC7_OFFSET) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
  }, [candles]);

  // Create chart once on mount. The parent passes a key={ticker-timeframe} prop
  // so this component remounts (and the chart is recreated) whenever the active
  // ticker or timeframe changes — no stale series data leaks between views.
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      ...themeOptions(),
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false, // allow scrolling into history (we load more on demand)
        fixRightEdge: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: BULL,
      downColor: BEAR,
      borderUpColor: BULL,
      borderDownColor: BEAR,
      wickUpColor: BULL,
      wickDownColor: BEAR,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    lastCandleTimeRef.current = null;
    firstCandleTimeRef.current = null;

    // ── Resize observer: sync width with container ──────────────────────────
    const ro = new ResizeObserver((entries) => {
      chart.applyOptions({ width: entries[0].contentRect.width });
    });
    ro.observe(containerRef.current);

    // ── MutationObserver: re-theme when dark class toggles on <html> ────────
    const mo = new MutationObserver(() => {
      chart.applyOptions(themeOptions());
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // ── Visible-range listener: load more history when near left edge ────────
    const handleRangeChange = (range: LogicalRange | null) => {
      if (!range || !onLoadMoreRef.current) return;
      // Trigger when the leftmost visible bar index falls to 5 or below.
      if (range.from <= 5 && !loadingEarlierRef.current) {
        loadingEarlierRef.current = true;
        onLoadMoreRef.current();
        // Re-enable after a short delay so rapid scrolling doesn't spam requests.
        setTimeout(() => { loadingEarlierRef.current = false; }, 1500);
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      ro.disconnect();
      mo.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lastCandleTimeRef.current = null;
      firstCandleTimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  // Feed data whenever candles change.
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !lwData.length) return;

    const firstBar = lwData[0];
    const lastBar  = lwData[lwData.length - 1];
    const prevFirst = firstCandleTimeRef.current;
    const prevLast  = lastCandleTimeRef.current;

    if (prevLast === null) {
      // ── Initial load: replace all data and fit the full history ──────────
      seriesRef.current.setData(lwData);
      chartRef.current.timeScale().fitContent();

    } else if (prevFirst !== null && (firstBar.time as number) < prevFirst) {
      // ── Earlier candles prepended (historical scroll load) ────────────────
      // Preserve the visible time range so the viewport doesn't jump.
      const visibleRange = chartRef.current.timeScale().getVisibleRange();
      seriesRef.current.setData(lwData);
      if (visibleRange) {
        chartRef.current.timeScale().setVisibleRange(visibleRange);
      }

    } else {
      // ── New candles appended or in-place price update ─────────────────────
      // Collect every bar newer than the last known timestamp and push them
      // all to the series.  A single-bar update also covers the live-tick
      // case (same timestamp, price refreshed).
      const newBars = lwData.filter((b) => (b.time as number) > prevLast);
      if (newBars.length > 0) {
        for (const bar of newBars) {
          seriesRef.current.update(bar);
        }
      } else {
        // No new timestamp — update the current (live) bar in-place.
        seriesRef.current.update(lastBar);
      }
    }

    firstCandleTimeRef.current = firstBar.time as number;
    lastCandleTimeRef.current  = lastBar.time as number;
    // Allow the next load-more request now that the chart has been updated.
    loadingEarlierRef.current = false;
  }, [lwData]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height }}
      className="rounded-xl overflow-hidden"
    />
  );
};
