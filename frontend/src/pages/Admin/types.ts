export type Status = "idle" | "loading" | "success" | "error";

export interface ActionResult {
  message: string;
  status?: string;
  fetched_count?: number;
  inserted_count?: number;
}

export interface Ticker {
  id: string;
  ticker: string;
  name: string | null;
  asset_type: string;
  is_active: boolean;
}

export interface RecentFeedbackItem {
  id: string;
  title: string;
  rating: "like" | "dislike" | null;
  feedback_text: string | null;
  rated_at: string | null;
  created_at: string;
}

export interface AIStats {
  total_conversations: number;
  like_count: number;
  dislike_count: number;
  unrated_count: number;
  like_rate_pct: number;
  dislike_rate_pct: number;
  recent_feedback: RecentFeedbackItem[];
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  is_verified: boolean;
  is_banned: boolean;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const ASSET_TYPES = ["STOCK", "CRYPTO", "ETF", "INDEX", "FOREX"] as const;
