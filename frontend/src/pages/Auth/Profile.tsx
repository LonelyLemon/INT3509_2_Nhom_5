import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LogOut, KeyRound, Edit2 } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/useAuthStore";

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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileLoading(true);

    try {
      const payload: any = { username: editUsername };
      if (editDisplayName) payload.display_name = editDisplayName;
      if (editBio) payload.bio = editBio;

      await api.patch("/auth/me", payload);
      await checkAuth(); // refresh user info globally
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
      // 1. Verify current password by attempting a login
      const formData = new URLSearchParams();
      formData.append("username", user.email);
      formData.append("password", currentPassword);
      
      try {
        await api.post("/auth/login", formData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
      } catch (err: any) {
        throw new Error("Incorrect current password.");
      }

      // 2. Update to new password
      await api.patch("/auth/me", { password: newPassword });
      
      setPwdSuccess("Password updated successfully.");
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Clear success message after 3 seconds
      setTimeout(() => setPwdSuccess(""), 3000);
    } catch (err: any) {
      setPwdError(err.message || "Failed to update password.");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">{t("auth.profile")}</h1>
      
      <div className="glass-card mb-8 relative">
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

        {profileSuccess && <div className="mb-4 p-3 text-green-500 bg-green-500/10 rounded border border-green-500/20 text-sm">{profileSuccess}</div>}
        {profileError && <div className="mb-4 p-3 text-red-500 bg-red-500/10 rounded border border-red-500/20 text-sm">{profileError}</div>}

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
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileError("");
                }}
                className="px-4 py-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--border-color)]/50 transition-colors"
                disabled={profileLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={profileLoading} 
                className="btn-primary"
              >
                {profileLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Display Name</label>
              <div className="text-lg">{user?.display_name || user?.username || "User"}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Username</label>
              <div className="text-lg">@{user?.username}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Email</label>
              <div className="text-lg">{user?.email || "Email"}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Subscription</label>
              <div className="text-lg text-[var(--color-cta)] font-semibold">Pro Plan</div>
            </div>
            {user?.bio && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-[var(--text-color)]/70">Bio</label>
                <div className="text-md text-[var(--text-color)]/90 whitespace-pre-line">{user.bio}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-primary)]">Account Settings</h2>
            <p className="text-sm text-[var(--text-color)]/70 mt-1">Manage your security and preferences.</p>
          </div>
          {!isChangingPassword && (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsChangingPassword(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <KeyRound size={16} />
                Change Password
              </button>
            </div>
          )}
        </div>

        {pwdSuccess && <div className="mb-4 p-3 text-green-500 bg-green-500/10 rounded border border-green-500/20 text-sm">{pwdSuccess}</div>}

        {isChangingPassword && (
          <form onSubmit={handleChangePassword} className="mt-6 space-y-4 border-t border-[var(--border-color)]/30 pt-6">
            <h3 className="font-medium mb-4">Change Password</h3>
            
            {pwdError && <div className="p-3 text-red-500 bg-red-500/10 rounded border border-red-500/20 text-sm">{pwdError}</div>}
            
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
                minLength={6}
              />
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
                minLength={6}
              />
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
              <button 
                type="submit" 
                disabled={pwdLoading} 
                className="btn-primary"
              >
                {pwdLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <button 
          onClick={handleLogout}
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
