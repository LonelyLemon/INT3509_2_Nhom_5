import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { api } from "../../lib/api";

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Reset token is missing.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { 
        token,
        password 
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Invalid Link</h1>
        <p className="text-[var(--text-color)]/70">The password reset link is invalid or missing.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-card w-full max-w-md p-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-4">Password Reset Successful!</h1>
          <p className="text-[var(--text-color)]/70 mb-4">You can now login with your new password.</p>
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
          <h1 className="text-3xl font-bold text-[var(--color-primary)] tracking-tight mb-2">Create New Password</h1>
          <p className="text-[var(--text-color)]/70">Enter your new password below</p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6">
          {error && <div className="p-3 text-red-500 bg-red-500/10 rounded border border-red-500/20 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-2">New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field" placeholder="••••••••" minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="input-field" placeholder="••••••••" minLength={6} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center">
            {loading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full display-inline-block"></span> : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
};
