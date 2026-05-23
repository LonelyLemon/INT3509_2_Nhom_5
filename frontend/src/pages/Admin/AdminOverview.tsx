import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Newspaper, Bot, Users, ChevronRight, MessageSquare, ThumbsUp, Activity } from "lucide-react";
import { api } from "../../lib/api";
import type { AIStats } from "./types";

interface OverviewStats {
  totalTickers: number;
  activeTickers: number;
  totalUsers: number;
  ai: AIStats | null;
}

export function AdminOverview() {
  const [stats, setStats] = useState<OverviewStats>({
    totalTickers: 0,
    activeTickers: 0,
    totalUsers: 0,
    ai: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get("/price/tickers", { params: { limit: 200 } }),
      api.get("/auth/admin/users", { params: { limit: 1 } }),
      api.get<AIStats>("/ai/admin/stats"),
    ]).then(([tickersRes, usersRes, aiRes]) => {
      const tickers = tickersRes.status === "fulfilled" ? tickersRes.value.data : [];
      const totalUsers = usersRes.status === "fulfilled" ? usersRes.value.data.total : 0;
      const ai = aiRes.status === "fulfilled" ? aiRes.value.data : null;

      setStats({
        totalTickers: tickers.length,
        activeTickers: tickers.filter((t: { is_active: boolean }) => t.is_active).length,
        totalUsers,
        ai,
      });
      setLoading(false);
    });
  }, []);

  const summaryCards = [
    {
      label: "Active Tickers",
      value: loading ? "—" : `${stats.activeTickers} / ${stats.totalTickers}`,
      icon: <TrendingUp size={18} />,
      color: "text-[var(--color-primary)]",
      bg: "bg-[var(--color-primary)]/10",
      to: "/admin/tickers",
    },
    {
      label: "Total Users",
      value: loading ? "—" : stats.totalUsers,
      icon: <Users size={18} />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      to: "/admin/users",
    },
    {
      label: "AI Conversations",
      value: loading ? "—" : (stats.ai?.total_conversations ?? 0),
      icon: <MessageSquare size={18} />,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      to: "/admin/ai",
    },
    {
      label: "AI Like Rate",
      value: loading ? "—" : `${stats.ai?.like_rate_pct ?? 0}%`,
      icon: <ThumbsUp size={18} />,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      to: "/admin/ai",
    },
  ];

  const quickLinks = [
    { to: "/admin/tickers", label: "Manage Tickers", desc: "Add, enable, or remove tickers", icon: <TrendingUp size={16} /> },
    { to: "/admin/data", label: "Data Ingestion", desc: "Trigger price & news pipelines", icon: <Newspaper size={16} /> },
    { to: "/admin/ai", label: "AI Quality", desc: "Review conversation feedback", icon: <Bot size={16} /> },
    { to: "/admin/users", label: "User Management", desc: "Ban, promote or search users", icon: <Users size={16} /> },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Summary stats */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">At a Glance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryCards.map((card) => (
            <Link
              key={card.label}
              to={card.to}
              className="glass-card p-4 flex flex-col gap-3 hover:no-underline group"
            >
              <div className={`w-9 h-9 rounded-lg ${card.bg} ${card.color} flex items-center justify-center`}>
                {card.icon}
              </div>
              <div>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="text-xs opacity-50 mt-0.5">{card.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40 flex items-center gap-2">
          <Activity size={12} /> Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="glass-card p-4 flex items-center justify-between gap-4 hover:no-underline group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {link.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm">{link.label}</div>
                  <div className="text-xs opacity-50 mt-0.5">{link.desc}</div>
                </div>
              </div>
              <ChevronRight size={16} className="opacity-30 group-hover:opacity-70 transition-opacity" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
