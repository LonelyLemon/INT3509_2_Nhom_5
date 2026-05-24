import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { AuthBackground } from "./AuthBackground";

export const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forget-password", { email });
      navigate("/reset-password", { state: { email } });
    } catch (err: any) {
      setError(err.response?.data?.detail || t("auth.error_something_wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-primary)] tracking-tight mb-2">{t("auth.forgot_title")}</h1>
          <p className="text-[var(--text-color)]/70">{t("auth.forgot_subtitle")}</p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-6">
          {error && (
            <div className="p-3 text-red-500 bg-red-500/10 rounded border border-red-500/20 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">{t("auth.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder={t("auth.forgot_email_placeholder")}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center">
            {loading
              ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full display-inline-block"></span>
              : t("auth.forgot_btn")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-color)]/70">
          {t("auth.forgot_back")}{" "}
          <Link to="/login" className="text-[var(--color-cta)] hover:underline">{t("auth.login_btn")}</Link>
        </p>
      </div>
    </AuthBackground>
  );
};
