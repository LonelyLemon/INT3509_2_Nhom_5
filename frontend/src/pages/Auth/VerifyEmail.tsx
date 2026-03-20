import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { api } from "../../lib/api";

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        return;
      }

      try {
        const res = await api.get(`/auth/verify-email?token=${token}`);
        setStatus("success");
        setMessage(res.data.message || "Email verified successfully!");
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.detail || "Failed to verify email. The link may have expired.");
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col items-center justify-center p-6">
      <div className="glass-card w-full max-w-md p-10 text-center flex flex-col items-center">
        {status === "loading" && (
          <div className="animate-spin h-12 w-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mb-6"></div>
        )}
        
        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-4">Verified!</h1>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
              <XCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-4">Verification Failed</h1>
          </>
        )}

        <p className="text-[var(--text-color)]/70 mb-8 leading-relaxed">
          {status === "loading" ? "Verifying your email address..." : message}
        </p>

        {status !== "loading" && (
          <button onClick={() => navigate("/login")} className="btn-primary w-full">
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
};
