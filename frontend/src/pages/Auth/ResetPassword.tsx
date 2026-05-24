import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { AuthBackground } from "./AuthBackground";

function validatePassword(pw: string, t: (k: string) => string): string | null {
  if (pw.length < 8) return t("auth.error_password_min_8");
  if (!/[A-Z]/.test(pw)) return t("auth.error_password_uppercase");
  if (!/\d/.test(pw)) return t("auth.error_password_digit");
  return null;
}

export const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [email, setEmail] = useState<string>((location.state as any)?.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pwError = validatePassword(newPassword, t);
    if (pwError) { setError(pwError); return; }
    if (newPassword !== confirmPassword) {
      setError(t("auth.error_passwords_no_match"));
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email,
        otp,
        new_password: newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || t("auth.error_reset_failed"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthBackground>
        <div className="glass-card w-full max-w-md p-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-4">{t("auth.reset_success_title")}</h1>
          <p className="text-[var(--text-color)]/70 mb-4">{t("auth.reset_success_desc")}</p>
          <button onClick={() => navigate("/login")} className="btn-primary w-full mt-4">
            {t("auth.reset_go_login")}
          </button>
        </div>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-primary)] tracking-tight mb-2">{t("auth.reset_title")}</h1>
          <p className="text-[var(--text-color)]/70">{t("auth.reset_subtitle")}</p>
        </div>

        <form onSubmit={handleResetPassword} noValidate className="space-y-5">
          {error && (
            <div className="p-3 text-red-500 bg-red-500/10 rounded border border-red-500/20 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">{t("auth.email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder={t("auth.email_placeholder")} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("auth.reset_otp_label")}</label>
            <input
              type="text" value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required className="input-field tracking-widest text-center text-xl font-mono"
              placeholder={t("auth.reset_otp_placeholder")} maxLength={6} inputMode="numeric"
            />
            <p className="mt-1 text-xs text-[var(--text-color)]/50">{t("auth.reset_otp_hint")}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("auth.reset_new_password")}</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="input-field" placeholder={t("auth.password_placeholder")} minLength={8} />
            <p className="mt-1 text-xs text-[var(--text-color)]/50">{t("auth.signup_password_hint")}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("auth.reset_confirm_password")}</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="input-field" placeholder={t("auth.password_placeholder")} minLength={8} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center">
            {loading
              ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full display-inline-block"></span>
              : t("auth.reset_btn")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-color)]/70">
          {t("auth.reset_no_code")}{" "}
          <Link to="/forgot-password" className="text-[var(--color-cta)] hover:underline">{t("auth.reset_send_again")}</Link>
        </p>
      </div>
    </AuthBackground>
  );
};
