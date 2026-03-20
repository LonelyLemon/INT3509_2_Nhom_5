import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";

export const ForgotPassword = () => {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forget-password", { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col items-center justify-center p-6">
        <div className="glass-card w-full max-w-md p-10 text-center">
          <h1 className="text-2xl font-bold mb-4">Check your email</h1>
          <p className="text-[var(--text-color)]/70 mb-8 leading-relaxed">
            We've sent a password reset link to <span className="font-semibold text-[var(--text-color)]">{email}</span>. Click the link to reset your password.
          </p>
          <Link to="/login" className="btn-primary w-full inline-block text-center mt-4">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col items-center justify-center p-6">
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-primary)] tracking-tight mb-2">Reset Password</h1>
          <p className="text-[var(--text-color)]/70">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-6">
          {error && <div className="p-3 text-red-500 bg-red-500/10 rounded border border-red-500/20 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="name@example.com" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center">
            {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full display-inline-block"></span> : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-color)]/70">
          Remembered your password? <Link to="/login" className="text-[var(--color-cta)] hover:underline">{t("auth.login")}</Link>
        </p>
      </div>
    </div>
  );
};
