import React, { useState, useEffect, useCallback } from "react";
import { Settings, ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { RSIChart } from "./RSIChart";
import { MACDChart } from "./MACDChart";
import type { IndicatorData, IndicatorSettings } from "./types";
import { IndicatorSettingsModal } from "./IndicatorSettingsModal";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Props {
  ticker: string;
  timeframe?: string;
}

const MA_COLORS = ["#a78bfa", "#f59e0b", "#34d399", "#f472b6"];

export const IndicatorPanel = ({ ticker, timeframe = "1d" }: Props) => {
  const [data, setData] = useState<IndicatorData | null>(null);
  const [settings, setSettings] = useState<IndicatorSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"RSI" | "MACD" | "MA">("RSI");

  const load = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/indicators/compute?ticker=${ticker}&timeframe=${timeframe}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error("Failed");
      const d: IndicatorData = await res.json();
      setData(d);
    } catch {
      setError("Không thể tải dữ liệu indicators.");
    } finally {
      setLoading(false);
    }
  }, [ticker, timeframe]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSettingsSaved = (s: IndicatorSettings) => {
    setSettings(s);
    load(); // Reload with new settings
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none border-b border-[var(--border-color)]/40"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest opacity-50">
            Technical Indicators
          </span>
          {ticker && (
            <span className="text-xs font-bold text-[var(--color-primary)]">{ticker}</span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={load}
            title="Refresh"
            className="p-1 rounded hover:bg-[var(--border-color)]/30 transition-colors"
          >
            <RefreshCw size={12} className={`opacity-50 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            title="Cài đặt"
            className="p-1 rounded hover:bg-[var(--border-color)]/30 transition-colors"
          >
            <Settings size={13} className="opacity-50" />
          </button>
          <div className="opacity-40">
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4">
          {loading && (
            <div className="flex items-center gap-2 text-xs opacity-50 py-2">
              <Loader2 size={13} className="animate-spin" /> Đang tải…
            </div>
          )}
          {error && <p className="text-xs text-rose-400 py-2">{error}</p>}

          {data && !loading && (
            <>
              {/* Tab bar */}
              <div className="flex gap-1 mb-4">
                {(["RSI", "MACD", "MA"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={[
                      "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                      activeTab === tab
                        ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                        : "opacity-50 hover:opacity-80",
                    ].join(" ")}
                  >
                    {tab === "MA" ? "SMA / EMA" : tab}
                  </button>
                ))}
              </div>

              {activeTab === "RSI" && data.RSI && (
                <RSIChart rsi={data.RSI} period={data.RSI.value !== null ? 14 : 14} />
              )}

              {activeTab === "MACD" && data.MACD && (
                <MACDChart
                  macd={data.MACD}
                  params={{ fast: 12, slow: 26, signal: 9 }}
                />
              )}

              {activeTab === "MA" && (
                <div className="flex flex-col gap-3">
                  {data.SMA.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-50 mb-2">SMA</div>
                      <div className="flex flex-col gap-1.5">
                        {data.SMA.map((s, i) => (
                          <div key={s.period} className="flex items-center justify-between text-xs">
                            <span style={{ color: MA_COLORS[i % MA_COLORS.length] }} className="font-medium">
                              SMA {s.period}
                            </span>
                            <span className="font-mono">{s.value?.toFixed(4) ?? "—"}</span>
                            <span className="opacity-60 text-right max-w-[200px] truncate">{s.interpretation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.EMA.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-50 mb-2">EMA</div>
                      <div className="flex flex-col gap-1.5">
                        {data.EMA.map((e, i) => (
                          <div key={e.period} className="flex items-center justify-between text-xs">
                            <span style={{ color: MA_COLORS[(i + 2) % MA_COLORS.length] }} className="font-medium">
                              EMA {e.period}
                            </span>
                            <span className="font-mono">{e.value?.toFixed(4) ?? "—"}</span>
                            <span className="opacity-60 text-right max-w-[200px] truncate">{e.interpretation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.SMA.length === 0 && data.EMA.length === 0 && (
                    <p className="text-xs opacity-40">Không có dữ liệu MA.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showSettings && (
        <IndicatorSettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={handleSettingsSaved}
        />
      )}
    </div>
  );
};
