import {
  Users,
  UserCog,
  Mail,
  Building2,
  CreditCard,
  Bot,
  Layers,
  Flag,
  FileText,
  Send,
  Bell,
  MessageSquare,
  LifeBuoy,
  Map,
  Activity,
  Plug,
  Key,
  Server,
  Settings,
  ShieldCheck,
  BarChart3,
  Home,
  ListChecks,
  Workflow,
  Ban,
  Gauge,
  AlertTriangle,
  Zap,
  Radio,
  Database,
  Rocket,
  ScrollText,
  Puzzle,
  Gift,
  Megaphone,
  MousePointerClick,
  PanelTop,
  UsersRound,
  Search,
  Link2,
  BarChart4,
  HardDrive,
  LayoutTemplate,
  LayoutGrid,
  Trash2,
  BarChart,
  UserPlus,
  Tag,
  Clock,
  Palette,
  History,
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  group: "overview" | "content" | "marketing" | "growth" | "people" | "platform" | "operations" | "monitoring" | "settings";
  badge?: string | number;
  requiresRole?: "super_admin" | "admin" | "developer" | "marketing";
}

export type NavigationRole = NonNullable<NavItem["requiresRole"]>;

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home, group: "overview" },
  { to: "/my-dashboard", label: "My workspace", icon: UserCog, group: "overview" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, group: "overview" },
  { to: "/launch-control", label: "Launch Control", icon: Megaphone, group: "marketing", requiresRole: "marketing" },
  { to: "/landing-page", label: "Landing Page", icon: PanelTop, group: "marketing", requiresRole: "marketing" },
  { to: "/cta-buttons", label: "CTA Buttons", icon: MousePointerClick, group: "marketing", requiresRole: "marketing" },
  { to: "/announcement-bar", label: "Announcement Bar", icon: Megaphone, group: "marketing", requiresRole: "marketing" },
  { to: "/waitlist-settings", label: "Waitlist Settings", icon: UsersRound, group: "marketing", requiresRole: "marketing" },
  { to: "/seo-settings", label: "SEO", icon: Search, group: "marketing", requiresRole: "marketing" },
  { to: "/social-links", label: "Social Links", icon: Link2, group: "marketing", requiresRole: "marketing" },
  { to: "/pages", label: "Pages", icon: FileText, group: "content" },
  { to: "/files", label: "Files", icon: HardDrive, group: "content" },
  { to: "/templates", label: "Templates", icon: LayoutTemplate, group: "content" },
  { to: "/waitlist", label: "Waitlist", icon: ListChecks, group: "growth" },
  { to: "/demo-requests", label: "Demo Requests", icon: MessageSquare, group: "growth" },
  { to: "/users", label: "Users", icon: Users, group: "people" },
  { to: "/banned-users", label: "Banned Users", icon: Ban, group: "people", requiresRole: "admin" },
  { to: "/trash", label: "Trash", icon: Trash2, group: "people", requiresRole: "admin" },
  { to: "/workspaces", label: "Workspaces", icon: Building2, group: "people" },
  { to: "/teams", label: "Teams", icon: UserCog, group: "people" },
  { to: "/referrals", label: "Referrals", icon: Gift, group: "growth" },
  { to: "/subscriptions", label: "Subscriptions", icon: Layers, group: "growth" },
  { to: "/payments", label: "Payments", icon: CreditCard, group: "growth" },
  { to: "/ai-usage", label: "AI Usage", icon: Bot, group: "platform" },
  { to: "/models", label: "Models", icon: Workflow, group: "platform" },
  { to: "/feature-flags", label: "Feature Flags", icon: Flag, group: "platform", requiresRole: "admin" },
  { to: "/email-dashboard", label: "Email Dashboard", icon: BarChart3, group: "marketing", requiresRole: "marketing" },
  { to: "/email-templates", label: "Email Templates", icon: LayoutTemplate, group: "marketing", requiresRole: "marketing" },
  { to: "/email-campaigns", label: "Email Campaigns", icon: Send, group: "marketing", requiresRole: "marketing" },
  { to: "/transactional-emails", label: "Transactional Emails", icon: Mail, group: "marketing", requiresRole: "marketing" },
  { to: "/audience-manager", label: "Audience Manager", icon: UserPlus, group: "marketing", requiresRole: "marketing" },
  { to: "/subscribers", label: "Subscribers", icon: Users, group: "marketing", requiresRole: "marketing" },
  { to: "/segments", label: "Segments", icon: Tag, group: "marketing", requiresRole: "marketing" },
  { to: "/scheduled-emails", label: "Scheduled Emails", icon: Clock, group: "marketing", requiresRole: "marketing" },
  { to: "/email-analytics", label: "Email Analytics", icon: BarChart, group: "marketing", requiresRole: "marketing" },
  { to: "/brand-settings", label: "Brand Settings", icon: Palette, group: "marketing", requiresRole: "marketing" },
  { to: "/email-history", label: "Email History", icon: History, group: "marketing", requiresRole: "marketing" },
  { to: "/notifications", label: "Notifications", icon: Bell, group: "operations" },
  { to: "/feedback", label: "Feedback", icon: MessageSquare, group: "operations" },
  { to: "/support", label: "Support Tickets", icon: LifeBuoy, group: "operations" },
  { to: "/audit-logs", label: "Audit Logs", icon: ShieldCheck, group: "operations", requiresRole: "developer" },
  { to: "/roadmap", label: "Roadmap", icon: LayoutGrid, group: "platform" },
  { to: "/changelog", label: "Changelog", icon: ListChecks, group: "platform" },
  { to: "/blog", label: "Blog Posts", icon: FileText, group: "platform" },
  { to: "/legal", label: "Legal Pages", icon: ShieldCheck, group: "platform" },
  { to: "/broadcasts", label: "Broadcasts", icon: Send, group: "platform" },
  { to: "/integrations", label: "Integrations", icon: Plug, group: "platform" },
  { to: "/api-keys", label: "API Keys", icon: Key, group: "platform", requiresRole: "admin" },
  { to: "/system-status", label: "System Status", icon: Activity, group: "operations" },
  { to: "/system-health", label: "System Health", icon: Server, group: "operations", requiresRole: "admin" },
  { to: "/webhooks", label: "Webhooks", icon: Workflow, group: "platform" },
  { to: "/settings", label: "Settings", icon: Settings, group: "settings" },
  { to: "/monitoring/overview", label: "Overview", icon: Gauge, group: "monitoring", requiresRole: "admin" },
  { to: "/monitoring/errors", label: "Errors", icon: AlertTriangle, group: "monitoring", requiresRole: "admin" },
  { to: "/monitoring/performance", label: "Performance", icon: Zap, group: "monitoring", requiresRole: "admin" },
  { to: "/monitoring/sessions", label: "Sessions", icon: Radio, group: "monitoring", requiresRole: "admin" },
  { to: "/monitoring/infrastructure", label: "Infrastructure", icon: Server, group: "monitoring", requiresRole: "admin" },
  { to: "/monitoring/email-health", label: "Email Health", icon: Mail, group: "monitoring", requiresRole: "admin" },
  { to: "/monitoring/deployments", label: "Deployments", icon: Rocket, group: "monitoring", requiresRole: "admin" },
  { to: "/monitoring/logs", label: "Logs", icon: ScrollText, group: "monitoring", requiresRole: "admin" },
  { to: "/monitoring/integrations", label: "Integrations", icon: Puzzle, group: "monitoring", requiresRole: "admin" },
  { to: "/perf", label: "Performance Dashboard", icon: Gauge, group: "monitoring", requiresRole: "admin" },
  { to: "/sentry", label: "Sentry", icon: AlertTriangle, group: "monitoring", requiresRole: "admin" },
  { to: "/posthog", label: "PostHog", icon: BarChart4, group: "monitoring", requiresRole: "admin" },
  { to: "/monitoring", label: "Monitoring", icon: Activity, group: "monitoring", requiresRole: "admin" },
  { to: "/admin-accounts", label: "Administrator Accounts", icon: ShieldCheck, group: "settings", requiresRole: "super_admin" },
  { to: "/routes-manager", label: "Routes Manager", icon: Workflow, group: "settings", requiresRole: "super_admin" }
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

/** Resolve the role required for a URL, including nested editor/detail routes. */
export function requiredRoleForPath(pathname: string): NavigationRole | undefined {
  const path = pathname.replace(/^\/control/, "") || "/";
  const exact = NAV_ITEMS.find((item) => item.to === path);
  if (exact?.requiresRole) return exact.requiresRole;
  if (path.startsWith("/email-templates/")) return "marketing";
  return undefined;
}
