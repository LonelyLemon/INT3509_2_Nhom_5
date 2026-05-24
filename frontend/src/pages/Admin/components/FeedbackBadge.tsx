import { CheckCircle, XCircle } from "lucide-react";
import type { Status, ActionResult } from "../types";
import { useBackendMessage } from "../../../hooks/useBackendMessage";
import { useTranslation } from "react-i18next";

export function FeedbackBadge({ status, result }: { status: Status; result: ActionResult | null }) {
  const translateMsg = useBackendMessage();
  const { t } = useTranslation();

  if (status === "success" && result) {
    const translated = translateMsg(result.message);
    // Show fetched/inserted counts if present
    const countLine =
      result.fetched_count !== undefined && result.inserted_count !== undefined
        ? t("admin.msg_count", { fetched: result.fetched_count, inserted: result.inserted_count })
        : null;

    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle size={15} className="flex-shrink-0" />
          <span>{translated}</span>
        </div>
        {countLine && (
          <span className="text-xs text-emerald-400/60 pl-5">{countLine}</span>
        )}
      </div>
    );
  }

  if (status === "error" && result) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <XCircle size={15} className="flex-shrink-0" />
        <span>{translateMsg(result.message)}</span>
      </div>
    );
  }

  return null;
}
