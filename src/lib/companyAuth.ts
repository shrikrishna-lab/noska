import type { OrganizationMember, OrgTeamMember, Organization } from "./company"

// ─── Role Checks (client-side UX helpers, NOT security) ────────────────────
// The existing schema uses job_title + member_roles for role assignment.

export function isCompanyOwner(member: OrganizationMember | null, org?: Organization | null): boolean {
  if (!member) return false
  if (org && member.user_id === org.created_by) return true
  return member.job_title === "Organization Owner"
}

export function isCompanyAdmin(member: OrganizationMember | null, org?: Organization | null): boolean {
  if (isCompanyOwner(member, org)) return true
  return member.job_title?.includes("Admin") || false
}

export function isCompanyMember(member: OrganizationMember | null): boolean {
  return member?.status === "active"
}

export function isCompanyGuest(member: OrganizationMember | null): boolean {
  return member?.status === "active" && member?.job_title === "Guest"
}

// ─── Permission Checks ──────────────────────────────────────────────────────

export function canManageMembers(member: OrganizationMember | null, org?: Organization | null): boolean {
  return isCompanyAdmin(member, org)
}

export function canManageTeams(member: OrganizationMember | null, org?: Organization | null): boolean {
  return isCompanyAdmin(member, org)
}

export function canManageSettings(member: OrganizationMember | null, org?: Organization | null): boolean {
  return isCompanyAdmin(member, org)
}

export function canInvite(member: OrganizationMember | null, org?: Organization | null): boolean {
  return isCompanyAdmin(member, org)
}

export function canDeleteCompany(member: OrganizationMember | null, org?: Organization | null): boolean {
  return isCompanyOwner(member, org)
}

export function canTransferOwnership(member: OrganizationMember | null, org?: Organization | null): boolean {
  return isCompanyOwner(member, org)
}

export function canManageRoles(member: OrganizationMember | null, org?: Organization | null): boolean {
  return isCompanyAdmin(member, org)
}

export function canRemoveMember(member: OrganizationMember | null, targetUserId: string, org?: Organization | null): boolean {
  if (!isCompanyAdmin(member, org)) return false
  if (org && targetUserId === org.created_by) return false
  return true
}

// ─── Page Visibility Checks ─────────────────────────────────────────────────

export function canAccessPage(
  pageOrgId: string | null,
  pageTeamId: string | null,
  pageVisibility: string,
  pageUserId: string,
  currentUserId: string,
  currentMember: OrganizationMember | null,
  pagePermissions: { user_id: string }[] = []
): boolean {
  if (pageUserId === currentUserId) return true
  if (pagePermissions.some((p) => p.user_id === currentUserId)) return true
  if (pageVisibility === "public") return true
  if (!pageOrgId) return false
  if (!currentMember || currentMember.organization_id !== pageOrgId) return false
  if (currentMember.status !== "active") return false
  if (pageVisibility === "company") return true
  if (pageVisibility === "team" && pageTeamId) return true
  return false
}

// ─── Visibility Helpers ─────────────────────────────────────────────────────

export type PageVisibility = "private" | "team" | "company" | "public"

export const VISIBILITY_OPTIONS: { value: PageVisibility; label: string; description: string; icon: string }[] = [
  { value: "private", label: "Private", description: "Only you and people you share with", icon: "🔒" },
  { value: "team", label: "Team", description: "Visible to your team members", icon: "👥" },
  { value: "company", label: "Company", description: "Visible to all company members", icon: "🏢" },
  { value: "public", label: "Public", description: "Anyone with the link can view", icon: "🌐" },
]

export function getVisibilityLabel(visibility: PageVisibility): string {
  return VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label || "Private"
}

export function getVisibilityIcon(visibility: PageVisibility): string {
  return VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.icon || "🔒"
}

// ─── Role Display ───────────────────────────────────────────────────────────

export const COMPANY_ROLE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  "Organization Owner": { label: "Owner", color: "text-yellow-500", description: "Full company control" },
  "Organization Admin": { label: "Admin", color: "text-purple-500", description: "Can manage members and settings" },
  "Team Member": { label: "Member", description: "Can access permitted resources", color: "text-blue-500" },
  "Guest": { label: "Guest", description: "Restricted access to shared resources only", color: "text-gray-500" },
}

export function getRoleBadge(jobTitle: string): { label: string; color: string } {
  const config = COMPANY_ROLE_CONFIG[jobTitle] || COMPANY_ROLE_CONFIG["Team Member"]
  return { label: config.label, color: config.color }
}

// ─── Company Settings Access ────────────────────────────────────────────────

export type CompanySettingsTab = "general" | "members" | "teams" | "permissions" | "security" | "billing" | "integrations" | "audit"

export function getVisibleSettingsTabs(member: OrganizationMember | null, org?: Organization | null): CompanySettingsTab[] {
  const tabs: CompanySettingsTab[] = ["general"]

  if (isCompanyMember(member)) {
    tabs.push("members")
    tabs.push("teams")
  }

  if (isCompanyAdmin(member, org)) {
    tabs.push("permissions")
    tabs.push("security")
    tabs.push("audit")
  }

  if (isCompanyOwner(member, org)) {
    tabs.push("billing")
    tabs.push("integrations")
  }

  return tabs
}
