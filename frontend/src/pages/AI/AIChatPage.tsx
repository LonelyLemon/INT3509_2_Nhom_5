import React, { useState, useCallback, useEffect } from "react";
import { SquarePen, Trash2, Check, X, Search, Bot } from "lucide-react";
import { AIChatInterface } from "../../components/Chat/AIChatInterface";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

interface ConvSummary {
  id: string;
  title: string;
  updated_at: string;
}

interface SidebarProps {
  conversations: ConvSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  loading: boolean;
}

const ConversationSidebar = ({
  conversations, activeId, onSelect, onNew, onDelete, onRename, loading,
}: SidebarProps) => {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (conv: ConvSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const commitRename = (id: string) => {
    const t = editTitle.trim();
    if (t) onRename(id, t);
    setEditingId(null);
  };

  return (
    <aside className="w-72 flex-shrink-0 border-r border-[var(--border-color)] flex flex-col h-full bg-[var(--card-bg)]/30">
      {/* Sidebar header */}
      <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Bot size={16} className="text-[var(--color-primary)]" />
          <span className="font-semibold text-sm">FinAI Chat</span>
        </div>
        <button
          onClick={onNew}
          title="Cuộc hội thoại mới"
          className="p-1.5 rounded-lg hover:bg-[var(--border-color)]/40 transition-colors"
        >
          <SquarePen size={14} className="opacity-60" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[var(--border-color)]/50">
        <div className="flex items-center gap-2 bg-[var(--border-color)]/20 rounded-lg px-3 py-1.5">
          <Search size={12} className="opacity-40" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm…"
            className="bg-transparent text-xs outline-none flex-1 placeholder:opacity-40"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <div className="flex flex-col gap-1.5 px-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-[var(--border-color)]/20 animate-pulse" />
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-[var(--text-color)]/40">
            {conversations.length === 0 ? "Chưa có cuộc hội thoại nào.\nHãy bắt đầu chat!" : "Không tìm thấy kết quả."}
          </div>
        )}
        <ul className="px-2 space-y-0.5">
          {filtered.map(conv => (
            <li
              key={conv.id}
              onClick={() => editingId !== conv.id && onSelect(conv.id)}
              className={[
                "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
                activeId === conv.id
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "hover:bg-[var(--border-color)]/30",
              ].join(" ")}
            >
              {editingId === conv.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitRename(conv.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 text-sm bg-transparent border-b border-[var(--color-primary)] outline-none"
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium">{conv.title}</p>
                  <p className="text-[10px] opacity-40">{relTime(conv.updated_at)}</p>
                </div>
              )}

              <div className={["flex items-center gap-0.5 flex-shrink-0",
                editingId === conv.id ? "flex" : "hidden group-hover:flex"].join(" ")}
              >
                {editingId === conv.id ? (
                  <>
                    <button onClick={e => { e.stopPropagation(); commitRename(conv.id); }} className="p-1 rounded hover:text-emerald-400">
                      <Check size={11} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setEditingId(null); }} className="p-1 rounded hover:text-rose-400">
                      <X size={11} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={e => startEdit(conv, e)} className="p-1 rounded hover:text-[var(--color-primary)]" title="Đổi tên">
                      <SquarePen size={11} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
                      className="p-1 rounded hover:text-rose-400" title="Xóa"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const AIChatPage = () => {
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatKey, setChatKey] = useState(0); // force remount AIChatInterface on new chat

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/conversations`, { headers: authHeaders() });
      if (res.ok) setConversations(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const handleNew = () => {
    setActiveConvId(null);
    setChatKey(k => k + 1);
  };

  const handleSelect = (id: string) => {
    setActiveConvId(id);
    setChatKey(k => k + 1);
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE}/ai/conversations/${id}`, { method: "DELETE", headers: authHeaders() });
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) handleNew();
  };

  const handleRename = async (id: string, title: string) => {
    const res = await fetch(`${API_BASE}/ai/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-color)]">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        onRename={handleRename}
        loading={loading}
      />

      {/* Main chat area */}
      <div className="flex-1 min-w-0 h-full">
        <AIChatInterface
          key={chatKey}
          hideHeader={false}
          initialConversationId={activeConvId}
          onConversationCreated={(id, title) => {
            setActiveConvId(id);
            setConversations(prev => [{ id, title, updated_at: new Date().toISOString() }, ...prev]);
          }}
        />
      </div>
    </div>
  );
};
