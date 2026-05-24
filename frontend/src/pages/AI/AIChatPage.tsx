import { useState, useCallback, useEffect } from "react";
import { AIChatInterface } from "../../components/Chat/AIChatInterface";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const LAST_CONV_KEY = "finai_last_conv_id";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ConvSummary {
  id: string;
  title: string;
  updated_at: string;
}

export const AIChatPage = () => {
  const [activeConvId, setActiveConvIdState] = useState<string | null>(
    () => sessionStorage.getItem(LAST_CONV_KEY)
  );
  const [chatKey, setChatKey] = useState(0);

  // Keep sessionStorage in sync
  const setActiveConvId = (id: string | null) => {
    setActiveConvIdState(id);
    if (id) sessionStorage.setItem(LAST_CONV_KEY, id);
    else sessionStorage.removeItem(LAST_CONV_KEY);
  };

  return (
    <div className="h-full bg-[var(--bg-color)]">
      <AIChatInterface
        key={chatKey}
        hideHeader={false}
        initialConversationId={activeConvId}
        onConversationCreated={(id) => {
          setActiveConvId(id);
        }}
      />
    </div>
  );
};
