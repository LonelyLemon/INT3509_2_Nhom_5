import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle } from "lucide-react";
import { api } from "../../lib/api";
import { AuthBackground } from "./AuthBackground";

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        setMessage(t("auth.error_verify_token_missing"));
        return;
      }

      try {
        const res = await api.get(`/auth/verify-email?token=${token}`);
        setStatus("success");
        setMessage(res.data.message || t("auth.verify_title"));
        setTimeout(() => { navigate("/login"); }, 3000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.detail || t("auth.error_verify_failed"));
      }
    };

    verifyToken();
  }, [searchParams, navigate, t]);

  return (
    <AuthBackground>
      <div className="glass-card w-full max-w-md p-10 text-center flex flex-col items-center">
        {status === "loading" && (
          <div className="animate-spin h-12 w-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mb-6"></div>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-4">{t("auth.verify_title")}</h1>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
              <XCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-4">{t("auth.verify_failed_title")}</h1>
          </>
        )}
        <p className="text-[var(--text-color)]/70 mb-8 leading-relaxed">
          {status === "loading" ? t("auth.verify_loading") : message}
        </p>
        {status !== "loading" && (
          <button onClick={() => navigate("/login")} className="btn-primary w-full">
            {t("auth.verify_login")}
          </button>
        )}
      </div>
    </AuthBackground>
  );
};
