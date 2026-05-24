import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, Loader2, ShieldCheck, ShieldOff, UserX, UserCheck,
  ChevronLeft, ChevronRight, BadgeCheck, ShieldAlert,
} from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "./components/ConfirmDialog";
import type { AdminUser } from "./types";
import { useAuthStore } from "../../store/useAuthStore";

interface UsersResponse {
  total: number;
  page: number;
  limit: number;
  users: AdminUser[];
}

function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  return role === "admin" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
      <ShieldCheck size={11} /> {t("admin.users_role_admin")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--border-color)]/40 text-[var(--text-color)]/60">
      {t("admin.users_role_user")}
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-xs text-blue-400">
      <BadgeCheck size={12} /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-yellow-600/80">
      <ShieldAlert size={12} /> Unverified
    </span>
  );
}

export function AdminUsers() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [bannedFilter, setBannedFilter] = useState("");

  const [confirm, setConfirm] = useState<{
    open: boolean; title: string; description: string;
    confirmLabel: string; danger: boolean; onConfirm: () => void;
  }>({ open: false, title: "", description: "", confirmLabel: "", danger: false, onConfirm: () => {} });

  const LIMIT = 15;
  const totalPages = Math.ceil(total / LIMIT);

  const fetchUsers = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get<UsersResponse>("/auth/admin/users", {
        params: { page: p, limit: LIMIT, search, role: roleFilter, is_banned: bannedFilter },
      });
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch { /* silently ignore */ }
    finally { setLoading(false); }
  }, [page, search, roleFilter, bannedFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, bannedFilter]);

  useEffect(() => {
    fetchUsers(page);
  }, [page, search, roleFilter, bannedFilter]);

  const handleBanToggle = (user: AdminUser) => {
    const next = !user.is_banned;
    setConfirm({
      open: true,
      title: `${next ? t("admin.users_ban") : t("admin.users_unban")} — ${user.username}?`,
      description: next
        ? `${user.username} sẽ không thể đăng nhập. Bạn có thể đảo ngược điều này bất kỳ lúc nào.`
        : `${user.username} sẽ có thể đăng nhập lại.`,
      confirmLabel: next ? t("admin.users_ban") : t("admin.users_unban"),
      danger: next,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try {
          const res = await api.patch(`/auth/users/${user.id}/ban`);
          setUsers((prev) =>
            prev.map((u) => u.id === user.id ? { ...u, is_banned: res.data.is_banned } : u)
          );
        } catch { /* TODO: surface error */ }
      },
    });
  };

  const handleRoleToggle = (user: AdminUser) => {
    const next = user.role === "admin" ? "user" : "admin";
    setConfirm({
      open: true,
      title: `${next === "admin" ? t("admin.users_promote") : t("admin.users_demote")} — ${user.username}?`,
      description: next === "admin"
        ? `${user.username} sẽ có quyền truy cập admin đầy đủ.`
        : `${user.username} sẽ mất quyền admin và trở thành người dùng thường.`,
      confirmLabel: next === "admin" ? t("admin.users_promote") : t("admin.users_demote"),
      danger: next !== "admin",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try {
          const res = await api.patch(`/auth/users/${user.id}/role`, { role: next });
          setUsers((prev) =>
            prev.map((u) => u.id === user.id ? { ...u, role: res.data.role } : u)
          );
        } catch { /* TODO: surface error */ }
      },
    });
  };

  const isSelf = (user: AdminUser) => user.id === currentUser?.id;

  return (
    <>
      <ConfirmDialog {...confirm} onCancel={() => setConfirm((c) => ({ ...c, open: false }))} />

      <div className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40">{t("admin.users_title")}</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              placeholder={t("admin.users_search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="">{t("admin.users_all_roles")}</option>
            <option value="admin">{t("admin.users_role_admin")}</option>
            <option value="user">{t("admin.users_role_user")}</option>
          </select>
          <select
            value={bannedFilter}
            onChange={(e) => setBannedFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="">{t("admin.users_all_status")}</option>
            <option value="false">{t("admin.users_active")}</option>
            <option value="true">{t("admin.users_banned")}</option>
          </select>
          <button
            onClick={() => fetchUsers(page)}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer"
            title={t("admin.refresh_list")}
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          </button>
        </div>

        {/* Table */}
        <div className="glass-card !p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-color)] text-sm font-semibold">
            {loading ? t("admin.users_loading") : `${total} ${t("admin.users_no_results") === "Không tìm thấy người dùng." ? "người dùng" : "users"}`}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40 opacity-50">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center h-40 opacity-40 text-sm">{t("admin.users_no_results")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    {[t("admin.users_col_user"), t("admin.users_col_role"), t("admin.users_col_status"), t("admin.users_col_joined"), t("admin.users_col_actions")].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold opacity-40 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={cn(
                        "border-b border-[var(--border-color)]/50 hover:bg-[var(--color-primary)]/4 transition-colors",
                        user.is_banned && "opacity-50"
                      )}
                    >
                      {/* User info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)] shrink-0">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (user.display_name || user.username)[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-medium leading-tight">
                              {user.display_name || user.username}
                              {isSelf(user) && <span className="ml-1 text-xs opacity-40">(you)</span>}
                            </div>
                            <div className="text-xs opacity-50">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>

                      {/* Verified + banned */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <VerifiedBadge verified={user.is_verified} />
                          {user.is_banned && (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                              <UserX size={11} /> {t("admin.users_banned")}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-xs opacity-50 whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Ban / Unban */}
                          <button
                            onClick={() => handleBanToggle(user)}
                            disabled={isSelf(user)}
                            title={user.is_banned ? t("admin.users_unban") : t("admin.users_ban")}
                            className={cn(
                              "p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
                              user.is_banned
                                ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                : "border-red-500/30 text-red-400 hover:bg-red-500/10"
                            )}
                          >
                            {user.is_banned ? <UserCheck size={14} /> : <UserX size={14} />}
                          </button>

                          {/* Promote / Demote */}
                          <button
                            onClick={() => handleRoleToggle(user)}
                            disabled={isSelf(user)}
                            title={user.role === "admin" ? t("admin.users_demote") : t("admin.users_promote")}
                            className={cn(
                              "p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
                              user.role === "admin"
                                ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                : "border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                            )}
                          >
                            {user.role === "admin" ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-[var(--border-color)] flex items-center justify-between text-sm">
              <span className="text-xs opacity-50">
                {t("admin.users_page", { page, total: totalPages })}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-[var(--border-color)] hover:border-[var(--color-primary)]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-[var(--border-color)] hover:border-[var(--color-primary)]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
