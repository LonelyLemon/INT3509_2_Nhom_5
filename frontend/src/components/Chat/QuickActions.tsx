import { useTranslation } from "react-i18next";

interface QuickActionsProps {
  onSelect: (action: string) => void;
}

const ACTIONS = [
  "Analyze VNM",
  "Today's news",
  "Market trend",
  "Compare SSI & HCM",
];

export const QuickActions = ({ onSelect }: QuickActionsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {ACTIONS.map((action) => (
        <button
          key={action}
          onClick={() => onSelect(action)}
          className="text-xs px-2.5 py-1 rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer whitespace-nowrap"
          title={t(`chat.quick.${action}`, action)}
        >
          {action}
        </button>
      ))}
    </div>
  );
};
