import { useState } from "react";
import { Bell, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";

export const AlertInterface = () => {
  const [alerts] = useState([
    { id: 1, type: "price", target: "VNM", condition: "above", value: "70,000", active: true },
    { id: 2, type: "price", target: "SSI", condition: "below", value: "30,000", active: true },
    { id: 3, type: "news", target: "Federal Reserve", condition: "keyword", value: "Rate Cut", active: false }
  ]);

  return (
    <div className="glass-card mb-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="text-[var(--color-primary)]" size={20} />
        <h2 className="text-xl font-bold">Active Alerts</h2>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-color)]/50">
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--border-color)]/30 flex items-center justify-center">
                {alert.type === "price" ? (
                  alert.condition === "above" ? <ArrowUpRight className="text-green-500" size={18} /> : <ArrowDownRight className="text-red-500" size={18} />
                ) : (
                  <Bell className="text-[var(--text-color)]/70" size={18} />
                )}
              </div>
              
              <div>
                <div className="font-semibold">{alert.target}</div>
                <div className="text-sm text-[var(--text-color)]/70 flex items-center gap-1">
                  Triggers when {alert.type === "price" ? "price goes" : "news mentions"} 
                  <strong className={alert.condition === "above" ? "text-green-500" : alert.condition === "below" ? "text-red-500" : ""}>
                    {alert.condition} {alert.value}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={alert.active} onChange={() => {}} />
                <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
              <button className="text-[var(--text-color)]/50 hover:text-red-500 transition-colors p-2 rounded cursor-pointer">
                <Trash2 size={16} />
              </button>
            </div>

          </div>
        ))}
      </div>

      <button className="w-full mt-6 py-3 border-2 border-dashed border-[var(--color-primary)]/50 text-[var(--color-primary)] rounded-lg font-semibold hover:bg-[var(--color-primary)]/10 transition-colors">
        + Create New Alert
      </button>

    </div>
  );
};
