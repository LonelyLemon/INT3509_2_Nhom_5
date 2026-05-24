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
    <div
      className="min-h-screen text-white flex flex-col items-center justify-center p-6 text-center relative"
      style={{
        backgroundImage: "url('/MarketMind%20Bgr.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/65" />
      {/* Content above overlay */}
      <div className="relative z-10 flex flex-col items-center w-full">

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto flex flex-col items-center mt-20">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-white">
          {t("landing.hero_title").replace(t("landing.hero_title_highlight"), "")}{" "}
          <br /> <span className="text-[var(--color-primary)]">{t("landing.hero_title_highlight")}</span>
        </h1>
        <p className="text-xl md:text-2xl text-white/70 max-w-2xl mb-12">
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
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl flex flex-col items-center text-center p-8 border border-white/15 shadow-xl"
            style={{
              backgroundImage: "url('/MarketMind%20Bgr.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative z-10 flex flex-col items-center">
              {b.icon}
              <h3 className="text-xl font-semibold mb-2 text-white">{b.title}</h3>
              <p className="text-white/70">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-auto py-8 text-white/40 text-sm">
        {t("landing.footer_rights")}
      </footer>
      </div> {/* end z-10 wrapper */}
    </div>
  );

};

export default LandingPage;
