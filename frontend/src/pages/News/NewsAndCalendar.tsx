import { useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "../../lib/utils";

const newsData = [
  { id: 1, time: "10:45 AM", title: "Federal Reserve Announces Rate Hold at 5.25%", source: "Reuters", tag: "Macro" },
  { id: 2, time: "10:15 AM", title: "Tech Stocks Rally Disregards Higher Treasury Yields", source: "Bloomberg", tag: "Equities" },
  { id: 3, time: "09:30 AM", title: "Jobless Claims Fall to Lowest Level Since August", source: "CNBC", tag: "Economy" },
  { id: 4, time: "08:00 AM", title: "Oil Prices Surge Amid Middle East Tensions", source: "Wall Street Journal", tag: "Commodities" },
  { id: 5, time: "Yesterday", title: "Apple Reports Strong Q3 Earnings, Beats Estimates", source: "MarketWatch", tag: "Earnings" },
];

const calendarEvents = [
  { id: 1, time: "13:30", flag: "🇺🇸", country: "USD", event: "Core PCE Price Index (MoM)", impact: "High", actual: "0.2%", forecast: "0.2%", prev: "0.1%" },
  { id: 2, time: "13:30", flag: "🇺🇸", country: "USD", event: "Initial Jobless Claims", impact: "Medium", actual: "210K", forecast: "215K", prev: "212K" },
  { id: 3, time: "14:45", flag: "🇺🇸", country: "USD", event: "Chicago PMI", impact: "Low", actual: "45.0", forecast: "46.0", prev: "44.0" },
  { id: 4, time: "15:00", flag: "🇺🇸", country: "USD", event: "Pending Home Sales (MoM)", impact: "Medium", actual: "-1.5%", forecast: "1.0%", prev: "0.5%" },
  { id: 5, time: "23:50", flag: "🇯🇵", country: "JPY", event: "Tokyo Core CPI (YoY)", impact: "High", actual: "-", forecast: "2.5%", prev: "2.4%" },
];

export const NewsAndCalendar = () => {
  const [activeTab, setActiveTab] = useState<"news" | "calendar">("news");

  return (
    <div className="flex flex-col h-full bg-[var(--bg-color)] p-6 overflow-hidden max-w-7xl mx-auto w-full">
      
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Market Intel</h1>
        <div className="flex bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-1">
          <button 
            onClick={() => setActiveTab("news")}
            className={cn(
              "px-6 py-2 rounded font-medium transition-colors cursor-pointer",
              activeTab === "news" ? "bg-[var(--color-primary)] text-white" : "hover:text-[var(--color-primary)]"
            )}
          >
            Latest News
          </button>
          <button 
            onClick={() => setActiveTab("calendar")}
            className={cn(
              "px-6 py-2 rounded font-medium transition-colors cursor-pointer",
              activeTab === "calendar" ? "bg-[var(--color-primary)] text-white" : "hover:text-[var(--color-primary)]"
            )}
          >
            Economic Calendar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "news" ? (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[var(--border-color)]">
            {newsData.map((item) => (
              <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-[var(--bg-color)] bg-[var(--color-primary)] text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
                
                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] glass-card p-5 group-hover:-translate-y-1 transition-transform cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-[var(--text-color)]/50" />
                    <time className="text-sm font-medium text-[var(--color-primary)]">{item.time}</time>
                    <span className="text-xs bg-[var(--border-color)]/30 px-2 py-0.5 rounded-full ml-auto">{item.tag}</span>
                  </div>
                  <h3 className="font-semibold text-lg leading-snug mb-2">{item.title}</h3>
                  <div className="text-sm text-[var(--text-color)]/50">{item.source}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card overflow-x-auto w-full">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[var(--border-color)]/20 text-xs uppercase text-[var(--text-color)]/70 border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-4 rounded-tl-lg">Time</th>
                  <th className="px-6 py-4">Country</th>
                  <th className="px-6 py-4 w-full">Event</th>
                  <th className="px-6 py-4">Impact</th>
                  <th className="px-6 py-4">Actual</th>
                  <th className="px-6 py-4">Forecast</th>
                  <th className="px-6 py-4 rounded-tr-lg">Previous</th>
                </tr>
              </thead>
              <tbody>
                {calendarEvents.map((ev) => (
                  <tr key={ev.id} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--border-color)]/10 transition-colors">
                    <td className="px-6 py-4 font-medium">{ev.time}</td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <span className="text-xl">{ev.flag}</span>
                      <span className="font-semibold">{ev.country}</span>
                    </td>
                    <td className="px-6 py-4 text-wrap min-w-[200px] leading-snug">{ev.event}</td>
                    <td className="px-6 py-4">
                      {ev.impact === "High" ? (
                        <span className="bg-red-500/10 text-red-500 font-bold px-2 py-1 rounded">High</span>
                      ) : ev.impact === "Medium" ? (
                        <span className="bg-orange-500/10 text-orange-500 font-bold px-2 py-1 rounded">Medium</span>
                      ) : (
                        <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold px-2 py-1 rounded">Low</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold">{ev.actual}</td>
                    <td className="px-6 py-4 text-[var(--text-color)]/70">{ev.forecast}</td>
                    <td className="px-6 py-4 text-[var(--text-color)]/70">{ev.prev}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsAndCalendar;
