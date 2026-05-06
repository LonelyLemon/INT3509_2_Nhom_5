import { create } from 'zustand';
import { api } from '../lib/api';

export interface Ticker {
  id: string;
  ticker: string;
  name: string;
  asset_type: string;
  is_active: boolean;
}

export interface LatestPrice {
  ticker: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change_amount: number | null;
  change_percentage: number | null;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketState {
  tickers: Ticker[];
  tickersLoading: boolean;
  latestPrices: Record<string, LatestPrice>;
  activeTicker: string;
  activeTimeframe: string;
  candles: Candle[];
  candlesLoading: boolean;
  candlesError: string | null;

  fetchTickers: () => Promise<void>;
  fetchLatestPrice: (ticker: string) => Promise<void>;
  fetchCandles: (ticker: string, timeframe: string) => Promise<void>;
  setActiveTicker: (ticker: string) => void;
  setActiveTimeframe: (tf: string) => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  tickers: [],
  tickersLoading: false,
  latestPrices: {},
  activeTicker: '',
  activeTimeframe: '1h',
  candles: [],
  candlesLoading: false,
  candlesError: null,

  fetchTickers: async () => {
    set({ tickersLoading: true });
    try {
      const res = await api.get('/price/tickers', { params: { is_active: true, limit: 50 } });
      const tickers: Ticker[] = res.data;
      set({ tickers, tickersLoading: false });
      // Set first ticker as active if none selected
      if (!get().activeTicker && tickers.length > 0) {
        set({ activeTicker: tickers[0].ticker });
      }
      // Fetch latest price for all tickers (up to 10 to avoid overload)
      tickers.slice(0, 10).forEach((t) => get().fetchLatestPrice(t.ticker));
    } catch {
      set({ tickersLoading: false });
    }
  },

  fetchLatestPrice: async (ticker: string) => {
    try {
      const res = await api.get(`/price/${ticker}/latest`);
      set((state) => ({
        latestPrices: { ...state.latestPrices, [ticker]: res.data },
      }));
    } catch {
      // silently skip — ticker may have no data yet
    }
  },

  fetchCandles: async (ticker: string, timeframe: string) => {
    if (!ticker) return;
    set({ candlesLoading: true, candlesError: null });
    try {
      const res = await api.get(`/price/${ticker}`, {
        params: { timeframe, limit: 200 },
      });
      set({ candles: res.data.data ?? [], candlesLoading: false });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const errorMsg =
        status === 404
          ? `Ticker "${ticker}" is not registered in the database. Ask an admin to add it via POST /price/tickers.`
          : 'Failed to load chart data.';
      set({ candles: [], candlesLoading: false, candlesError: errorMsg });
    }
  },

  setActiveTicker: (ticker) => {
    set({ activeTicker: ticker });
    get().fetchCandles(ticker, get().activeTimeframe);
    get().fetchLatestPrice(ticker);
  },

  setActiveTimeframe: (tf) => {
    set({ activeTimeframe: tf });
    if (get().activeTicker) {
      get().fetchCandles(get().activeTicker, tf);
    }
  },
}));
