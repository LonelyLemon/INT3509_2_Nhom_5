import { useLocation, Link } from "react-router-dom";
import { Mail } from "lucide-react";

export const CheckEmail = () => {
  const location = useLocation();
  const email = location.state?.email || "your email";

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col items-center justify-center p-6">
      <div className="glass-card w-full max-w-md p-10 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-full flex items-center justify-center mb-6">
          <Mail size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-4">Check your email</h1>
        <p className="text-[var(--text-color)]/70 mb-8 leading-relaxed">
          We've sent a verification link to <span className="font-semibold text-[var(--text-color)]">{email}</span>. Please check your inbox and click the link to verify your account.
        </p>

        <Link to="/login" className="btn-primary w-full">
          Back to Login
        </Link>
      </div>
    </div>
  );
};
