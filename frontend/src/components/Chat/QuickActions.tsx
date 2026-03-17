import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";

interface QuickActionsProps {
  onSelect: (action: string) => void;
}

export const QuickActions = ({ onSelect }: QuickActionsProps) => {
  const { t } = useTranslation();

  const actions = [
    "Phân tích mã VNM",
    "Tóm tắt tin tức hôm nay",
    "Xu hướng thị trường tuần này",
    "So sánh SSI và HCM",
  ];

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase text-[var(--color-primary)]">
        <Zap size={14} />
        {t("chat.quick_actions", "Thao tác nhanh")}
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => onSelect(action)}
            className="text-sm px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
};
