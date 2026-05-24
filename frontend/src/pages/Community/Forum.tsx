import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MessageSquare, PenSquare, Trash2, Send, X,
  ChevronRight, Loader2, AlertCircle, Users,
} from "lucide-react";
import { useBlogStore } from "../../store/useBlogStore";
import type { Post } from "../../store/useBlogStore";
import { useAuthStore } from "../../store/useAuthStore";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { HtmlRenderer } from "../../components/ui/HtmlRenderer";
import { useTimeAgo } from "../../hooks/useTimeAgo";

// ── helpers ───────────────────────────────────────────────────────────────────
function authorInitials(post: Post) {
  const name = post.author?.display_name || post.author?.username || "?";
  return name.slice(0, 2).toUpperCase();
}

/** Strip HTML tags — used only for search matching */
function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ── PostCard ──────────────────────────────────────────────────────────────────
function PostCard({
  post,
  currentUserId,
  onDelete,
  onClick,
}: {
  post: Post;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}) {
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleConfirmDelete() {
    setShowConfirm(false);
    setDeleting(true);
    await onDelete(post.id);
    setDeleting(false);
  }

  const isOwner = currentUserId === post.author_id;

  return (
    <>
      <ConfirmDialog
        open={showConfirm}
        title={t("forum.delete_post_title")}
        description={`"${post.title}" ${t("forum.delete_post_desc")}`}
        confirmLabel={t("confirm_dialog.delete")}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
      />

      <article
        id={`post-${post.id}`}
        onClick={() => onClick(post.id)}
        className="glass-card cursor-pointer group"
        style={{ transition: "box-shadow 200ms, transform 200ms" }}
      >
        <div className="flex justify-between items-start mb-4">
          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center font-bold text-[var(--color-primary)] text-sm select-none">
              {authorInitials(post)}
            </div>
            <div>
              <div className="font-semibold text-sm">
                {post.author?.display_name || post.author?.username}
              </div>
              <div className="text-xs text-[var(--text-color)]/50">{timeAgo(post.created_at)}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                id={`delete-post-${post.id}`}
                onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
                disabled={deleting}
                className="p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title={t("forum.delete_tooltip")}
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            )}
            <ChevronRight
              size={18}
              className="text-[var(--text-color)]/30 group-hover:text-[var(--color-primary)] transition-colors"
            />
          </div>
        </div>

        <h2 className="text-lg font-bold mb-2 group-hover:text-[var(--color-primary)] transition-colors leading-snug">
          {post.title}
        </h2>

        {/* Render HTML content, clipped to ~4 lines */}
        <div
          className="text-[var(--text-color)]/70 text-sm mb-4 overflow-hidden"
          style={{ maxHeight: "12em", maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <HtmlRenderer content={post.content} />
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-color)] text-[var(--text-color)]/50 text-xs">
          <span className="flex items-center gap-1.5">
            <MessageSquare size={13} />
            {t("forum.view_comments")}
          </span>
        </div>
      </article>
    </>
  );
}


// ── CreatePostForm (inline) ───────────────────────────────────────────────────────────
function CreatePostForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // TipTap HTML
  const { createPost, isSubmitting, error, clearError } = useBlogStore();
  const navigate = useNavigate();

  const contentIsEmpty = !content || content.replace(/<[^>]*>/g, "").trim() === "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || contentIsEmpty) return;
    try {
      const post = await createPost(title.trim(), content);
      navigate(`/community/${post.id}`);
    } catch {
      // error handled by store
    }
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--color-primary)]/40 rounded-2xl shadow-lg mb-6 overflow-hidden animate-[fadeSlideDown_200ms_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
        <h2 className="text-base font-bold flex items-center gap-2">
          <PenSquare size={16} className="text-[var(--color-primary)]" />
          {t("forum.new_post_title")}
        </h2>
        <button
          id="close-create-post-modal"
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--border-color)]/30 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            <AlertCircle size={15} />
            {error}
            <button type="button" onClick={clearError} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-[var(--text-color)]/80">
            {t("forum.new_post_field_title")} <span className="text-red-400">*</span>
          </label>
          <input
            id="new-post-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("forum.new_post_title_placeholder")}
            className="input-field"
            maxLength={200}
            autoFocus
            required
          />
        </div>

        {/* Content — WYSIWYG */}
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-[var(--text-color)]/80">
            {t("forum.new_post_field_content")} <span className="text-red-400">*</span>
          </label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder={t("forum.new_post_content_placeholder")}
            minHeight={220}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-2 px-5 text-sm"
          >
            {t("forum.cancel_btn")}
          </button>
          <button
            id="submit-new-post"
            type="submit"
            disabled={isSubmitting || !title.trim() || contentIsEmpty}
            className="btn-primary py-2 px-5 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><Loader2 size={15} className="animate-spin" /> {t("forum.publishing_btn")}</>
            ) : (
              <><Send size={15} /> {t("forum.publish_btn")}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}


// ── Main Forum Page ───────────────────────────────────────────────────────────
export const Forum = () => {
  const { posts, fetchPosts, deletePost, isLoadingPosts, error } = useBlogStore();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const filtered = posts.filter((p) => {
    const plain = stripHtml(p.content).toLowerCase();
    const q = search.toLowerCase();
    return p.title.toLowerCase().includes(q) || plain.includes(q);
  });

  // Sort newest first
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-color)] overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-4 py-8">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Users size={28} className="text-[var(--color-primary)]" />
              {t("forum.title")}
            </h1>
            <p className="text-[var(--text-color)]/60 mt-1.5 text-sm">
              {t("forum.subtitle")}
            </p>
          </div>
          {user && (
            <button
              id="open-create-post"
              onClick={() => setShowCreate((v) => !v)}
              className={`flex items-center gap-2 py-2.5 px-5 text-sm rounded-lg font-semibold transition-all duration-200 ${showCreate
                  ? "bg-[var(--border-color)]/40 text-[var(--text-color)]/60 hover:bg-[var(--border-color)]/60"
                  : "btn-primary"
                }`}
            >
              {showCreate ? <><X size={15} /> {t("forum.cancel_btn")}</> : <><PenSquare size={15} /> {t("forum.new_post_btn")}</>}
            </button>
          )}
        </div>

        {/* Inline create form */}
        {showCreate && (
          <CreatePostForm onClose={() => setShowCreate(false)} />
        )}

        {/* Search */}
        <div className="relative mb-6">
          <input
            id="forum-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("forum.search_placeholder")}
            className="input-field pl-4 pr-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-color)]/40 hover:text-[var(--text-color)]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Loading */}
        {isLoadingPosts ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-[var(--text-color)]/40">
            <Loader2 size={36} className="animate-spin text-[var(--color-primary)]" />
            <span>{t("forum.loading")}</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-[var(--text-color)]/40">
            <MessageSquare size={48} strokeWidth={1.5} />
            <p className="text-lg font-medium">
              {search ? t("forum.no_search_results") : t("forum.no_posts")}
            </p>
            {!search && (
              <button onClick={() => setShowCreate(true)} className="btn-primary py-2 px-5 text-sm">
                {t("forum.write_first_post")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-color)]/40 font-medium uppercase tracking-wider mb-2">
              {sorted.length} {sorted.length !== 1 ? t("forum.post_count_other") : t("forum.post_count_one")}
            </p>
            {sorted.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onDelete={deletePost}
                onClick={(id) => navigate(`/community/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>

  );
};

export default Forum;
