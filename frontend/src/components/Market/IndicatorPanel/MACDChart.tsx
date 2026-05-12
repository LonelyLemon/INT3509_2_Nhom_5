import type { MACDResult } from "./types";

interface Props {
  macd: MACDResult;
  params: { fast: number; slow: number; signal: number };
}

export const MACDChart = ({ macd, params }: Props) => {
  if (macd.macd_line === null) {
    return <div className="text-xs text-[var(--text-color)]/40 py-3">{macd.interpretation}</div>;
  }

  const histColor = (macd.histogram ?? 0) >= 0 ? "#22c55e" : "#ef4444";
  const barWidth = Math.min(Math.abs((macd.histogram ?? 0) / (Math.abs(macd.macd_line ?? 1) || 1)) * 100, 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">MACD ({params.fast},{params.slow},{params.signal})</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col items-center gap-0.5 p-2 rounded-lg bg-[var(--border-color)]/15">
          <span className="text-[10px] text-[var(--text-color)]/50">MACD Line</span>
          <span className="font-bold" style={{ color: (macd.macd_line ?? 0) >= 0 ? "#22c55e" : "#ef4444" }}>
            {macd.macd_line?.toFixed(4)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5 p-2 rounded-lg bg-[var(--border-color)]/15">
          <span className="text-[10px] text-[var(--text-color)]/50">Signal</span>
          <span className="font-bold text-amber-400">{macd.signal_line?.toFixed(4)}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 p-2 rounded-lg bg-[var(--border-color)]/15">
          <span className="text-[10px] text-[var(--text-color)]/50">Histogram</span>
          <span className="font-bold" style={{ color: histColor }}>{macd.histogram?.toFixed(4)}</span>
        </div>
      </div>
      {/* Histogram bar */}
      <div className="relative h-2 rounded-full bg-[var(--border-color)]/30 overflow-hidden">
        <div
          className="absolute top-0 h-full rounded-full transition-all"
          style={{
            width: `${barWidth}%`,
            left: (macd.histogram ?? 0) >= 0 ? "50%" : `${50 - barWidth}%`,
            background: histColor,
          }}
        />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[var(--border-color)]" />
      </div>
      <p className="text-[11px] text-[var(--text-color)]/60">{macd.interpretation}</p>
    </div>
  );
};
