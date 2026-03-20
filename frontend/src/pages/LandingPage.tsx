import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, Zap, TrendingUp, ArrowRight } from "lucide-react";

export const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const benefits = [
    { icon: <TrendingUp className="text-[var(--color-primary)] mb-4" size={32} />, title: "Data-Driven Insights", desc: "Real-time market analytics." },
    { icon: <Zap className="text-[var(--color-cta)] mb-4" size={32} />, title: "AI Powered", desc: "Instantly analyze complex market trends." },
    { icon: <Shield className="text-[var(--color-secondary)] mb-4" size={32} />, title: "Secure & Reliable", desc: "Bank-grade infrastructure." }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col items-center justify-center p-6 text-center">

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto flex flex-col items-center mt-20">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Intelligence for <br /> <span className="text-[var(--color-primary)]">Modern Finance</span>
        </h1>
        <p className="text-xl md:text-2xl text-[var(--text-color)]/70 max-w-2xl mb-12">
          Elevate your portfolio with advanced analytics, real-time news, and actionable AI insights.
        </p>

        <div className="flex items-center justify-center gap-4 mb-24">
          <button
            onClick={() => navigate("/login")}
            className="btn-secondary text-lg px-8 py-3"
          >
            {t("auth.login")}
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="btn-primary flex items-center gap-2 text-lg px-8 py-3 group"
          >
            {t("auth.signup")}
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-24 w-full px-4">
        {benefits.map((b, i) => (
          <div key={i} className="glass-card flex flex-col items-center text-center">
            {b.icon}
            <h3 className="text-xl font-semibold mb-2">{b.title}</h3>
            <p className="text-[var(--text-color)]/70">{b.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-auto py-8 text-[var(--text-color)]/50 text-sm">
        &copy; 2026 MarketMind Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
