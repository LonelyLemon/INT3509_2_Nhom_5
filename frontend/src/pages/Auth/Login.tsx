import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TrendingUp, BarChart2, Brain, Shield, Eye, EyeOff } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/useAuthStore";

export const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { checkAuth, setTokens } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError(t("auth.error_invalid_email"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.error_password_min_8"));
      return;
    }

    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await api.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      setTokens(res.data.access_token, res.data.refresh_token);
      await checkAuth();
      navigate("/dashboard");
    } catch (err: any) {
      const status = err.response?.status;
      const detail: string = err.response?.data?.detail || "";
      if (status === 403 && detail.toLowerCase().includes("banned")) {
        setError(t("auth.error_account_banned"));
      } else {
        setError(detail || t("auth.error_invalid_credentials"));
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <TrendingUp size={16} />, label: t("auth.feature_realtime") },
    { icon: <Brain size={16} />, label: t("auth.feature_ai") },
    { icon: <BarChart2 size={16} />, label: t("auth.feature_portfolio") },
    { icon: <Shield size={16} />, label: t("auth.feature_secure") },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: "url('/MarketMind%20Bgr.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay behind panel */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Outer card */}
      <div className="relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex" style={{ minHeight: 520 }}>

        {/* ── Left panel: branding ── */}
        <div
          className="hidden md:flex flex-col justify-between w-[45%] flex-shrink-0 p-10 relative overflow-hidden"
          style={{
            backgroundImage: "url('/MarketMind%20Bgr.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/40" />

          {/* Logo */}
          <div className="relative flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">MarketMind</span>
          </div>

          {/* Center text */}
          <div className="relative">
            <h2 className="text-white text-2xl font-bold leading-snug mb-3">
              {t("auth.panel_title")}
            </h2>
            <p className="text-white/70 text-sm mb-8 leading-relaxed">
              {t("auth.panel_subtitle")}
            </p>
            <ul className="flex flex-col gap-3">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-white/90 text-sm">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    {f.icon}
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom quote */}
          <p className="relative text-white/40 text-xs">
            &copy; {new Date().getFullYear()} MarketMind
          </p>
        </div>

        {/* ── Right panel: form ── */}
        <div className="flex-1 bg-[var(--card-bg)] flex flex-col justify-center px-8 md:px-12 py-10">
          <div className="max-w-sm w-full mx-auto">
            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-[var(--color-primary)]" />
              </div>
              <span className="font-bold text-lg text-[var(--color-primary)]">MarketMind</span>
            </div>

            <h1 className="text-2xl font-bold text-[var(--text-color)] mb-1">{t("auth.login_title")}</h1>
            <p className="text-sm text-[var(--text-color)]/50 mb-8">{t("auth.login_subtitle")}</p>

            <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
              {error && (
                <div className="p-3 text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 text-sm">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-color)]/80">{t("auth.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field"
                  placeholder={t("auth.email_placeholder")}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--text-color)]/80">{t("auth.password")}</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    {t("auth.forgot_password")}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-field pr-10"
                    placeholder={t("auth.password_placeholder")}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-color)]/40 hover:text-[var(--text-color)]/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex justify-center items-center gap-2 mt-2"
              >
                {loading
                  ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  : t("auth.login_btn")}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--text-color)]/50">
              {t("auth.no_account")}{" "}
              <Link to="/signup" className="text-[var(--color-primary)] font-semibold hover:underline">
                {t("auth.signup")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
