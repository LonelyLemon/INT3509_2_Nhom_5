import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const SignUp = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col items-center justify-center p-6">
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-primary)] tracking-tight mb-2">MarketMind</h1>
          <p className="text-[var(--text-color)]/70">Create a new account</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input type="text" required className="input-field" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input type="email" required className="input-field" placeholder="name@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input type="password" required className="input-field" placeholder="••••••••" />
          </div>

          <button type="submit" className="btn-primary w-full">
            {t("auth.signup")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-color)]/70">
          Already have an account? <Link to="/login" className="text-[var(--color-cta)] hover:underline">{t("auth.login")}</Link>
        </p>
      </div>
    </div>
  );
};
