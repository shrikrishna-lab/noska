import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart,
  BarChart3,
  BarChart4,
  Bell,
  BellRing,
  Bot,
  Building2,
  Clock,
  CreditCard,
  FileText,
  Flag,
  Gauge,
  Gift,
  HardDrive,
  History,
  Home,
  Key,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  LifeBuoy,
  Link2,
  ListChecks,
  Mail,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  Palette,
  PanelTop,
  Plug,
  Puzzle,
  Radio,
  Rocket,
  ScrollText,
  Search,
  Send,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
  Workflow,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import type { AdminCapability } from "@/lib/rbac";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  group: "overview" | "content" | "marketing" | "growth" | "people" | "platform" | "operations" | "monitoring" | "settings";
  badge?: string | number;
  capability: AdminCapability;
}

export type NavigationRole = "super_admin" | "admin" | "developer" | "marketing";

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home, group: "overview", capability: "dashboard" },
  { to: "/my-dashboard", label: "My workspace", icon: UserCog, group: "overview", capability: "dashboard" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, group: "overview", capability: "dashboard" },
  { to: "/user-funnel", label: "User Funnel", icon: BarChart4, group: "overview", capability: "dashboard" },
  { to: "/launch-control", label: "Launch Control", icon: Megaphone, group: "marketing", capability: "marketing" },
  { to: "/landing-page", label: "Landing Page", icon: PanelTop, group: "marketing", capability: "marketing" },
  { to: "/cta-buttons", label: "CTA Buttons", icon: MousePointerClick, group: "marketing", capability: "marketing" },
  { to: "/announcement-bar", label: "Announcement Bar", icon: Megaphone, group: "marketing", capability: "marketing" },
  { to: "/announcement-cards", label: "Announcement Cards", icon: BellRing, group: "marketing", capability: "marketing" },
  { to: "/info-cards", label: "Info Cards", icon: Sparkles, group: "marketing", capability: "marketing" },
  { to: "/waitlist-settings", label: "Waitlist Settings", icon: UsersRound, group: "marketing", capability: "marketing" },
  { to: "/seo-settings", label: "SEO", icon: Search, group: "marketing", capability: "marketing" },
  { to: "/social-links", label: "Social Links", icon: Link2, group: "marketing", capability: "marketing" },
  { to: "/pages", label: "Pages", icon: FileText, group: "content", capability: "content" },
  { to: "/files", label: "Files", icon: HardDrive, group: "content", capability: "content" },
  { to: "/templates", label: "Templates", icon: LayoutTemplate, group: "content", capability: "content" },
  { to: "/waitlist", label: "Waitlist", icon: ListChecks, group: "growth", capability: "waitlist" },
  { to: "/demo-requests", label: "Demo Requests", icon: MessageSquare, group: "growth", capability: "waitlist" },
  { to: "/users", label: "Users", icon: Users, group: "people", capability: "users" },
  { to: "/banned-users", label: "Banned Users", icon: Ban, group: "people", capability: "destructive_actions" },
  { to: "/trash", label: "Trash", icon: Trash2, group: "people", capability: "destructive_actions" },
  { to: "/workspaces", label: "Workspaces", icon: Building2, group: "people", capability: "users" },
  { to: "/teams", label: "Teams", icon: UserCog, group: "people", capability: "users" },
  { to: "/referrals", label: "Referrals", icon: Gift, group: "growth", capability: "users" },
  { to: "/subscriptions", label: "Subscriptions", icon: Layers, group: "growth", capability: "users" },
  { to: "/payments", label: "Payments", icon: CreditCard, group: "growth", capability: "users" },
  { to: "/ai-usage", label: "User AI Dashboard", icon: Bot, group: "platform", capability: "users" },
  { to: "/models", label: "Models", icon: Workflow, group: "platform", capability: "users" },
  { to: "/feature-flags", label: "Feature Flags", icon: Flag, group: "platform", capability: "monitoring" },
  { to: "/widgets", label: "Widgets", icon: LayoutGrid, group: "platform", capability: "monitoring" },
  { to: "/user-notifications", label: "User Notifications", icon: Send, group: "platform", capability: "monitoring" },
  { to: "/email-dashboard", label: "Email Dashboard", icon: BarChart3, group: "marketing", capability: "marketing" },
  { to: "/email-templates", label: "Email Templates", icon: LayoutTemplate, group: "marketing", capability: "marketing" },
  { to: "/email-campaigns", label: "Email Campaigns", icon: Send, group: "marketing", capability: "marketing" },
  { to: "/transactional-emails", label: "Transactional Emails", icon: Mail, group: "marketing", capability: "marketing" },
  { to: "/audience-manager", label: "Audience Manager", icon: UserPlus, group: "marketing", capability: "marketing" },
  { to: "/subscribers", label: "Subscribers", icon: Users, group: "marketing", capability: "marketing" },
  { to: "/segments", label: "Segments", icon: Tag, group: "marketing", capability: "marketing" },
  { to: "/scheduled-emails", label: "Scheduled Emails", icon: Clock, group: "marketing", capability: "marketing" },
  { to: "/email-analytics", label: "Email Analytics", icon: BarChart, group: "marketing", capability: "marketing" },
  { to: "/brand-settings", label: "Brand Settings", icon: Palette, group: "marketing", capability: "marketing" },
  { to: "/email-history", label: "Email History", icon: History, group: "marketing", capability: "marketing" },
  { to: "/notifications", label: "Notifications", icon: Bell, group: "operations", capability: "support" },
  { to: "/feedback", label: "Feedback", icon: MessageSquare, group: "operations", capability: "support" },
  { to: "/support", label: "Support Tickets", icon: LifeBuoy, group: "operations", capability: "support" },
  { to: "/audit-logs", label: "Audit Logs", icon: ShieldCheck, group: "operations", capability: "audit_logs" },
  { to: "/roadmap", label: "Roadmap", icon: LayoutGrid, group: "platform", capability: "content" },
  { to: "/changelog", label: "Changelog", icon: ListChecks, group: "platform", capability: "content" },
  { to: "/blog", label: "Blog Posts", icon: FileText, group: "platform", capability: "content" },
  { to: "/legal", label: "Legal Pages", icon: ShieldCheck, group: "platform", capability: "content" },
  { to: "/broadcasts", label: "Broadcasts", icon: Send, group: "platform", capability: "marketing" },
  { to: "/integrations", label: "Integrations", icon: Plug, group: "platform", capability: "monitoring" },
  { to: "/api-keys", label: "API Keys", icon: Key, group: "platform", capability: "monitoring" },
  { to: "/system-status", label: "System Status", icon: Activity, group: "operations", capability: "dashboard" },
  { to: "/system-health", label: "System Health", icon: Server, group: "operations", capability: "monitoring" },
  { to: "/releases", label: "Releases", icon: Rocket, group: "operations", capability: "monitoring" },
  { to: "/webhooks", label: "Webhooks", icon: Workflow, group: "platform", capability: "monitoring" },
  { to: "/settings", label: "Settings", icon: Settings, group: "settings", capability: "monitoring" },
  { to: "/monitoring/overview", label: "Overview", icon: Gauge, group: "monitoring", capability: "monitoring" },
  { to: "/monitoring/errors", label: "Errors", icon: AlertTriangle, group: "monitoring", capability: "monitoring" },
  { to: "/monitoring/performance", label: "Performance", icon: Zap, group: "monitoring", capability: "monitoring" },
  { to: "/monitoring/sessions", label: "Sessions", icon: Radio, group: "monitoring", capability: "monitoring" },
  { to: "/monitoring/infrastructure", label: "Infrastructure", icon: Server, group: "monitoring", capability: "monitoring" },
  { to: "/monitoring/email-health", label: "Email Health", icon: Mail, group: "monitoring", capability: "monitoring" },
  { to: "/monitoring/deployments", label: "Deployments", icon: Rocket, group: "monitoring", capability: "monitoring" },
  { to: "/monitoring/logs", label: "Logs", icon: ScrollText, group: "monitoring", capability: "monitoring" },
  { to: "/monitoring/integrations", label: "Integrations", icon: Puzzle, group: "monitoring", capability: "monitoring" },
  { to: "/perf", label: "Performance Dashboard", icon: Gauge, group: "monitoring", capability: "monitoring" },
  { to: "/sentry", label: "Sentry", icon: AlertTriangle, group: "monitoring", capability: "monitoring" },
  { to: "/posthog", label: "PostHog", icon: BarChart4, group: "monitoring", capability: "monitoring" },
  { to: "/monitoring", label: "Monitoring", icon: Activity, group: "monitoring", capability: "monitoring" },
  { to: "/admin-accounts", label: "Administrator Accounts", icon: ShieldCheck, group: "settings", capability: "manage_admins" },
  { to: "/routes-manager", label: "Routes Manager", icon: Workflow, group: "settings", capability: "manage_admins" }
];

