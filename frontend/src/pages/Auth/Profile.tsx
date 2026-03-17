import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

export const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">{t("auth.profile")}</h1>
      
      <div className="glass-card mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[var(--color-primary)]">User Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Full Name</label>
            <div className="text-lg">John Doe</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Email</label>
            <div className="text-lg">name@example.com</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Subscription</label>
            <div className="text-lg text-[var(--color-cta)] font-semibold">Pro Plan</div>
          </div>
        </div>
      </div>

      <div className="glass-card flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-primary)]">Account Settings</h2>
          <p className="text-sm text-[var(--text-color)]/70 mt-1">Manage your security and preferences.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="btn-secondary">Change Password</button>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-semibold transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Profile;
