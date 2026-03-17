import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Maximize2, Minimize2 } from "lucide-react";
import { AIChatInterface } from "../../components/Chat/AIChatInterface";
import { WatchlistManager } from "../../components/Portfolio/WatchlistManager";
import { cn } from "../../lib/utils";

const data = [
  { time: "09:00", value: 1100 },
  { time: "10:00", value: 1105 },
  { time: "11:00", value: 1098 },
  { time: "13:00", value: 1120 },
  { time: "14:00", value: 1150 },
  { time: "15:00", value: 1145 },
];

export const FinancialDashboard = () => {
  const [chatExpanded, setChatExpanded] = useState(false);
  const [watchlistExpanded, setWatchlistExpanded] = useState(false);

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-[var(--bg-color)]">
      
      {/* LEFT: AI Chat Panel */}
      <div 
        className={cn(
          "h-full transition-all duration-300 flex-shrink-0 z-10 hidden md:block",
          chatExpanded ? "w-1/2" : "w-1/4 min-w-[300px]"
        )}
      >
        <div className="h-full relative group">
          <AIChatInterface />
          <button 
            onClick={() => setChatExpanded(!chatExpanded)}
            className="absolute top-4 right-4 p-1.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:text-[var(--color-primary)] cursor-pointer"
          >
            {chatExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
          </button>
        </div>
      </div>

      {/* CENTER: Main Chart & Analytics Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 min-w-0">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">VN-INDEX</h1>
            <div className="text-green-500 font-medium text-lg flex items-center gap-2 mt-1">
              1,145.00 <span className="text-sm bg-green-500/10 px-2 py-0.5 rounded">+45 points (+4.1%)</span>
            </div>
          </div>
          <div className="flex gap-2 text-sm font-medium">
            {["1D", "1W", "1M", "YTD", "ALL"].map(t => (
              <button key={t} className="px-3 py-1 rounded bg-[var(--border-color)]/20 hover:bg-[var(--color-primary)] hover:text-white transition-colors cursor-pointer">
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-[400px] mb-8 glass-card !p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} stroke="var(--text-color)" opacity={0.6} fontSize={12} dy={10} />
              <YAxis domain={['dataMin - 10', 'dataMax + 10']} axisLine={false} tickLine={false} stroke="var(--text-color)" opacity={0.6} fontSize={12} dx={-10} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--color-primary)', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="glass-card">
              <h3 className="font-semibold mb-4">Market Sentiment</h3>
              <div className="w-full h-4 bg-red-500/20 rounded-full overflow-hidden flex">
                 <div className="bg-red-500 h-full w-[20%]"></div>
                 <div className="bg-gray-500 h-full w-[10%]"></div>
                 <div className="bg-green-500 h-full w-[70%]"></div>
              </div>
              <div className="flex justify-between mt-2 text-xs opacity-70 font-medium">
                 <span>Bearish (20%)</span>
                 <span>Neutral (10%)</span>
                 <span>Bullish (70%)</span>
              </div>
           </div>
           <div className="glass-card">
              <h3 className="font-semibold mb-2">Key Statistics</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="opacity-70">Volume</div>
                  <div className="font-semibold text-base">942.5M</div>
                </div>
                <div>
                  <div className="opacity-70">Turnover</div>
                  <div className="font-semibold text-base">21.4T VND</div>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* RIGHT: Watchlist Panel */}
      <div 
        className={cn(
          "h-full transition-all duration-300 flex-shrink-0 hidden lg:block",
          watchlistExpanded ? "w-1/3" : "w-1/5 min-w-[250px]"
        )}
      >
        <div className="h-full relative group">
          <WatchlistManager />
          <button 
            onClick={() => setWatchlistExpanded(!watchlistExpanded)}
            className="absolute top-4 left-4 p-1.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:text-[var(--color-primary)] cursor-pointer"
          >
            {watchlistExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
          </button>
        </div>
      </div>

    </div>
  );
};

export default FinancialDashboard;
