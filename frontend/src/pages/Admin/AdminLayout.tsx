import { NavLink, Outlet } from "react-router-dom";
import { ShieldAlert, BarChart2, TrendingUp, Newspaper, Bot, Users } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTranslation } from "react-i18next";

export function AdminLayout() {
  const { t } = useTranslation();

  const tabs = [
    { to: "/admin", label: t("admin.tab_overview"), icon: <BarChart2 size={16} />, end: true },
    { to: "/admin/tickers", label: t("admin.tab_tickers"), icon: <TrendingUp size={16} />, end: false },
    { to: "/admin/data", label: t("admin.tab_data"), icon: <Newspaper size={16} />, end: false },
    { to: "/admin/ai", label: t("admin.tab_ai"), icon: <Bot size={16} />, end: false },
    { to: "/admin/users", label: t("admin.tab_users"), icon: <Users size={16} />, end: false },
  ];

  return (
    <div className="min-h-full bg-[var(--bg-color)] text-[var(--text-color)]">
      {/* Page header */}
      <div className="border-b border-[var(--border-color)] bg-[var(--card-bg)]/60 backdrop-blur-sm px-6 md:px-10 pt-8 pb-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("admin.title")}</h1>
              <p className="text-sm opacity-50 mt-0.5">{t("admin.subtitle")}</p>
            </div>
          </div>

          {/* Tab navigation */}
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-all",
                    isActive
                      ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-transparent text-[var(--text-color)]/60 hover:text-[var(--text-color)] hover:bg-[var(--border-color)]/30"
                  )
                }
              >
                {tab.icon}
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
        <Outlet />
      </div>
    </div>
  );
}
