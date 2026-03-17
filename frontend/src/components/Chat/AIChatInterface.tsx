import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, Bot } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { QuickActions } from "./QuickActions";

export const AIChatInterface = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<any[]>([
    { role: "ai", content: "Hello! I am FinAI. How can I assist you with market analysis today?", format: "text" }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const simulateAIResponse = (query: string) => {
    setIsThinking(true);
    
    setTimeout(() => {
      setIsThinking(false);
      let newMsg: any = { role: "ai", content: `Here is the analysis for: "${query}"`, format: "text" };
      
      if (query.includes("bảng giá") || query.includes("so sánh")) {
        newMsg.format = "table";
        newMsg.data = [
          { Ticker: "VNM", Price: "68,000", Change: "+1.2%" },
          { Ticker: "SSI", Price: "32,500", Change: "-0.5%" },
          { Ticker: "FPT", Price: "115,000", Change: "+2.1%" },
        ];
      } else if (query.includes("biểu đồ") || query.includes("xu hướng")) {
        newMsg.format = "chart";
        newMsg.data = [
          { name: "Mon", value: 65000 },
          { name: "Tue", value: 66200 },
          { name: "Wed", value: 65800 },
          { name: "Thu", value: 67000 },
          { name: "Fri", value: 68000 },
        ];
      }
      
      setMessages(prev => [...prev, newMsg]);
    }, 2000); // Simulate 2 second API delay
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: "user", content: input, format: "text" }]);
    simulateAIResponse(input);
    setInput("");
  };

  const handleQuickAction = (action: string) => {
    setMessages(prev => [...prev, { role: "user", content: action, format: "text" }]);
    simulateAIResponse(action);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-color)] border-r border-[var(--border-color)]">
      
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-3">
        <div className="bg-[var(--color-primary)]/10 p-2 rounded-lg">
          <Bot className="text-[var(--color-primary)]" size={24}/>
        </div>
        <div>
          <h2 className="font-semibold text-lg">FinAI Assistant</h2>
          <p className="text-xs text-[var(--text-color)]/50">Always ready to analyze</p>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} format={msg.format} data={msg.data} />
        ))}
        
        {isThinking && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-color)]/50 italic mb-4">
            <Bot size={16} className="animate-pulse text-[var(--color-primary)]" />
            {t("chat.thinking", "FinAI is analyzing data...")}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[var(--card-bg)] border-t border-[var(--border-color)]">
        <QuickActions onSelect={handleQuickAction} />
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isThinking}
            placeholder={t("chat.placeholder", "Ask AI about market analysis...")} 
            className="input-field flex-1 disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={isThinking || !input.trim()}
            className="btn-primary px-4 flex items-center justify-center disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

    </div>
  );
};
