import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { AuthBackground } from "./AuthBackground";

export const CheckEmail = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const email = location.state?.email || "your email";

  return (
    <AuthBackground>
      <div className="glass-card w-full max-w-md p-10 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-full flex items-center justify-center mb-6">
          <Mail size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-4">{t("auth.check_email_title")}</h1>
        <p className="text-[var(--text-color)]/70 mb-8 leading-relaxed">
          {t("auth.check_email_desc")}{" "}
          <span className="font-semibold text-[var(--text-color)]">{email}</span>.
        </p>
        <Link to="/login" className="btn-primary w-full">
          {t("auth.check_email_login")}
        </Link>
      </div>
    </AuthBackground>
  );
};
