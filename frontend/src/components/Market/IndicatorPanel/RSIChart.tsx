import type { RSIResult } from "./types";
import { useTranslation } from "react-i18next";
import { useInterpretation } from "../../../hooks/useInterpretation";

interface Props {
  rsi: RSIResult;
  period: number;
}

export const RSIChart = ({ rsi, period }: Props) => {
  const { t } = useTranslation();
  const interpret = useInterpretation();

  if (rsi.value === null) {
    return <div className="text-xs text-[var(--text-color)]/40 py-3">{interpret(rsi.interpretation)}</div>;
  }

  const val = rsi.value;
  const color = val >= 70 ? "#ef4444" : val <= 30 ? "#22c55e" : "#a78bfa";

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">RSI ({period})</span>
        <span style={{ color }} className="font-bold text-sm">{val.toFixed(2)}</span>
      </div>

      {/* Progress bar gauge */}
      <div className="relative h-2.5 rounded-full bg-[var(--border-color)]/30 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
          style={{ width: `${val}%`, background: color }}
        />
        {/* Overbought line at 70% */}
        <div className="absolute top-0 h-full w-px bg-red-400/70" style={{ left: "70%" }} />
        {/* Oversold line at 30% */}
        <div className="absolute top-0 h-full w-px bg-green-400/70" style={{ left: "30%" }} />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[10px]">
        <span className="text-green-400/70 font-medium">0 — {t("indicator.rsi_oversold_label")}</span>
        <span className="text-red-400/70 font-medium">{t("indicator.rsi_overbought_label")} — 100</span>
      </div>

      {/* Interpretation */}
      <p className="text-[11px] text-[var(--text-color)]/60 leading-relaxed">{interpret(rsi.interpretation)}</p>
    </div>
  );
};