export const NAV_GROUPS: Array<{ id: NavItem["group"]; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "marketing", label: "Marketing" },
  { id: "growth", label: "Growth" },
  { id: "people", label: "People" },
  { id: "platform", label: "Platform" },
  { id: "operations", label: "Operations" },
  { id: "monitoring", label: "Monitoring" },
  { id: "settings", label: "Settings" }
];

export const COMMAND_ACTIONS: Array<{
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  perform: "navigate" | "modal";
  payload?: string;
  keywords?: string[];
  requiresRole?: NavigationRole;
}> = [
  { id: "go-users", label: "Go to Users", group: "Navigation", perform: "navigate", payload: "/users", keywords: ["people", "accounts"] },
  { id: "go-waitlist", label: "Open Waitlist", group: "Navigation", perform: "navigate", payload: "/waitlist", keywords: ["leads"] },
  { id: "go-analytics", label: "Go to Analytics", group: "Navigation", perform: "navigate", payload: "/analytics" },
  { id: "go-flag", label: "Create Feature Flag", group: "Actions", perform: "navigate", payload: "/feature-flags", keywords: ["toggle"], requiresRole: "admin" },
  { id: "go-invite", label: "Invite User", group: "Actions", perform: "navigate", payload: "/admin-accounts", keywords: ["admin"], requiresRole: "super_admin" },
  { id: "go-search", label: "Search Workspace", group: "Navigation", perform: "navigate", payload: "/workspaces" },
  { id: "go-logs", label: "Open Logs", group: "Navigation", perform: "navigate", payload: "/audit-logs", requiresRole: "developer" },
  { id: "maintenance", label: "Enable Maintenance Mode", group: "System", perform: "navigate", payload: "/feature-flags", requiresRole: "admin" },
  { id: "send-email", label: "Send Email Campaign", group: "Actions", perform: "navigate", payload: "/email-campaigns", requiresRole: "marketing" },
  { id: "go-status", label: "System Status", group: "Navigation", perform: "navigate", payload: "/system-status" }
];

/** Resolve the capability required for a URL, including nested editor/detail routes. */
export function requiredCapabilityForPath(pathname: string): AdminCapability | undefined {
  const path = pathname.replace(/^\/control/, "") || "/";
  const exact = NAV_ITEMS.find((item) => item.to === path);
  if (exact?.capability) return exact.capability;
  if (path.startsWith("/email-templates/")) return "marketing";
  if (path.startsWith("/users/")) return "users";
  return undefined;
}
