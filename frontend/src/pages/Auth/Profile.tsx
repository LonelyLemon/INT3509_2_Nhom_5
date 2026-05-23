import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LogOut, KeyRound, Edit2, Camera, ShieldCheck, ShieldAlert, BadgeCheck } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/useAuthStore";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 3) return { score, label: "Fair", color: "bg-yellow-500" };
  if (score === 4) return { score, label: "Good", color: "bg-blue-500" };
  return { score, label: "Strong", color: "bg-green-500" };
}

export const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout, user, checkAuth } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const passwordStrength = getPasswordStrength(newPassword);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be under 5MB.");
      return;
    }

    setAvatarError("");
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      await api.patch("/auth/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await checkAuth();
    } catch {
      // Fallback: store as base64 data URL for preview (no server upload endpoint yet)
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await api.patch("/auth/me", { avatar_url: reader.result as string });
          await checkAuth();
        } catch {
          setAvatarError("Failed to update avatar.");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setAvatarLoading(false);
    }
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
      setProfileSuccess("Profile updated successfully.");
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (err: any) {
      setProfileError(err.response?.data?.detail || err.message || "Failed to update profile");
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
        throw new Error("Incorrect current password.");
      }

      await api.patch("/auth/me", { password: newPassword });

      setPwdSuccess("Password updated successfully.");
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwdSuccess(""), 3000);
    } catch (err: any) {
      setPwdError(err.message || "Failed to update password.");
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
      <h1 className="text-3xl font-bold">{t("auth.profile")}</h1>

      {/* Avatar + identity header */}
      <div className="glass-card flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 flex items-center justify-center text-3xl font-bold text-[var(--color-primary)]">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarLoading}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow"
            title="Change avatar"
          >
            <Camera size={13} />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <span className="text-2xl font-bold">
              {user?.display_name || user?.username}
            </span>
            {user?.is_verified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <BadgeCheck size={12} /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                <ShieldAlert size={12} /> Unverified
              </span>
            )}
            {user?.role === "admin" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <ShieldCheck size={12} /> Admin
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-color)]/60">@{user?.username}</p>
          <p className="text-sm text-[var(--text-color)]/60">{user?.email}</p>
          {avatarError && (
            <p className="mt-2 text-xs text-red-500">{avatarError}</p>
          )}
        </div>
      </div>

      {/* User Information */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--color-primary)]">User Information</h2>
          {!isEditingProfile && (
            <button
              onClick={() => {
                setEditDisplayName(user?.display_name || "");
                setEditUsername(user?.username || "");
                setEditBio(user?.bio || "");
                setIsEditingProfile(true);
              }}
              className="text-[var(--text-color)]/70 hover:text-[var(--color-primary)] transition-colors p-2"
              title="Edit Profile"
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
                <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="input-field"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  className="input-field"
                  placeholder="johndoe"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="input-field resize-none h-24"
                  placeholder="Tell us about yourself..."
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
                Cancel
              </button>
              <button type="submit" disabled={profileLoading} className="btn-primary">
                {profileLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Display Name</label>
              <div className="text-lg">{user?.display_name || <span className="text-[var(--text-color)]/40 italic text-base">Not set</span>}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Username</label>
              <div className="text-lg">@{user?.username}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Email</label>
              <div className="text-lg">{user?.email}</div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Bio</label>
              <div className="text-md text-[var(--text-color)]/90 whitespace-pre-line">
                {user?.bio || <span className="text-[var(--text-color)]/40 italic">No bio yet. Tell others a bit about yourself!</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Settings */}
      <div className="glass-card">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-1">Account Settings</h2>
        <p className="text-sm text-[var(--text-color)]/70 mb-4">Manage your security and preferences.</p>

        {pwdSuccess && (
          <div className="mb-4 p-3 text-green-500 bg-green-500/10 rounded border border-green-500/20 text-sm">
            {pwdSuccess}
          </div>
        )}

        {!isChangingPassword ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-[var(--border-color)]/30">
            <div>
              <p className="font-medium text-sm">Password</p>
              <p className="text-xs text-[var(--text-color)]/50 mt-0.5">Last changed: unknown</p>
            </div>
            <button
              onClick={() => setIsChangingPassword(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <KeyRound size={16} />
              Change Password
            </button>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="mt-2 space-y-4 border-t border-[var(--border-color)]/30 pt-6">
            <h3 className="font-medium">Change Password</h3>

            {pwdError && (
              <div className="p-3 text-red-500 bg-red-500/10 rounded border border-red-500/20 text-sm">
                {pwdError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="input-field max-w-md"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="input-field max-w-md"
                placeholder="••••••••"
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
                    Strength: <span className="font-medium">{passwordStrength.label}</span>
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input-field max-w-md"
                placeholder="••••••••"
                minLength={8}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
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
                Cancel
              </button>
              <button type="submit" disabled={pwdLoading} className="btn-primary">
                {pwdLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}

        {/* Sign Out — trong cùng card Account Settings */}
        <div className="mt-6 pt-4 border-t border-[var(--border-color)]/30 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Sign Out</p>
            <p className="text-xs text-[var(--text-color)]/50 mt-0.5">Log out of your account on this device.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-semibold transition-colors text-sm"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
