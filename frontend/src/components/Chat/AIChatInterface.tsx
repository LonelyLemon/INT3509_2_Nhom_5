import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Send, Bot, SquarePen, AlertCircle, Wrench,
  History, Trash2, Check, X, ChevronLeft,
} from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { QuickActions } from "./QuickActions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Msg {
  role: "user" | "ai";
  content: string;
  format: "text";
  streaming?: boolean;
  toolsUsed?: string[];
  error?: boolean;
}

interface ConvSummary {
  id: string;
  title: string;
  updated_at: string;
}

interface ConvDetail extends ConvSummary {
  messages: { id: string; role: string; content: string; created_at: string }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function getToken() {
  return localStorage.getItem("access_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

const WELCOME: Msg = {
  role: "ai",
  content: "Hello! I'm **FinAI**, your market analysis assistant. Ask me about stocks, trends, portfolio analysis, or any financial question.",
  format: "text",
};

// ── Component ─────────────────────────────────────────────────────────────────

export const AIChatInterface = ({ hideHeader = false }: { hideHeader?: boolean }) => {
  const { t } = useTranslation();

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeTools, setActiveTools] = useState<string[]>([]);

  // History panel state
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  // ── Conversation list ──────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    setConvLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/conversations`, {
        headers: authHeaders(),
      });
      if (res.ok) setConversations(await res.json());
    } finally {
      setConvLoading(false);
    }
  }, []);

  const openHistory = () => {
    setShowHistory(true);
    loadConversations();
  };

  // ── Load a conversation ────────────────────────────────────────────────────

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/ai/conversations/${id}`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const conv: ConvDetail = await res.json();
      setConversationId(conv.id);
      const msgs: Msg[] = conv.messages.map((m) => ({
        role: m.role === "user" ? "user" : "ai",
        content: m.content,
        format: "text",
      }));
      setMessages(msgs.length ? msgs : [WELCOME]);
      setShowHistory(false);
    } catch { /* ignore */ }
  };

  // ── Rename ─────────────────────────────────────────────────────────────────

  const startEdit = (conv: ConvSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const commitRename = async (id: string) => {
    const title = editTitle.trim();
    if (!title) { setEditingId(null); return; }
    try {
      const res = await fetch(`${API_BASE}/ai/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
      }
    } finally {
      setEditingId(null);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/ai/conversations/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) startNewConversation();
    } catch { /* ignore */ }
  };

  // ── New conversation ───────────────────────────────────────────────────────

  const startNewConversation = () => {
    if (isStreaming) abortRef.current?.abort();
    setConversationId(null);
    setMessages([WELCOME]);
    setInput("");
    setActiveTools([]);
    setIsStreaming(false);
    setShowHistory(false);
  };

  // ── Send / stream ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const token = getToken();
    if (!token) {
      setMessages(prev => [...prev, { role: "ai", format: "text", error: true, content: "You must be logged in to use FinAI." }]);
      return;
    }

    setMessages(prev => [
      ...prev,
      { role: "user", content: text, format: "text" },
      { role: "ai", content: "", format: "text", streaming: true },
    ]);
    setIsStreaming(true);
    setActiveTools([]);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, conversation_id: conversationId ?? undefined }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let event = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) { event = line.slice(7).trim(); continue; }
          if (!line.startsWith("data: ")) continue;
          const rawData = line.slice(6).trim();
          if (!rawData) continue;
          try {
            const data = JSON.parse(rawData);
            if (event === "token") {
              setMessages(prev => {
                const u = [...prev];
                const last = u[u.length - 1];
                if (last?.streaming) u[u.length - 1] = { ...last, content: last.content + data.text };
                return u;
              });
            } else if (event === "tool") {
              setActiveTools(prev => [...new Set([...prev, String(data.name)])]);
            } else if (event === "done") {
              if (data.conversation_id) setConversationId(data.conversation_id);
              const used: string[] = data.tools_used ?? [];
              setMessages(prev => {
                const u = [...prev];
                const last = u[u.length - 1];
                if (last?.streaming) u[u.length - 1] = { ...last, streaming: false, toolsUsed: used };
                return u;
              });
              setActiveTools([]);
            } else if (event === "error") {
              setMessages(prev => {
                const u = [...prev];
                const last = u[u.length - 1];
                if (last?.streaming) u[u.length - 1] = { ...last, streaming: false, error: true, content: data.detail ?? "An error occurred." };
                return u;
              });
            }
          } catch { /* skip malformed */ }
          event = "";
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages(prev => {
        const u = [...prev];
        const last = u[u.length - 1];
        if (last?.streaming) u[u.length - 1] = { ...last, streaming: false, error: true, content: "Failed to reach the AI service." };
        return u;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, conversationId]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage(input);
    setInput("");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[var(--bg-color)] border-r border-[var(--border-color)] relative overflow-hidden">

      {/* ── Static header (standalone mode) ── */}
      {!hideHeader && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="bg-[var(--color-primary)]/10 p-2 rounded-lg">
            <Bot className="text-[var(--color-primary)]" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">FinAI Assistant</p>
            {conversationId && (
              <p className="text-xs text-[var(--text-color)]/40 truncate">
                {conversations.find(c => c.id === conversationId)?.title ?? "Conversation"}
              </p>
            )}
          </div>
          <button onClick={openHistory} title="Conversation history" className="p-1.5 rounded-lg hover:bg-[var(--border-color)]/40 transition-colors">
            <History size={15} className="text-[var(--text-color)]/50" />
          </button>
          <button onClick={startNewConversation} title="New conversation" className="p-1.5 rounded-lg hover:bg-[var(--border-color)]/40 transition-colors">
            <SquarePen size={15} className="text-[var(--text-color)]/50" />
          </button>
        </div>
      )}

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
        {messages.map((msg, i) => (
          <div key={i}>
            {/* Error messages are shown as a simple red notice */}
            {msg.error ? (
              <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-500/8 rounded-lg px-3 py-2 mb-2">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                {msg.content}
              </div>
            ) : (
              <ChatMessage role={msg.role} content={msg.content} format={msg.format} />
            )}
            {/* Streaming cursor */}
            {msg.streaming && (
              <span className="inline-block w-1.5 h-4 bg-[var(--color-primary)] rounded-sm animate-pulse ml-1 mb-2" />
            )}
            {/* Tools used badges */}
            {/* {!msg.streaming && msg.toolsUsed && msg.toolsUsed.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1 ml-1">
                {msg.toolsUsed.map(tool => (
                  <span key={tool} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                    <Wrench size={9} /> {tool}
                  </span>
                ))}
              </div>
            )} */}
          </div>
        ))}

        {/* Active tool indicator */}
        {activeTools.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-color)]/50 italic my-1">
            <Wrench size={11} className="animate-spin text-[var(--color-primary)]" />
            Using: {activeTools.join(", ")}…
          </div>
        )}

        {/* Thinking indicator */}
        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-color)]/50 italic">
            <Bot size={13} className="animate-pulse text-[var(--color-primary)]" />
            {t("chat.thinking", "FinAI is analyzing…")}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="px-3 pt-2 pb-3 bg-[var(--card-bg)] border-t border-[var(--border-color)] flex-shrink-0">
        {/* Popup-mode controls */}
        {hideHeader && (
          <div className="flex gap-2 mb-1.5">
            <button onClick={openHistory} className="flex items-center gap-1 text-[11px] text-[var(--text-color)]/40 hover:text-[var(--color-primary)] transition-colors">
              <History size={11} /> History
            </button>
            <button onClick={startNewConversation} className="flex items-center gap-1 text-[11px] text-[var(--text-color)]/40 hover:text-[var(--color-primary)] transition-colors">
              <SquarePen size={11} /> New chat
            </button>
          </div>
        )}

        <QuickActions onSelect={(a) => { sendMessage(a); }} />

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            placeholder={t("chat.placeholder", "Ask AI about market analysis...")}
            className="input-field flex-1 disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="btn-primary px-3 flex items-center justify-center disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* ── History panel overlay ── */}
      {showHistory && (
        <div
          className="absolute inset-0 flex flex-col bg-[var(--bg-color)] z-20"
          style={{ animation: "slideInLeft 0.18s ease both" }}
        >
          {/* Panel header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] flex-shrink-0">
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 rounded-lg hover:bg-[var(--border-color)]/40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-sm flex-1">Conversations</span>
            <button
              onClick={startNewConversation}
              title="New conversation"
              className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:opacity-70 transition-opacity"
            >
              <SquarePen size={13} /> New
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="flex flex-col gap-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-[var(--border-color)]/20 animate-pulse" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-[var(--text-color)]/40">
                No conversations yet. Start a new chat!
              </div>
            ) : (
              <ul className="p-2 space-y-1">
                {conversations.map(conv => (
                  <li
                    key={conv.id}
                    onClick={() => editingId !== conv.id && loadConversation(conv.id)}
                    className={[
                      "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-colors",
                      conversationId === conv.id
                        ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : "hover:bg-[var(--border-color)]/30",
                    ].join(" ")}
                  >
                    {/* Title or edit input */}
                    {editingId === conv.id ? (
                      <input
                        ref={editInputRef}
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
                      <span className="flex-1 text-sm truncate">{conv.title}</span>
                    )}

                    {/* Time */}
                    {editingId !== conv.id && (
                      <span className="text-[10px] text-[var(--text-color)]/40 flex-shrink-0 group-hover:hidden">
                        {relTime(conv.updated_at)}
                      </span>
                    )}

                    {/* Actions */}
                    <div className={[
                      "flex-shrink-0 flex items-center gap-1",
                      editingId === conv.id ? "flex" : "hidden group-hover:flex",
                    ].join(" ")}>
                      {editingId === conv.id ? (
                        <>
                          <button onClick={e => { e.stopPropagation(); commitRename(conv.id); }} className="p-1 rounded hover:text-emerald-400 transition-colors">
                            <Check size={12} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setEditingId(null); }} className="p-1 rounded hover:text-rose-400 transition-colors">
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={e => startEdit(conv, e)} className="p-1 rounded hover:text-[var(--color-primary)] transition-colors" title="Rename">
                            <SquarePen size={12} />
                          </button>
                          <button onClick={e => deleteConversation(conv.id, e)} className="p-1 rounded hover:text-rose-400 transition-colors" title="Delete">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
