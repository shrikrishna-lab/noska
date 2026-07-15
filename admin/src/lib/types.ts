export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "paused";
export type WaitlistStatus = "waiting" | "invited" | "accepted" | "active" | "rejected";
export type WorkspaceStatus = "active" | "suspended" | "archived";
export type IntegrationStatus = "connected" | "disconnected" | "error";
export type TicketStatus = "open" | "in_progress" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type FeedbackStatus = "new" | "in_review" | "planned" | "shipped" | "archived";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent";
export type BanType = "soft" | "hard";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  plan: SubscriptionTier;
  workspace: string;
  avatarUrl?: string | null;
  status: "active" | "invited" | "suspended";
  lastLogin: string;
  createdAt: string;
  country: string;
  aiRequestsMonth: number;
}

export interface Workspace {
  id: string;
  name: string;
  owner: string;
  ownerEmail: string;
  members: number;
  storageUsedGb: number;
  storageQuotaGb: number;
  documents: number;
  aiRequestsMonth: number;
  plan: SubscriptionTier;
  status: WorkspaceStatus;
  createdAt: string;
  country: string;
}

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  provider: string;
  country: string;
  joinedAt: string;
  referralCount: number;
  status: WaitlistStatus;
  position: number;
  inviteSent: boolean;
  accepted: boolean;
}

export interface AuditLog {
  id: string;
  admin: string;
  action: string;
  target: string;
  ip: string;
  device: string;
  location: string;
  severity: "info" | "warning" | "critical";
  at: string;
}

export interface Subscription {
  id: string;
  customer: string;
  email: string;
  plan: SubscriptionTier;
  status: SubscriptionStatus;
  mrr: number;
  startedAt: string;
  renewsAt: string;
  paymentMethod: "card" | "invoice" | "trial";
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  customer: string;
  status: "succeeded" | "refunded" | "failed" | "pending";
  method: "card" | "invoice" | "bank";
  at: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercent: number;
  updatedAt: string;
  category: "growth" | "platform" | "experimental" | "ops";
}

export interface AIModelUsage {
  model: string;
  provider: string;
  requestsToday: number;
  requestsMonth: number;
  avgLatencyMs: number;
  avgTokens: number;
  costMonth: number;
  errorRate: number;
  contextWindow: number;
}

export interface AiUsageByDay {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface FeedbackItem {
  id: string;
  user_name: string;
  email: string;
  rating: number;
  category: "ui" | "performance" | "feature" | "bug" | "praise";
  message: string;
  status: FeedbackStatus;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  user_name: string;
  email: string;
  category: "billing" | "technical" | "account" | "feature" | "other";
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  replies: number;
  last_update: string;
  description?: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: "admin" | "user";
  sender_id: string | null;
  sender_name: string;
  message: string;
  attachments: unknown[];
  created_at: string;
}

export interface BannedUser {
  id: string;
  user_id: string;
  email: string;
  user_name: string | null;
  reason: string;
  ban_type: BanType;
  banned_by: string | null;
  expires_at: string | null;
  lifted_at: string | null;
  created_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  recipients: number;
  sent: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  scheduled_for: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "backlog" | "in_progress" | "review" | "shipped";
  priority: "low" | "medium" | "high" | "critical";
  progress: number;
  eta: string;
  owner: string;
  dependencies: number;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: "auth" | "billing" | "analytics" | "monitoring" | "deployment" | "ai";
  status: IntegrationStatus;
  last_sync_at: string | null;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  scopes: string[];
  usage_this_month: number;
}

export interface NotificationItem {
  id: string;
  type: "invitation" | "error" | "deployment" | "billing" | "feedback" | "security";
  title: string;
  detail: string;
  created_at: string;
  unread: boolean;
  severity: "info" | "warning" | "critical";
}

export interface SystemComponent {
  id: string;
  name: string;
  status: "operational" | "degraded" | "outage";
  value: number;
  unit: string;
  description: string;
}

export interface TrendPoint {
  date: string;
  value: number;
}
