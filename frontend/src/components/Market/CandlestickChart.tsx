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
  ColorType,
} from 'lightweight-charts';
import type { Candle } from '../../store/useMarketStore';

interface Props {
  candles: Candle[];
  height?: number;
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

export const CandlestickChart: React.FC<Props> = ({ candles, height = 420 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Tracks the timestamp of the last candle fed to the series so we can
  // distinguish "new candle appended" from "full dataset replaced".
  const lastCandleTimeRef = useRef<number | null>(null);

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
        fixLeftEdge: true,
        fixRightEdge: false, // allow user to scroll past the last bar
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

    return () => {
      ro.disconnect();
      mo.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lastCandleTimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  // Feed data whenever candles change.
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !lwData.length) return;

    const lastBar = lwData[lwData.length - 1];

    if (lastCandleTimeRef.current === null) {
      // Initial load: replace all data and fit the full history in view.
      seriesRef.current.setData(lwData);
      chartRef.current.timeScale().fitContent();
    } else if (lastBar.time > lastCandleTimeRef.current) {
      // A new candle arrived: append it without resetting the user's view.
      seriesRef.current.update(lastBar);
    } else {
      // Same last timestamp (e.g. last candle of current bar updated in-place).
      seriesRef.current.update(lastBar);
    }

    lastCandleTimeRef.current = lastBar.time as number;
  }, [lwData]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height }}
      className="rounded-xl overflow-hidden"
    />
  );
};
