import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { api } from "../../lib/api";

const PASSWORD_HINT = "At least 8 characters, 1 uppercase letter, and 1 digit.";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
  if (!/\d/.test(pw)) return "Password must contain at least one digit.";
  return null;
}

export const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Email is passed via router state from ForgotPassword page
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

    const pwError = validatePassword(newPassword);
    if (pwError) { setError(pwError); return; }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
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
      setError(err.response?.data?.detail || "Failed to reset password. The code may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-card w-full max-w-md p-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-4">Password Reset Successful!</h1>
          <p className="text-[var(--text-color)]/70 mb-4">
            You can now log in with your new password. Redirecting in 3 seconds…
          </p>
          <button onClick={() => navigate("/login")} className="btn-primary w-full mt-4">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col items-center justify-center p-6">
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-primary)] tracking-tight mb-2">Reset Password</h1>
          <p className="text-[var(--text-color)]/70">Enter the OTP sent to your email and choose a new password</p>
        </div>

        <form onSubmit={handleResetPassword} noValidate className="space-y-5">
          {error && (
            <div className="p-3 text-red-500 bg-red-500/10 rounded border border-red-500/20 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">OTP Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className="input-field tracking-widest text-center text-xl font-mono"
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
            />
            <p className="mt-1 text-xs text-[var(--text-color)]/50">Check your inbox for the 6-digit code (valid 15 minutes).</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="input-field"
              placeholder="••••••••"
              minLength={8}
            />
            <p className="mt-1 text-xs text-[var(--text-color)]/50">{PASSWORD_HINT}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="input-field"
              placeholder="••••••••"
              minLength={8}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center">
            {loading
              ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full display-inline-block"></span>
              : "Reset Password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-color)]/70">
          Didn't receive a code?{" "}
          <Link to="/forgot-password" className="text-[var(--color-cta)] hover:underline">Send again</Link>
        </p>
      </div>
    </div>
  );
};
