import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const label = confirmLabel ?? t("confirm_dialog.confirm");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card max-w-sm w-full mx-4 p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg flex-shrink-0",
            danger ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
          )}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-base">{title}</h3>
            <p className="text-sm opacity-60 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--border-color)] hover:bg-[var(--border-color)]/30 transition-colors cursor-pointer"
          >
            {t("confirm_dialog.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer",
              danger
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-[var(--color-primary)] hover:opacity-90 text-white"
            )}
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}
