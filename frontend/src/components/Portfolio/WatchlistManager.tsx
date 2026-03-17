import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, MoreVertical } from "lucide-react";

export const WatchlistManager = () => {
  const [assets] = useState([
    { symbol: "VNM", name: "Vinamilk", price: "68,000", change: "+1.2%", isUp: true },
    { symbol: "SSI", name: "SSI Securities", price: "32,500", change: "-0.5%", isUp: false },
    { symbol: "FPT", name: "FPT Corp", price: "115,000", change: "+2.1%", isUp: true },
    { symbol: "HPG", name: "Hoa Phat Group", price: "24,000", change: "0.0%", isUp: null },
  ]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-color)] p-4 border-l border-[var(--border-color)]">
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-semibold text-lg">Watchlist</h2>
        <button className="p-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-md hover:bg-[var(--color-primary)]/20 transition-colors cursor-pointer">
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {assets.map((asset, index) => (
          <div key={index} className="glass-card !p-3 flex justify-between items-center group">
            
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${asset.isUp ? 'bg-green-500/10 text-green-500' : asset.isUp === false ? 'bg-red-500/10 text-red-500' : 'bg-gray-500/10 text-gray-500'}`}>
                {asset.symbol}
              </div>
              <div>
                <div className="font-semibold text-sm">{asset.symbol}</div>
                <div className="text-xs text-[var(--text-color)]/50 truncate w-24">{asset.name}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="font-semibold text-sm">{asset.price}</div>
              <div className={`text-xs flex items-center justify-end gap-1 ${asset.isUp ? 'text-green-500' : asset.isUp === false ? 'text-red-500' : 'text-gray-500'}`}>
                {asset.isUp ? <TrendingUp size={12}/> : asset.isUp === false ? <TrendingDown size={12}/> : null}
                {asset.change}
              </div>
            </div>

            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--border-color)] rounded cursor-pointer ml-2">
              <MoreVertical size={14} />
            </button>

          </div>
        ))}
      </div>

    </div>
  );
};
