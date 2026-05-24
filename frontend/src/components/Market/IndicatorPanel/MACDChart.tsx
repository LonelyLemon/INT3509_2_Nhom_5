import type { MACDResult } from "./types";
import { useTranslation } from "react-i18next";
import { useInterpretation } from "../../../hooks/useInterpretation";

interface Props {
  macd: MACDResult;
  params: { fast: number; slow: number; signal: number };
}

export const MACDChart = ({ macd, params }: Props) => {
  const { t } = useTranslation();
  const interpret = useInterpretation();

  if (macd.macd_line === null) {
    return <div className="text-xs text-[var(--text-color)]/40 py-3">{interpret(macd.interpretation)}</div>;
  }

  const histColor = (macd.histogram ?? 0) >= 0 ? "#22c55e" : "#ef4444";
  const barWidth = Math.min(Math.abs((macd.histogram ?? 0) / (Math.abs(macd.macd_line ?? 1) || 1)) * 100, 100);
  const macdColor = (macd.macd_line ?? 0) >= 0 ? "#22c55e" : "#ef4444";

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="text-xs font-medium opacity-70">
        MACD ({params.fast}, {params.slow}, {params.signal})
      </div>

      {/* 3-column value grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-[var(--border-color)]/15">
          <span className="text-[10px] text-[var(--text-color)]/50 font-medium uppercase tracking-wide">
            {t("indicator.macd_line_label")}
          </span>
          <span className="font-bold text-sm" style={{ color: macdColor }}>
            {macd.macd_line?.toFixed(4)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-[var(--border-color)]/15">
          <span className="text-[10px] text-[var(--text-color)]/50 font-medium uppercase tracking-wide">
            {t("indicator.signal_label")}
          </span>
          <span className="font-bold text-sm text-amber-400">
            {macd.signal_line?.toFixed(4)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-[var(--border-color)]/15">
          <span className="text-[10px] text-[var(--text-color)]/50 font-medium uppercase tracking-wide">
            {t("indicator.histogram_label")}
          </span>
          <span className="font-bold text-sm" style={{ color: histColor }}>
            {macd.histogram?.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Histogram divergence bar */}
      <div className="relative h-2.5 rounded-full bg-[var(--border-color)]/30 overflow-hidden">
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-300"
          style={{
            width: `${barWidth}%`,
            left: (macd.histogram ?? 0) >= 0 ? "50%" : `${50 - barWidth}%`,
            background: histColor,
          }}
        />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[var(--border-color)]" />
      </div>

      {/* Interpretation */}
      <p className="text-[11px] text-[var(--text-color)]/60 leading-relaxed">{interpret(macd.interpretation)}</p>
    </div>
  );
};
