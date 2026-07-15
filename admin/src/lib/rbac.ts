export type AdminRole = "super_admin" | "admin" | "support" | "developer" | "marketing";

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
