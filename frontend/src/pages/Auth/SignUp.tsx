import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TrendingUp, BarChart2, Brain, Shield, Eye, EyeOff, Check } from "lucide-react";
import { api } from "../../lib/api";

function validatePassword(pw: string, t: (k: string) => string): string | null {
  if (pw.length < 8) return t("auth.error_password_min_8");
  if (!/[A-Z]/.test(pw)) return t("auth.error_password_uppercase");
  if (!/\d/.test(pw)) return t("auth.error_password_digit");
  return null;
}

export const SignUp = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (fullName.trim().length < 2) {
      setError(t("auth.error_full_name_min_2"));
      return;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError(t("auth.error_invalid_email"));
      return;
    }
    const pwError = validatePassword(password, t);
    if (pwError) { setError(pwError); return; }
    if (password !== confirmPassword) {
      setError(t("auth.error_passwords_no_match"));
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", { username: fullName, email, password });
      navigate("/check-email", { state: { email } });
    } catch (err: any) {
      setError(err.response?.data?.detail || t("auth.error_registration_failed"));
    } finally {
      setLoading(false);
    }
  };

  // Live password strength hints
  const pwChecks = [
    { label: t("auth.pw_check_length"), ok: password.length >= 8 },
    { label: t("auth.pw_check_uppercase"), ok: /[A-Z]/.test(password) },
    { label: t("auth.pw_check_digit"), ok: /\d/.test(password) },
  ];

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
      <div className="relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex" style={{ minHeight: 580 }}>

        {/* ── Left panel: branding ── */}
        <div
          className="hidden md:flex flex-col justify-between w-[42%] flex-shrink-0 p-10 relative overflow-hidden"
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
              {t("auth.panel_signup_title")}
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

          {/* Bottom */}
          <p className="relative text-white/40 text-xs">
            &copy; {new Date().getFullYear()} MarketMind
          </p>
        </div>

        {/* ── Right panel: form ── */}
        <div className="flex-1 bg-[var(--card-bg)] flex flex-col justify-center px-8 md:px-12 py-10 overflow-y-auto">
          <div className="max-w-sm w-full mx-auto">
            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-[var(--color-primary)]" />
              </div>
              <span className="font-bold text-lg text-[var(--color-primary)]">MarketMind</span>
            </div>

            <h1 className="text-2xl font-bold text-[var(--text-color)] mb-1">{t("auth.signup_title")}</h1>
            <p className="text-sm text-[var(--text-color)]/50 mb-7">{t("auth.signup_subtitle")}</p>

            <form onSubmit={handleSignUp} noValidate className="flex flex-col gap-4">
              {error && (
                <div className="p-3 text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 text-sm">
                  {error}
                </div>
              )}

              {/* Full name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-color)]/80">{t("auth.full_name_label")}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="input-field"
                  placeholder={t("auth.display_name_placeholder")}
                  autoComplete="name"
                />
              </div>

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
                <label className="text-sm font-medium text-[var(--text-color)]/80">{t("auth.password")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-field pr-10"
                    placeholder={t("auth.password_placeholder")}
                    autoComplete="new-password"
                    minLength={8}
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
                {/* Strength hints */}
                {password.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    {pwChecks.map((c, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-[11px] transition-colors ${c.ok ? "text-emerald-400" : "text-[var(--text-color)]/40"}`}>
                        <Check size={11} className={c.ok ? "opacity-100" : "opacity-0"} />
                        <span>{c.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-color)]/80">{t("auth.confirm_password")}</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="input-field pr-10"
                    placeholder={t("auth.password_placeholder")}
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-color)]/40 hover:text-[var(--text-color)]/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-[11px] mt-0.5 ${confirmPassword === password ? "text-emerald-400" : "text-red-400"}`}>
                    {confirmPassword === password ? t("auth.pw_match") : t("auth.pw_no_match")}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex justify-center items-center gap-2 mt-1"
              >
                {loading
                  ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  : t("auth.signup_btn")}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--text-color)]/50">
              {t("auth.have_account")}{" "}
              <Link to="/login" className="text-[var(--color-primary)] font-semibold hover:underline">
                {t("auth.login_btn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
