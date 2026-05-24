import { useTranslation } from "react-i18next";

interface QuickActionsProps {
  onSelect: (action: string) => void;
}

export const QuickActions = ({ onSelect }: QuickActionsProps) => {
  const { t } = useTranslation();

  const ACTIONS = [
    { key: "chat.quick_analyze_vnm", text: t("chat.quick_analyze_vnm") },
    { key: "chat.quick_todays_news", text: t("chat.quick_todays_news") },
    { key: "chat.quick_market_trend", text: t("chat.quick_market_trend") },
    { key: "chat.quick_compare_ssi", text: t("chat.quick_compare_ssi") },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {ACTIONS.map((action) => (
        <button
          key={action.key}
          onClick={() => onSelect(action.text)}
          className="text-xs px-2.5 py-1 rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer whitespace-nowrap"
        >
          {action.text}
        </button>
      ))}
    </div>
  );
};
