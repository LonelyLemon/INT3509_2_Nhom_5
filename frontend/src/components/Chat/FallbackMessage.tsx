import { AlertCircle, RefreshCw } from "lucide-react";

interface FallbackMessageProps {
  onRetry: () => void;
}

export const FallbackMessage = ({ onRetry }: FallbackMessageProps) => {
  return (
    <div className="flex w-full mb-6 justify-start">
      <div className="max-w-[85%] rounded-2xl p-4 bg-red-500/10 border border-red-500/30 text-[var(--text-color)]">
        <div className="flex items-center gap-2 text-red-500 font-semibold mb-2">
          <AlertCircle size={18} />
          <span>API Connection Error</span>
        </div>
        <div className="text-sm opacity-90 leading-relaxed mb-4">
          FinAI backend is currently unreachable. While we restore the connection, you can browse cached market data, latest downloaded news, or review your portfolio.
        </div>
        <button 
          onClick={onRetry}
          className="flex items-center gap-2 text-sm font-semibold bg-red-500/20 text-red-500 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          <RefreshCw size={14} /> Retry Connection
        </button>
      </div>
    </div>
  );
};
