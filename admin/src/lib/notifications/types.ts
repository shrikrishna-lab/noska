export type NotificationSeverity = "info" | "warning" | "critical" | "success";
export type NotificationStatus = "unread" | "read" | "archived";
export type NotificationSource = "sentry" | "posthog" | "vercel" | "supabase" | "resend" | "clerk" | "system" | "auth" | "billing";
export type NotificationCategory =
  | "error" | "deployment" | "email" | "auth" | "analytics"
  | "infrastructure" | "security" | "system" | "billing" | "feedback";

export interface AppNotification {
  id: string;
  title: string;
  message: string | null;
  description: string | null;
  type: string;
  category: string | null;
  severity: NotificationSeverity;
  source: NotificationSource | null;
  status: NotificationStatus;
  user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface NotificationFilters {
  search?: string;
  status?: NotificationStatus;
  severity?: NotificationSeverity;
  source?: NotificationSource;
  type?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export const SEVERITY_CONFIG: Record<NotificationSeverity, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "text-red-500", bg: "bg-red-500", border: "border-red-500", label: "Critical" },
  warning: { color: "text-amber-500", bg: "bg-amber-500", border: "border-amber-500", label: "Warning" },
  success: { color: "text-green-500", bg: "bg-green-500", border: "border-green-500", label: "Success" },
  info: { color: "text-blue-500", bg: "bg-blue-500", border: "border-blue-500", label: "Info" },
};

export const SOURCE_ICONS: Record<string, string> = {
  sentry: "Bug",
  posthog: "Activity",
  vercel: "Triangle",
  supabase: "Database",
  resend: "Mail",
  clerk: "UserCheck",
  system: "Settings",
  auth: "Shield",
  billing: "CreditCard",
};

export const CATEGORY_LABELS: Record<string, string> = {
  error: "Error",
  deployment: "Deployment",
  email: "Email",
  auth: "Authentication",
  analytics: "Analytics",
  infrastructure: "Infrastructure",
  security: "Security",
  system: "System",
  billing: "Billing",
  feedback: "Feedback",
};
