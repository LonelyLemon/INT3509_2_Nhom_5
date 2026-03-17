import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  BarChart2, 
  Newspaper, 
  Calendar, 
  Users, 
  UserCircle,
  Menu, 
  Moon, 
  Sun,
  Globe
} from "lucide-react";
import { cn } from "../lib/utils";

export const DashboardLayout = () => {
  const { t, i18n } = useTranslation();
  const [isDark, setIsDark] = useState(true); // Default to Dark Mode (OLED)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleLanguage = () => {
    const nextLang = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(nextLang);
  };

  const navLinks = [
    { to: "/dashboard", icon: <BarChart2 size={20} />, label: t("navigation.dashboard") },
    { to: "/news", icon: <Newspaper size={20} />, label: t("navigation.news") },
    { to: "/calendar", icon: <Calendar size={20} />, label: t("navigation.calendar") },
    { to: "/community", icon: <Users size={20} />, label: t("navigation.community") },
    { to: "/profile", icon: <UserCircle size={20} />, label: t("auth.profile") },
  ];

  return (
    <div className="flex h-screen w-full bg-[var(--bg-color)] text-[var(--text-color)] overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "h-full border-r border-[var(--border-color)] bg-[var(--card-bg)] transition-all duration-300 flex flex-col items-center py-6",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className={cn(
          "flex items-center w-full mb-8 transition-all",
          isSidebarOpen ? "px-4 justify-between" : "justify-center"
        )}>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-[var(--color-primary)]">FinAnalytics</span>}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-[var(--border-color)]/30 transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 w-full px-3 space-y-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => cn(
                "flex items-center py-3 px-3 rounded-lg transition-all duration-200 cursor-pointer group",
                !isSidebarOpen && "justify-center",
                isActive 
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium" 
                  : "hover:bg-[var(--border-color)]/30 text-[var(--text-color)]/70 hover:text-[var(--text-color)]"
              )}
            >
              <div className={cn("flex items-center justify-center", isSidebarOpen ? "w-6" : "w-auto")}>
                {link.icon}
              </div>
              {isSidebarOpen && <span className="ml-3 truncate">{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User & Settings */}
        <div className="w-full px-3 mt-auto flex flex-col space-y-2">
          <button 
            onClick={toggleLanguage}
            className="flex items-center justify-center py-3 px-3 rounded-lg hover:bg-[var(--border-color)]/30 transition-all cursor-pointer"
            title={i18n.language === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
          >
            <Globe size={20} />
            {isSidebarOpen && <span className="ml-3 uppercase font-medium">{i18n.language}</span>}
          </button>
          
          <button 
            onClick={() => setIsDark(!isDark)}
            className="flex items-center justify-center py-3 px-3 rounded-lg hover:bg-[var(--border-color)]/30 transition-all cursor-pointer"
          >
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
            {isSidebarOpen && <span className="ml-3 font-medium">{isDark ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative">
        <Outlet />
      </main>

    </div>
  );
};
