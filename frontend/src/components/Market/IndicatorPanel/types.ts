export interface RSIResult {
  value: number | null;
  interpretation: string;
}

export interface MACDResult {
  macd_line: number | null;
  signal_line: number | null;
  histogram: number | null;
  interpretation: string;
}

export interface MovingAveragePoint {
  period: number;
  value: number | null;
  vs_price: number | null;
  interpretation: string;
}

export interface IndicatorData {
  ticker: string;
  timeframe: string;
  current_price: number | null;
  candles_used: number;
  RSI: RSIResult | null;
  MACD: MACDResult | null;
  SMA: MovingAveragePoint[];
  EMA: MovingAveragePoint[];
}

export interface IndicatorSettings {
  RSI: { period: number };
  MACD: { fast: number; slow: number; signal: number };
  SMA: { periods: number[] };
  EMA: { periods: number[] };
}
