/**
 * AIChatPopup — floating chat bubble anchored to the bottom-right corner.
 * Renders on every page via DashboardLayout; state lives here so
 * conversations persist across route changes.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Minus, Maximize2 } from "lucide-react";
import { AIChatInterface } from "./AIChatInterface";

export const AIChatPopup = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimised, setIsMinimised] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const firstOpen = useRef(true);

  // When the popup is opened, clear the unread dot
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      firstOpen.current = false;
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimised(false);
  };

  const handleMinimise = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimised(true);
    setIsOpen(false);
  };


  return (
    <>
      {/* ── Floating chat panel — always mounted to preserve AIChatInterface state ── */}
      <div
        id="ai-chat-popup"
        className="fixed bottom-20 right-5 z-50 flex flex-col"
        style={{
          width: 380,
          height: 540,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px var(--border-color)",
          // Hide visually but keep mounted (preserves React state)
          display: isOpen ? "flex" : "none",
          animation: isOpen ? "chatPopIn 0.22s cubic-bezier(.34,1.56,.64,1) both" : "none",
        }}
      >
        {/* Custom header with controls */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--card-bg)] flex-shrink-0"
          style={{ background: "var(--card-bg)" }}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary)]/15">
            <Bot size={17} className="text-[var(--color-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">FinAI Assistant</p>
            <p className="text-xs text-[var(--text-color)]/40">Always ready to analyze</p>
          </div>
          <button
            onClick={() => { setIsOpen(false); navigate("/ai"); }}
            className="p-1.5 rounded-lg hover:bg-[var(--border-color)]/40 transition-colors"
            title="Mở trang đầy đủ"
          >
            <Maximize2 size={13} className="opacity-60" />
          </button>
          <button
            id="ai-chat-minimise"
            onClick={handleMinimise}
            className="p-1.5 rounded-lg hover:bg-[var(--border-color)]/40 transition-colors"
            title="Minimise"
          >
            <Minus size={14} />
          </button>
        </div>

        {/* Chat body — strip the redundant header from AIChatInterface */}
        <div className="flex-1 overflow-hidden [&>div]:h-full [&>div]:border-0">
          <AIChatInterface hideHeader />
        </div>
      </div>

      {/* ── FAB trigger button ── */}
      <button
        id="ai-chat-fab"
        onClick={handleOpen}
        title="Open FinAI Assistant"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
        style={{
          background: "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #000))",
          boxShadow: "0 8px 32px color-mix(in srgb, var(--color-primary) 45%, transparent)",
        }}
      >
        <Bot size={26} className="text-white" />
        {/* Unread dot */}
        {hasUnread && !isOpen && (
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-[var(--bg-color)]" />
        )}
        {/* Minimised indicator */}
        {isMinimised && !isOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-primary)] border-2 border-[var(--bg-color)] animate-pulse" />
        )}
      </button>

      {/* ── Keyframe animation ── */}
      <style>{`
        @keyframes chatPopIn {
          from { opacity: 0; transform: scale(0.85) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </>
  );
};
