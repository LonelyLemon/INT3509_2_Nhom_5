import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Trash2, MessageSquare, Send, CornerDownRight,
  Loader2, AlertCircle, X, Users,
} from "lucide-react";
import { useBlogStore } from "../../store/useBlogStore";
import type { Comment } from "../../store/useBlogStore";
import { useAuthStore } from "../../store/useAuthStore";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { HtmlRenderer } from "../../components/ui/HtmlRenderer";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { useTimeAgo } from "../../hooks/useTimeAgo";

function initials(name?: string) {
  return (name || "?").slice(0, 2).toUpperCase();
}

// ── CommentItem ───────────────────────────────────────────────────────────────
function CommentItem({
  comment,
  replies,
  currentUserId,
  onDelete,
  onReply,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId?: string;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string, parentAuthor: string) => void;
}) {
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const isOwner = currentUserId === comment.author_id;
  const authorName = comment.author?.display_name || comment.author?.username || "Unknown";

  return (
    <div id={`comment-${comment.id}`} className="group">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/15 flex items-center justify-center font-bold text-[var(--color-primary)] text-xs flex-shrink-0 select-none">
          {initials(authorName)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Bubble */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-semibold text-sm">{authorName}</span>
              <span className="text-xs text-[var(--text-color)]/40">{timeAgo(comment.created_at)}</span>
            </div>
            <HtmlRenderer content={comment.content} className="text-sm" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1.5 ml-1">
            <button
              id={`reply-comment-${comment.id}`}
              onClick={() => onReply(comment.id, authorName)}
              className="text-xs text-[var(--text-color)]/50 hover:text-[var(--color-primary)] transition-colors flex items-center gap-1 font-medium"
            >
              <CornerDownRight size={12} /> {t("post_detail.reply_btn")}
            </button>
            {isOwner && (
              <button
                id={`delete-comment-${comment.id}`}
                onClick={() => onDelete(comment.id)}
                className="text-xs text-red-400/50 hover:text-red-400 transition-colors flex items-center gap-1 font-medium"
              >
                <Trash2 size={12} /> {t("common.delete")}
              </button>
            )}
          </div>

          {/* Nested replies */}
          {replies.length > 0 && (
            <div className="mt-3 space-y-3 pl-4 border-l-2 border-[var(--border-color)]">
              {replies.map((reply) => (
                <div key={reply.id} id={`comment-${reply.id}`} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-secondary)]/15 flex items-center justify-center font-bold text-[var(--color-secondary)] text-xs flex-shrink-0 select-none">
                    {initials(reply.author?.display_name || reply.author?.username)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-sm">
                          {reply.author?.display_name || reply.author?.username}
                        </span>
                        <span className="text-xs text-[var(--text-color)]/40">{timeAgo(reply.created_at)}</span>
                      </div>
                      <HtmlRenderer content={reply.content} className="text-sm" />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 ml-1">
                      {currentUserId === reply.author_id && (
                        <button
                          id={`delete-comment-${reply.id}`}
                          onClick={() => onDelete(reply.id)}
                          className="text-xs text-red-400/50 hover:text-red-400 transition-colors flex items-center gap-1 font-medium"
                        >
                          <Trash2 size={12} /> {t("common.delete")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PostDetail ────────────────────────────────────────────────────────────────
export const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();

  const {
    currentPost,
    comments,
    isLoadingPost,
    isLoadingComments,
    isSubmitting,
    error,
    fetchPost,
    deletePost,
    fetchComments,
    createComment,
    deleteComment,
    clearError,
  } = useBlogStore();

  const [commentText, setCommentText] = useState(""); // stores HTML from TipTap
  const [commentKey, setCommentKey] = useState(0);   // bump to reset editor
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);

  // ── Confirm dialog ────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const closeConfirm = () => setConfirm((c) => ({ ...c, open: false }));

  useEffect(() => {
    if (!postId) return;
    fetchPost(postId);
    fetchComments(postId);
  }, [postId, fetchPost, fetchComments]);

  async function handleDeletePost() {
    if (!currentPost) return;
    setConfirm({
      open: true,
      title: t("post_detail.delete_post_title"),
      description: t("post_detail.delete_post_desc"),
      onConfirm: async () => {
        closeConfirm();
        await deletePost(currentPost.id);
        navigate("/community");
      },
    });
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    const isEmpty = !commentText || commentText.replace(/<[^>]*>/g, "").trim() === "";
    if (!postId || isEmpty) return;
    await createComment(postId, commentText, replyTo?.id);
    setCommentText("");
    setCommentKey((k) => k + 1); // reset editor
    setReplyTo(null);
  }

  async function handleDeleteComment(commentId: string) {
    if (!postId) return;
    const target = comments.find((c) => c.id === commentId);
    setConfirm({
      open: true,
      title: t("post_detail.delete_comment_title"),
      description: target
        ? t("post_detail.delete_comment_with_replies")
        : t("post_detail.delete_comment_simple"),
      onConfirm: async () => {
        closeConfirm();
        await deleteComment(postId, commentId);
      },
    });
  }

  // Split top-level vs replies
  const topLevel = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const isPostOwner = user?.id === currentPost?.author_id;
  const authorName = currentPost?.author?.display_name || currentPost?.author?.username || "Unknown";

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoadingPost) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg-color)]">
        <div className="flex flex-col items-center gap-4 text-[var(--text-color)]/40">
          <Loader2 size={40} className="animate-spin text-[var(--color-primary)]" />
          <span>{t("post_detail.loading_post")}</span>
        </div>
      </div>
    );
  }

  if (!currentPost && !isLoadingPost) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg-color)]">
        <div className="flex flex-col items-center gap-4 text-[var(--text-color)]/50">
          <AlertCircle size={48} strokeWidth={1.5} />
          <p className="text-xl font-semibold">{t("post_detail.post_not_found")}</p>
          <button onClick={() => navigate("/community")} className="btn-primary py-2 px-5 text-sm">
            {t("post_detail.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-color)] overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-4 py-8">

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirm.open}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={t("confirm_dialog.delete")}
          danger
          onConfirm={confirm.onConfirm}
          onCancel={closeConfirm}
        />

        {/* Back */}
        <button
          id="back-to-forum"
          onClick={() => navigate("/community")}
          className="flex items-center gap-2 text-sm text-[var(--text-color)]/60 hover:text-[var(--color-primary)] transition-colors mb-6 font-medium"
        >
          <ArrowLeft size={16} />
          {t("post_detail.back")}
        </button>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle size={15} /> {error}
            <button onClick={clearError} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Post Card */}
        {currentPost && (
          <article className="glass-card mb-8">
            {/* Author row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center font-bold text-[var(--color-primary)] select-none">
                  {initials(authorName)}
                </div>
                <div>
                  <div className="font-semibold">{authorName}</div>
                  <div className="text-xs text-[var(--text-color)]/50">
                    {new Date(currentPost.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                    {" · "}
                    {timeAgo(currentPost.created_at)}
                  </div>
                </div>
              </div>

              {isPostOwner && (
                <button
                  id="delete-post-btn"
                  onClick={handleDeletePost}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors font-medium"
                >
                  <Trash2 size={15} /> {t("post_detail.delete_post_tooltip")}
                </button>
              )}
            </div>

            <h1 className="text-2xl font-bold mb-4 leading-snug">{currentPost.title}</h1>
            <HtmlRenderer content={currentPost.content} className="text-sm text-[var(--text-color)]/80" />
          </article>
        )}

        {/* Comments section */}
        <section>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            <MessageSquare size={18} className="text-[var(--color-primary)]" />
            {t("post_detail.comments_title")}
            {!isLoadingComments && (
              <span className="text-sm font-normal text-[var(--text-color)]/50">
                ({comments.length})
              </span>
            )}
          </h2>

          {/* Comment input */}
          {user ? (
            <form
              id="comment-form"
              onSubmit={handleSubmitComment}
              className="glass-card mb-7 !p-4"
              style={{ transform: "none" }}
            >
              {/* Reply banner inside form */}
              {replyTo && (
                <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg text-xs text-[var(--color-primary)]">
                  <CornerDownRight size={12} />
                  {t("post_detail.reply_to")} <strong>{replyTo.author}</strong>
                  <button
                    type="button"
                    onClick={() => { setReplyTo(null); setCommentKey((k) => k + 1); }}
                    className="ml-auto hover:opacity-70 transition-opacity"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center font-bold text-[var(--color-primary)] text-xs flex-shrink-0 select-none mt-1">
                  {initials(user.display_name || user.username)}
                </div>
                <div className="flex-1">
                  <RichTextEditor
                    key={commentKey}
                    content={commentText}
                    onChange={setCommentText}
                    placeholder={replyTo ? t("post_detail.reply_placeholder", { name: replyTo.author }) : t("post_detail.comment_placeholder")}
                    minHeight={90}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      id="submit-comment"
                      type="submit"
                      disabled={isSubmitting || !commentText || commentText.replace(/<[^>]*>/g, "").trim() === ""}
                      className="btn-primary py-2 px-4 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <><Loader2 size={14} className="animate-spin" /> {t("post_detail.posting_btn")}</>
                      ) : (
                        <><Send size={14} /> {t("post_detail.post_btn")}</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3 px-5 py-4 mb-7 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-color)]/60">
              <Users size={16} />
              <button onClick={() => navigate("/login")} className="text-[var(--color-primary)] underline font-medium">
                {t("post_detail.login_to_comment")}
              </button>
              {t("post_detail.login_to_comment_suffix")}
            </div>
          )}

          {/* Comment list */}
          {isLoadingComments ? (
            <div className="flex items-center justify-center py-12 gap-3 text-[var(--text-color)]/40">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">{t("common.loading")}</span>
            </div>
          ) : topLevel.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--text-color)]/40">
              <MessageSquare size={36} strokeWidth={1.5} />
              <p className="text-sm">{t("post_detail.no_comments")}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {topLevel.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={getReplies(comment.id)}
                  currentUserId={user?.id}
                  onDelete={handleDeleteComment}
                  onReply={(id, author) => {
                    setReplyTo({ id, author });
                    document.getElementById("comment-input")?.focus();
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PostDetail;
