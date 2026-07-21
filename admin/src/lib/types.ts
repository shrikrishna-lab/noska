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

export interface DeletedAccount {
  id: string;
  original_id: string;
  account_type: "user" | "admin";
  name: string | null;
  email: string | null;
  role: string | null;
  metadata: Record<string, unknown> | null;
  deleted_by_admin_id: string | null;
  deleted_by_name: string | null;
  deleted_at: string;
  restored_at: string | null;
  restored_by_admin_id: string | null;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject?: string;
  html_content?: string;
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

export interface ChangelogEntry {
  id: string;
  title: string;
  description: string | null;
  tag: string;
  version: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  author: string;
  cover_image: string | null;
  tags: string[];
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegalPage {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  published: boolean;
  updated_at: string;
}

// ── Launch Control Types ──
export type LaunchMode = "waitlist" | "early_beta" | "closed_beta" | "open_beta" | "public" | "maintenance";

export interface LaunchSettings {
  id: string;
  launch_mode: LaunchMode;
  login_mode: "login" | "launch" | "waitlist" | "custom";
  custom_login_url: string | null;
  launch_date: string | null;
  countdown_enabled: boolean;
  auto_switch_mode: LaunchMode | null;
  auto_switch_at: string | null;
  maintenance_title: string;
  maintenance_message: string;
  registration_enabled: boolean;
  show_pricing: boolean;
  show_blog: boolean;
  show_docs: boolean;
  show_changelog: boolean;
  show_login: boolean;
  show_signup: boolean;
  show_waitlist: boolean;
  show_discord: boolean;
  show_community: boolean;
  page_visibility: Record<string, boolean>;
  route_protection: Record<string, unknown>;
  updated_at: string | null;
  updated_by: string | null;
  published: boolean;
}

export interface LandingContent {
  id: string;
  section: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  cta_text: string | null;
  cta_link: string | null;
  secondary_cta_text: string | null;
  secondary_cta_link: string | null;
  image_url: string | null;
  icon: string | null;
  badge: string | null;
  sort_order: number;
  content: Record<string, unknown>;
  active: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export interface CTAButton {
  id: string;
  button_id: string;
  button_text: string;
  destination: string;
  variant: "primary" | "secondary" | "ghost" | "outline" | "link" | "danger";
  color: string;
  icon: string | null;
  open_in_new_tab: boolean;
  visible: boolean;
  enabled: boolean;
  animation: string;
  priority: number;
  confirmation_text: string | null;
  requires_auth: boolean;
  launch_mode_override: Record<string, string>;
  ab_variants: Array<{ text: string; destination: string; weight: number }>;
  ab_enabled: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface AnnouncementBar {
  id: string;
  enabled: boolean;
  text: string;
  link_url: string | null;
  link_text: string | null;
  background_color: string;
  text_color: string;
  emoji: string;
  countdown_enabled: boolean;
  countdown_target: string | null;
  dismissible: boolean;
  sticky: boolean;
  animation: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface WaitlistSettings {
  id: string;
  enabled: boolean;
  collect_name: boolean;
  collect_company: boolean;
  collect_role: boolean;
  collect_country: boolean;
  collect_referral_code: boolean;
  collect_phone: boolean;
  email_verification: boolean;
  double_opt_in: boolean;
  auto_approve: boolean;
  max_waitlist: number;
  confirmation_title: string;
  confirmation_message: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  label: string | null;
  icon: string | null;
  sort_order: number;
  active: boolean;
}

export interface SEOSettings {
  id: string;
  page_path: string;
  title: string | null;
  description: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  twitter_card: string;
  twitter_site: string | null;
  keywords: string;
  robots: string;
  canonical_url: string | null;
  schema_markup: Record<string, unknown> | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface LaunchAuditLog {
  id: string;
  admin_id: string | null;
  admin_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  field: string | null;
  old_value: unknown;
  new_value: unknown;
  details: string | null;
  created_at: string;
}

export interface WaitlistStats {
  total: number;
  today: number;
  waiting: number;
  invited: number;
  accepted: number;
  rejected: number;
  countries: Record<string, number>;
  top_referrers: Array<{ name: string; count: number }>;
}

export interface BroadcastCampaign {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "announcement" | "alert";
  target_type: "all" | "random" | "selected" | "per_user";
  target_count: number | null;
  target_users: string[] | null;
  send_immediately: boolean;
  scheduled_at: string | null;
  schedule_start: string | null;
  schedule_end: string | null;
  random_delay_minutes: boolean;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  sent_count: number;
  total_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
