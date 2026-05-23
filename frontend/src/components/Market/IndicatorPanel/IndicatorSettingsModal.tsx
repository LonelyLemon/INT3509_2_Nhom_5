import React, { useState, useEffect } from "react";
import { X, RotateCcw } from "lucide-react";
import type { IndicatorSettings } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const DEFAULTS: IndicatorSettings = {
  RSI: { period: 14 },
  MACD: { fast: 12, slow: 26, signal: 9 },
  SMA: { periods: [20, 50] },
  EMA: { periods: [9, 21] },
};

interface Props {
  onClose: () => void;
  onSaved: (settings: IndicatorSettings) => void;
}

export const IndicatorSettingsModal = ({ onClose, onSaved }: Props) => {
  const [settings, setSettings] = useState<IndicatorSettings>(DEFAULTS);
  const [smaInput, setSmaInput] = useState("20,50");
  const [emaInput, setEmaInput] = useState("9,21");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/indicators/settings`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data?.settings) {
          setSettings(data.settings);
          setSmaInput(data.settings.SMA.periods.join(","));
          setEmaInput(data.settings.EMA.periods.join(","));
        }
      })
      .catch(() => {});
  }, []);

  const parsePeriods = (val: string): number[] =>
    val.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);

  const save = async () => {
    const smaPeriods = parsePeriods(smaInput);
    const emaPeriods = parsePeriods(emaInput);
    if (!smaPeriods.length || !emaPeriods.length) {
      setError("Vui lòng nhập ít nhất 1 chu kỳ hợp lệ cho SMA và EMA.");
      return;
    }
    const payload = {
      RSI: settings.RSI,
      MACD: settings.MACD,
      SMA: { periods: smaPeriods },
      EMA: { periods: emaPeriods },
    };
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/indicators/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      onSaved(data.settings);
      onClose();
    } catch {
      setError("Không thể lưu cài đặt. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSettings(DEFAULTS);
    setSmaInput("20,50");
    setEmaInput("9,21");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md mx-4 p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Cài đặt Indicators</h2>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="p-1.5 rounded-lg hover:bg-[var(--border-color)]/30 transition-colors" title="Reset mặc định">
              <RotateCcw size={14} className="opacity-50" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--border-color)]/30 transition-colors">
              <X size={14} className="opacity-50" />
            </button>
          </div>
        </div>

        {/* RSI */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider opacity-50">RSI</label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-color)]/60 w-16">Chu kỳ</span>
            <input
              type="number" min={2} max={100}
              value={settings.RSI.period}
              onChange={e => setSettings(p => ({ ...p, RSI: { period: Number(e.target.value) } }))}
              className="input-field w-24 text-sm"
            />
          </div>
        </div>

        {/* MACD */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider opacity-50">MACD</label>
          {[
            { label: "Fast", key: "fast" as const, min: 2, max: 100 },
            { label: "Slow", key: "slow" as const, min: 2, max: 200 },
            { label: "Signal", key: "signal" as const, min: 2, max: 50 },
          ].map(({ label, key, min, max }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-color)]/60 w-16">{label}</span>
              <input
                type="number" min={min} max={max}
                value={settings.MACD[key]}
                onChange={e => setSettings(p => ({ ...p, MACD: { ...p.MACD, [key]: Number(e.target.value) } }))}
                className="input-field w-24 text-sm"
              />
            </div>
          ))}
        </div>

        {/* SMA */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider opacity-50">SMA Periods</label>
          <input
            type="text" value={smaInput}
            onChange={e => setSmaInput(e.target.value)}
            placeholder="Ví dụ: 20,50,200"
            className="input-field text-sm"
          />
          <p className="text-[11px] text-[var(--text-color)]/40">Nhập các chu kỳ, cách nhau bằng dấu phẩy</p>
        </div>

        {/* EMA */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider opacity-50">EMA Periods</label>
          <input
            type="text" value={emaInput}
            onChange={e => setEmaInput(e.target.value)}
            placeholder="Ví dụ: 9,21,55"
            className="input-field text-sm"
          />
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Hủy</button>
          <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
            {saving ? "Đang lưu…" : "Lưu cài đặt"}
          </button>
        </div>
      </div>
    </div>
  );
};
