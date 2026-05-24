import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, Zap, TrendingUp, ArrowRight } from "lucide-react";

export const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const benefits = [
    { icon: <TrendingUp className="text-[var(--color-primary)] mb-4" size={32} />, title: t("landing.benefit_data_title"), desc: t("landing.benefit_data_desc") },
    { icon: <Zap className="text-[var(--color-cta)] mb-4" size={32} />, title: t("landing.benefit_ai_title"), desc: t("landing.benefit_ai_desc") },
    { icon: <Shield className="text-[var(--color-secondary)] mb-4" size={32} />, title: t("landing.benefit_secure_title"), desc: t("landing.benefit_secure_desc") },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col items-center justify-center p-6 text-center">

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto flex flex-col items-center mt-20">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          {t("landing.hero_title").replace(t("landing.hero_title_highlight"), "")}{" "}
          <br /> <span className="text-[var(--color-primary)]">{t("landing.hero_title_highlight")}</span>
        </h1>
        <p className="text-xl md:text-2xl text-[var(--text-color)]/70 max-w-2xl mb-12">
          {t("landing.hero_subtitle")}
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
        {t("landing.footer_rights")}
      </footer>
    </div>
  );
};

export default LandingPage;
