export type AdminRole = "super_admin" | "admin" | "support" | "developer" | "marketing";

export type AdminCapability =
  | "dashboard" | "users" | "waitlist" | "content" | "marketing"
  | "support" | "monitoring" | "audit_logs" | "manage_admins" | "destructive_actions";

export interface AdminWorkflow {
  id: string;
  title: string;
  description: string;
  href: string;
  capability: AdminCapability;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl?: string | null;
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  support: "Support",
  developer: "Developer",
  marketing: "Marketing"
};

export const ROLE_RANK: Record<AdminRole, number> = {
  super_admin: 5,
  admin: 4,
  developer: 3,
  support: 2,
  marketing: 1
};

/** The permission contract shared by the admin UI. Database RPCs remain the final authority. */
export const ROLE_CAPABILITIES: Record<AdminRole, readonly AdminCapability[]> = {
  marketing: ["dashboard", "content", "marketing"],
  support: ["dashboard", "users", "waitlist", "support"],
  developer: ["dashboard", "users", "content", "audit_logs"],
  admin: ["dashboard", "users", "waitlist", "content", "support", "monitoring", "destructive_actions"],
  super_admin: ["dashboard", "users", "waitlist", "content", "marketing", "support", "monitoring", "audit_logs", "manage_admins", "destructive_actions"],
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  marketing: "Owns campaigns, content and launch messaging.",
  support: "Handles users, waitlist and customer support workflows.",
  developer: "Reviews platform activity, audit history and technical content.",
  admin: "Operates the platform, monitoring and user lifecycle controls.",
  super_admin: "Full platform control, administrator management and recovery actions.",
};

/** Role-specific operating surfaces. Every destination is an existing live, RPC-backed admin workflow. */
export const ROLE_WORKFLOWS: Record<AdminRole, readonly AdminWorkflow[]> = {
  marketing: [
    { id: "campaigns", title: "Campaign control", description: "Draft, schedule and review campaign delivery.", href: "/email-campaigns", capability: "marketing" },
    { id: "audience", title: "Audience health", description: "Inspect subscribers and audience segments.", href: "/audience-manager", capability: "marketing" },
    { id: "content-calendar", title: "Content calendar", description: "Keep launch content and publishing on track.", href: "/blog", capability: "content" },
    { id: "launch", title: "Launch checklist", description: "Coordinate landing, CTA and announcement changes.", href: "/launch-control", capability: "marketing" },
    { id: "brand", title: "Brand workspace", description: "Review the active email and brand configuration.", href: "/brand-settings", capability: "marketing" },
  ],
  support: [
    { id: "triage", title: "Waitlist triage", description: "Review, approve and invite eligible users.", href: "/waitlist", capability: "waitlist" },
    { id: "inbox", title: "Support queue", description: "Work open customer tickets and escalations.", href: "/support", capability: "support" },
    { id: "user-lookup", title: "User lookup", description: "Find account status and onboarding progress.", href: "/users", capability: "users" },
    { id: "feedback", title: "Feedback review", description: "Turn customer feedback into follow-up work.", href: "/feedback", capability: "support" },
    { id: "notifications", title: "Notification center", description: "Monitor operational notifications and replies.", href: "/notifications", capability: "support" },
  ],
  developer: [
    { id: "audit", title: "Audit timeline", description: "Inspect live platform and administrator events.", href: "/audit-logs", capability: "audit_logs" },
    { id: "errors", title: "Error triage", description: "Review application errors and recurring failures.", href: "/monitoring/errors", capability: "audit_logs" },
    { id: "performance", title: "Performance lab", description: "Trace latency, sessions and infrastructure health.", href: "/monitoring/performance", capability: "audit_logs" },
    { id: "deployments", title: "Deployment watch", description: "Review recent deploys and rollback readiness.", href: "/monitoring/deployments", capability: "audit_logs" },
    { id: "api", title: "Integration diagnostics", description: "Check system status and connected integrations.", href: "/integrations", capability: "content" },
  ],
  admin: [
    { id: "operations", title: "Operations desk", description: "See system health and operational alerts.", href: "/system-health", capability: "monitoring" },
    { id: "lifecycle", title: "User lifecycle", description: "Review bans, trash and account recovery workflows.", href: "/users", capability: "destructive_actions" },
    { id: "flags", title: "Release controls", description: "Manage feature flags with audit-backed changes.", href: "/feature-flags", capability: "monitoring" },
    { id: "integrations", title: "Integration center", description: "Inspect external services and connection state.", href: "/integrations", capability: "monitoring" },
    { id: "webhooks", title: "Webhook monitor", description: "Review delivery status and retry failures.", href: "/webhooks", capability: "monitoring" },
  ],
  super_admin: [
    { id: "governance", title: "Admin governance", description: "Manage administrator roles and access presets.", href: "/admin-accounts", capability: "manage_admins" },
    { id: "recovery", title: "Recovery center", description: "Review deleted accounts and restore safely.", href: "/trash", capability: "destructive_actions" },
    { id: "security", title: "Security oversight", description: "Inspect the complete administrator audit trail.", href: "/audit-logs", capability: "audit_logs" },
    { id: "platform", title: "Platform settings", description: "Review global settings and service configuration.", href: "/settings", capability: "monitoring" },
    { id: "status", title: "Executive status", description: "See the operational state of every platform area.", href: "/system-status", capability: "dashboard" },
  ],
};

export function can(user: AdminUser | null, capability: AdminCapability): boolean {
  return !!user && ROLE_CAPABILITIES[user.role]?.includes(capability);
}

export function hasRole(user: AdminUser | null, minimum: AdminRole): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[minimum];
}

export function canImpersonate(user: AdminUser | null): boolean {
  return user?.role === "super_admin";
}

export function canManageBilling(user: AdminUser | null): boolean {
  return hasRole(user, "admin");
}

export function canManageFeatureFlags(user: AdminUser | null): boolean {
  return hasRole(user, "admin");
}

export function canViewAuditLogs(user: AdminUser | null): boolean {
  return hasRole(user, "developer");
}

export function canManageAdmins(user: AdminUser | null): boolean {
  return user?.role === "super_admin";
}

export function canViewMonitoring(user: AdminUser | null): boolean {
  return hasRole(user, "admin");
}

export const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: "u-001",
    name: "Aarav Patel",
    email: "aarav@noska.dev",
    role: "super_admin",
    avatarUrl: null
  },
  {
    id: "u-002",
    name: "Mira Chen",
    email: "mira@noska.dev",
    role: "admin",
    avatarUrl: null
  },
  {
    id: "u-003",
    name: "Diego Martinez",
    email: "diego@noska.dev",
    role: "developer",
    avatarUrl: null
  },
  {
    id: "u-004",
    name: "Yuki Tanaka",
    email: "yuki@noska.dev",
    role: "support",
    avatarUrl: null
  },
  {
    id: "u-005",
    name: "Lena Brooks",
    email: "lena@noska.dev",
    role: "marketing",
    avatarUrl: null
  }
];
