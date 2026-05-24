import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LogOut, KeyRound, Edit2, ShieldCheck, ShieldAlert, BadgeCheck } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/useAuthStore";

function getPasswordStrength(password: string, t: (k: string) => string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: t("auth.password_strength_weak"), color: "bg-red-500" };
  if (score <= 3) return { score, label: t("auth.password_strength_fair"), color: "bg-yellow-500" };
  if (score === 4) return { score, label: t("auth.password_strength_good"), color: "bg-blue-500" };
  return { score, label: t("auth.password_strength_strong"), color: "bg-green-500" };
}

export const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout, user, checkAuth } = useAuthStore();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.display_name || "");
  const [editUsername, setEditUsername] = useState(user?.username || "");
  const [editBio, setEditBio] = useState(user?.bio || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const passwordStrength = getPasswordStrength(newPassword, t);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileLoading(true);

    try {
      const payload: Record<string, string> = { username: editUsername };
      if (editDisplayName) payload.display_name = editDisplayName;
      if (editBio !== undefined) payload.bio = editBio;

      await api.patch("/auth/me", payload);
      await checkAuth();
      setProfileSuccess(t("auth.profile_updated_success"));
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (err: any) {
      setProfileError(err.response?.data?.detail || err.message || t("common.error"));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    if (!user?.email) {
      setPwdError("User email not found.");
      return;
    }

    setPwdLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", user.email);
      formData.append("password", currentPassword);

      try {
        await api.post("/auth/login", formData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } catch {
        throw new Error(t("auth.error_incorrect_current_password"));
      }

      await api.patch("/auth/me", { password: newPassword });

      setPwdSuccess(t("auth.profile_update_password") + " ✓");
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwdSuccess(""), 3000);
    } catch (err: any) {
      setPwdError(err.message || t("auth.error_failed_update_password"));
    } finally {
      setPwdLoading(false);
    }
  };

  const initials = (user?.display_name || user?.username || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{t("auth.profile_title")}</h1>

      {/* Avatar + identity header */}
      <div className="glass-card flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar — display only */}
        <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 flex items-center justify-center text-3xl font-bold text-[var(--color-primary)] shrink-0">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <span className="text-2xl font-bold">
              {user?.display_name || user?.username}
            </span>
            {user?.is_verified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <BadgeCheck size={12} /> {t("auth.profile_verified")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                <ShieldAlert size={12} /> {t("auth.profile_unverified")}
              </span>
            )}
            {user?.role === "admin" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <ShieldCheck size={12} /> {t("auth.profile_admin")}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-color)]/60">@{user?.username}</p>
          <p className="text-sm text-[var(--text-color)]/60">{user?.email}</p>
        </div>
      </div>

      {/* User Information */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--color-primary)]">{t("auth.profile_user_info")}</h2>
          {!isEditingProfile && (
            <button
              onClick={() => {
                setEditDisplayName(user?.display_name || "");
                setEditUsername(user?.username || "");
                setEditBio(user?.bio || "");
                setIsEditingProfile(true);
              }}
              className="text-[var(--text-color)]/70 hover:text-[var(--color-primary)] transition-colors p-2"
              title={t("auth.profile_edit")}
            >
              <Edit2 size={18} />
            </button>
          )}
        </div>

        {profileSuccess && (
          <div className="mb-4 p-3 text-green-500 bg-green-500/10 rounded border border-green-500/20 text-sm">
            {profileSuccess}
          </div>
        )}
        {profileError && (
          <div className="mb-4 p-3 text-red-500 bg-red-500/10 rounded border border-red-500/20 text-sm">
            {profileError}
          </div>
        )}

        {isEditingProfile ? (
          <form onSubmit={handleEditProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">{t("auth.profile_display_name")}</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="input-field"
                  placeholder={t("auth.profile_display_name_placeholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">{t("auth.profile_username")}</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  className="input-field"
                  placeholder={t("auth.profile_username_placeholder")}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">{t("auth.profile_bio")}</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="input-field resize-none h-24"
                  placeholder={t("auth.profile_bio_placeholder")}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2 justify-end">
              <button
                type="button"
                onClick={() => { setIsEditingProfile(false); setProfileError(""); }}
                className="px-4 py-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--border-color)]/50 transition-colors"
                disabled={profileLoading}
              >
                {t("auth.profile_cancel")}
              </button>
              <button type="submit" disabled={profileLoading} className="btn-primary">
                {profileLoading ? t("auth.profile_saving") : t("auth.profile_save")}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">{t("auth.profile_display_name")}</label>
              <div className="text-lg">{user?.display_name || <span className="text-[var(--text-color)]/40 italic text-base">{t("auth.profile_display_name_empty")}</span>}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">{t("auth.profile_username")}</label>
              <div className="text-lg">@{user?.username}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">{t("auth.profile_email")}</label>
              <div className="text-lg">{user?.email}</div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">{t("auth.profile_bio")}</label>
              <div className="text-md text-[var(--text-color)]/90 whitespace-pre-line">
                {user?.bio || <span className="text-[var(--text-color)]/40 italic">{t("auth.profile_bio_empty")}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Settings */}
      <div className="glass-card">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-1">{t("auth.profile_account_settings")}</h2>
        <p className="text-sm text-[var(--text-color)]/70 mb-4">{t("auth.profile_account_desc")}</p>

        {pwdSuccess && (
          <div className="mb-4 p-3 text-green-500 bg-green-500/10 rounded border border-green-500/20 text-sm">
            {pwdSuccess}
          </div>
        )}

        {!isChangingPassword ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-[var(--border-color)]/30">
            <div>
              <p className="font-medium text-sm">{t("auth.profile_password")}</p>
              <p className="text-xs text-[var(--text-color)]/50 mt-0.5">{t("auth.profile_password_last")}</p>
            </div>
            <button
              onClick={() => setIsChangingPassword(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <KeyRound size={16} />
              {t("auth.profile_change_password")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="mt-2 space-y-4 border-t border-[var(--border-color)]/30 pt-6">
            <h3 className="font-medium">{t("auth.profile_change_password")}</h3>

            {pwdError && (
              <div className="p-3 text-red-500 bg-red-500/10 rounded border border-red-500/20 text-sm">
                {pwdError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">{t("auth.profile_current_password")}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="input-field max-w-md"
                placeholder={t("auth.profile_current_password_placeholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">{t("auth.profile_new_password")}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="input-field max-w-md"
                placeholder={t("auth.profile_new_password_placeholder")}
                minLength={8}
              />
              {newPassword && (
                <div className="mt-2 max-w-md">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= passwordStrength.score ? passwordStrength.color : "bg-[var(--border-color)]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-color)]/60">
                    {t("auth.password_strength_label")} <span className="font-medium">{passwordStrength.label}</span>
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">{t("auth.profile_confirm_password")}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input-field max-w-md"
                placeholder={t("auth.profile_confirm_password_placeholder")}
                minLength={8}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="mt-1 text-xs text-red-500">{t("auth.passwords_no_match")}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPwdError("");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="px-4 py-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--border-color)]/50 transition-colors"
                disabled={pwdLoading}
              >
                {t("auth.profile_cancel")}
              </button>
              <button type="submit" disabled={pwdLoading} className="btn-primary">
                {pwdLoading ? t("auth.profile_updating") : t("auth.profile_update_password")}
              </button>
            </div>
          </form>
        )}

        {/* Sign Out — trong cùng card Account Settings */}
        <div className="mt-6 pt-4 border-t border-[var(--border-color)]/30 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{t("auth.profile_sign_out")}</p>
            <p className="text-xs text-[var(--text-color)]/50 mt-0.5">{t("auth.profile_sign_out_desc")}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-semibold transition-colors text-sm"
          >
            <LogOut size={16} />
            {t("auth.profile_sign_out")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
