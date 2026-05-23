import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Props {
  conversationId: string;
}

export const ConversationFeedback = ({ conversationId }: Props) => {
  const [selected, setSelected] = useState<"like" | "dislike" | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showTextbox, setShowTextbox] = useState(false);

  const submit = async (rating: "like" | "dislike") => {
    setSelected(rating);
    if (rating === "dislike") {
      setShowTextbox(true);
      return;
    }
    await sendFeedback(rating, "");
  };

  const sendFeedback = async (rating: "like" | "dislike", text: string) => {
    try {
      await fetch(`${API_BASE}/ai/conversations/${conversationId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ rating, feedback_text: text || null }),
      });
    } finally {
      setSubmitted(true);
      setShowTextbox(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-500 mt-2 ml-1">
        <Check size={12} />
        Cảm ơn phản hồi của bạn!
      </div>
    );
  }

  return (
    <div className="mt-2 ml-1">
      {!showTextbox ? (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-color)]/40">Phản hồi hữu ích không?</span>
          <button
            onClick={() => submit("like")}
            className="p-1 rounded hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors text-[var(--text-color)]/40"
            title="Hữu ích"
          >
            <ThumbsUp size={13} />
          </button>
          <button
            onClick={() => submit("dislike")}
            className="p-1 rounded hover:bg-rose-500/10 hover:text-rose-400 transition-colors text-[var(--text-color)]/40"
            title="Không hữu ích"
          >
            <ThumbsDown size={13} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-w-xs">
          <span className="text-[11px] text-[var(--text-color)]/50">
            Góp ý thêm (tùy chọn):
          </span>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Chia sẻ vấn đề bạn gặp phải..."
            rows={2}
            className="text-xs bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 outline-none resize-none focus:border-[var(--color-primary)]/40"
          />
          <div className="flex gap-2">
            <button
              onClick={() => sendFeedback("dislike", feedbackText)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
            >
              Gửi
            </button>
            <button
              onClick={() => { setShowTextbox(false); setSelected(null); }}
              className="text-[11px] px-2.5 py-1 rounded-lg hover:bg-[var(--border-color)]/30 transition-colors text-[var(--text-color)]/50"
            >
              Bỏ qua
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
