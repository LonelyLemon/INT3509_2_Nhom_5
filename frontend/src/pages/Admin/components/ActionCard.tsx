import { RefreshCw, Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTranslation } from "react-i18next";
import { FeedbackBadge } from "./FeedbackBadge";
import type { Status, ActionResult } from "../types";

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: Status;
  result: ActionResult | null;
  onTrigger: () => void;
  extra?: React.ReactNode;
}

export function ActionCard({ icon, title, description, status, result, onTrigger, extra }: Props) {
  const { t } = useTranslation();
  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-sm opacity-60 mt-0.5">{description}</p>
        </div>
      </div>

      {extra}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onTrigger}
          disabled={status === "loading"}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
            "bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {status === "loading" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RefreshCw size={15} />
          )}
          {status === "loading" ? t("admin.dispatching") : t("admin.trigger_now")}
        </button>
        <FeedbackBadge status={status} result={result} />
      </div>
    </div>
  );
}
