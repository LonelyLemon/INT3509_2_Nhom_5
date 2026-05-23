import {
  LineChart, Line, ReferenceLine, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import type { RSIResult } from "./types";

interface Props {
  rsi: RSIResult;
  period: number;
}

export const RSIChart = ({ rsi, period }: Props) => {
  if (rsi.value === null) {
    return <div className="text-xs text-[var(--text-color)]/40 py-3">{rsi.interpretation}</div>;
  }

  const val = rsi.value;
  const color = val >= 70 ? "#ef4444" : val <= 30 ? "#22c55e" : "#a78bfa";

  // Single gauge-style bar since we only have one value from DB (no historical series)
  const gaugeData = [{ name: "RSI", value: val }];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">RSI ({period})</span>
        <span style={{ color }} className="font-bold">{val.toFixed(2)}</span>
      </div>
      {/* Progress bar style gauge */}
      <div className="relative h-2 rounded-full bg-[var(--border-color)]/30 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${val}%`, background: color }}
        />
        {/* Overbought line at 70% */}
        <div className="absolute top-0 h-full w-px bg-red-400/60" style={{ left: "70%" }} />
        {/* Oversold line at 30% */}
        <div className="absolute top-0 h-full w-px bg-green-400/60" style={{ left: "30%" }} />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--text-color)]/40">
        <span>0 (Oversold &lt;30)</span>
        <span>100 (Overbought &gt;70)</span>
      </div>
      <p className="text-[11px] text-[var(--text-color)]/60 mt-0.5">{rsi.interpretation}</p>
    </div>
  );
};
