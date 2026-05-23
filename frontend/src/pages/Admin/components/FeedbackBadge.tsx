import { CheckCircle, XCircle } from "lucide-react";
import type { Status, ActionResult } from "../types";

export function FeedbackBadge({ status, result }: { status: Status; result: ActionResult | null }) {
  if (status === "success" && result) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle size={15} />
        <span>{result.message}</span>
      </div>
    );
  }
  if (status === "error" && result) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <XCircle size={15} />
        <span>{result.message}</span>
      </div>
    );
  }
  return null;
}
