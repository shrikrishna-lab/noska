import { supabase } from "./supabase"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  slug: string
  description: string
  logo_url: string | null
  industry: string
  company_size: string
  timezone: string
  locale: string
  currency: string
  branding_config: Record<string, unknown>
  settings: Record<string, unknown>
  status: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  employee_id: string | null
  employee_type: string
  job_title: string
  status: string
  department_id: string | null
  primary_team_id: string | null
  manager_id: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  profile_visibility: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined data
  user_profiles?: { user_name?: string | null; email?: string | null; avatar_url?: string | null } | null
  user_name?: string | null
  email?: string | null
  avatar_url?: string | null
  role_name?: string | null
}

export interface OrganizationInvitation {
  id: string
  organization_id: string
  email: string
  invited_by: string
  role_id: string | null
  department_id: string | null
  team_id: string | null
  manager_id: string | null
  employee_type: string
  job_title: string
  status: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface OrgTeam {
  id: string
  organization_id: string
  department_id: string | null
  name: string
  description: string
  leader_id: string | null
  icon: string
  color: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
  member_count?: number
}

export interface OrgTeamMember {
  id: string
  team_id: string
  organization_member_id: string
  role: string
  joined_at: string
  left_at: string | null
  // Joined data
  member?: OrganizationMember
}

export interface AuditLog {
  id: string
  organization_id: string
  actor_id: string
  action: string
  target_resource: string
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export interface OrgRole {
  id: string
  organization_id: string | null
  name: string
  description: string
  role_type: string
  is_system_role: boolean
  permissions: string[]
  created_at: string
  updated_at: string
}

// ─── Type aliases for backward compatibility ────────────────────────────────

export type Company = Organization
export type CompanyMember = OrganizationMember
export type CompanyInvitation = OrganizationInvitation
export type CompanyTeam = OrgTeam
export type CompanyTeamMember = OrgTeamMember
export type CompanyAuditLog = AuditLog

// ─── API Helpers ────────────────────────────────────────────────────────────

// Tables not in generated Supabase types — cast for query builder access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (name: string): any => (supabase as any).from(name)

async function rpc<T = unknown>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name as never, args as never)
  if (error) throw new Error(error.message)
  return data as T
}

// ─── Organization CRUD ──────────────────────────────────────────────────────

export async function createCompany(
  name: string,
  slug: string,
  description?: string,
): Promise<string> {
  return rpc<string>("create_organization", {
    p_name: name,
    p_slug: slug,
    p_description: description || "",
  })
}

export async function getCompany(orgId: string): Promise<Organization> {
  const { data, error } = await t("organizations")
    .select("*")
    .eq("id", orgId)
    .single()
  if (error) throw new Error(error.message)
  return data as Organization
}

export async function updateCompany(
  orgId: string,
  patch: Partial<Pick<Organization, "name" | "description" | "logo_url" | "industry" | "company_size" | "timezone" | "locale" | "currency" | "branding_config" | "settings">>
): Promise<Organization> {
  const { data, error } = await t("organizations")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", orgId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Organization
}

export async function deleteCompany(orgId: string): Promise<void> {
  const { error } = await t("organizations")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", orgId)
  if (error) throw new Error(error.message)
}

// ─── User's Organizations ───────────────────────────────────────────────────

export async function getUserCompanies(): Promise<Organization[]> {
  const userId = localStorage.getItem("noska_user_id")
  if (!userId) return []

  const { data: memberships, error: mErr } = await t("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active")
  if (mErr) throw new Error(mErr.message)
  if (!memberships?.length) return []

  const orgIds = memberships.map((m: { organization_id: string }) => m.organization_id)
  const { data, error } = await t("organizations")
    .select("*")
    .in("id", orgIds)
    .eq("status", "active")
    .order("name")
  if (error) throw new Error(error.message)
  return (data || []) as Organization[]
}

export async function getUserMemberships(): Promise<OrganizationMember[]> {
  const userId = localStorage.getItem("noska_user_id")
  if (!userId) return []

  const { data, error } = await t("organization_members")
    .select("*")
    .eq("user_id", userId)
  if (error) throw new Error(error.message)
  return (data || []) as OrganizationMember[]
}

// ─── Organization Members ───────────────────────────────────────────────────

export async function getCompanyMembers(orgId: string): Promise<OrganizationMember[]> {
  const { data, error } = await t("organization_members")
    .select("*, user_profiles:user_id(user_name, email, avatar_url)")
    .eq("organization_id", orgId)
    .order("created_at")
  if (error) throw new Error(error.message)
  return (data || []) as OrganizationMember[]
}

export async function removeCompanyMember(orgId: string, userId: string): Promise<void> {
  await rpc("remove_organization_member", { p_org_id: orgId, p_user_id: userId })
}

export async function changeCompanyRole(
  orgId: string,
  userId: string,
  _newRole: string
): Promise<void> {
  // Roles in the existing system use member_roles table
  const { error } = await t("organization_members")
    .update({ updated_at: new Date().toISOString() })
    .eq("organization_id", orgId)
    .eq("user_id", userId)
  if (error) throw new Error(error.message)
}

// ─── Organization Invitations ───────────────────────────────────────────────

export async function inviteToCompany(
  orgId: string,
  email: string,
  jobTitle?: string
): Promise<string> {
  return rpc<string>("invite_to_organization", {
    p_org_id: orgId,
    p_email: email,
    p_job_title: jobTitle || "Team Member",
  })
}

export async function getCompanyInvitations(orgId: string): Promise<OrganizationInvitation[]> {
  const { data, error } = await t("organization_invitations")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []) as OrganizationInvitation[]
}

export async function revokeInvitation(inviteId: string): Promise<void> {
  const { error } = await t("organization_invitations")
    .update({ status: "revoked" })
    .eq("id", inviteId)
  if (error) throw new Error(error.message)
}

export async function acceptInvitation(inviteId: string): Promise<string> {
  return rpc<string>("accept_organization_invitation", { p_invite_id: inviteId })
}

export async function declineInvitation(inviteId: string): Promise<void> {
  const { error } = await t("organization_invitations")
    .update({ status: "revoked" })
    .eq("id", inviteId)
  if (error) throw new Error(error.message)
}

// ─── Organization Teams ─────────────────────────────────────────────────────

export async function getCompanyTeams(orgId: string): Promise<OrgTeam[]> {
  const { data, error } = await t("company_teams")
    .select("*")
    .eq("organization_id", orgId)
    .order("name")
  if (error) throw new Error(error.message)
  return (data || []) as OrgTeam[]
}

export async function createCompanyTeam(
  orgId: string,
  name: string,
  description?: string,
  icon?: string,
  color?: string
): Promise<string> {
  return rpc<string>("create_organization_team", {
    p_org_id: orgId,
    p_name: name,
    p_description: description || "",
    p_icon: icon || "👥",
    p_color: color || "#10b981",
  })
}

export async function updateCompanyTeam(
  teamId: string,
  patch: Partial<Pick<OrgTeam, "name" | "description" | "icon" | "color">>
): Promise<OrgTeam> {
  const { data, error } = await t("company_teams")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", teamId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as OrgTeam
}

export async function deleteCompanyTeam(teamId: string): Promise<void> {
  const { error } = await t("company_teams").delete().eq("id", teamId)
  if (error) throw new Error(error.message)
}

// ─── Organization Team Members ──────────────────────────────────────────────

export async function getCompanyTeamMembers(teamId: string): Promise<OrgTeamMember[]> {
  const { data, error } = await t("company_team_members")
    .select("*, member:organization_member_id(id, user_id, job_title, status, user_profiles:user_id(user_name, email, avatar_url))")
    .eq("team_id", teamId)
    .is("left_at", null)
    .order("joined_at")
  if (error) throw new Error(error.message)
  return (data || []) as OrgTeamMember[]
}

export async function addCompanyTeamMember(
  teamId: string,
  userId: string,
  role?: string
): Promise<void> {
  await rpc("add_team_member", {
    p_team_id: teamId,
    p_user_id: userId,
    p_role: role || "member",
  })
}

export async function removeCompanyTeamMember(teamId: string, memberId: string): Promise<void> {
  await rpc("remove_team_member", { p_team_id: teamId, p_member_id: memberId })
}

// ─── Organization Audit Logs ────────────────────────────────────────────────

export async function getCompanyAuditLogs(
  orgId: string,
  limit = 50,
  offset = 0
): Promise<AuditLog[]> {
  const { data, error } = await t("audit_logs")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw new Error(error.message)
  return (data || []) as AuditLog[]
}

// ─── Ownership Transfer ─────────────────────────────────────────────────────

export async function transferOwnership(orgId: string, newOwnerId: string): Promise<void> {
  const { error } = await t("organizations")
    .update({ created_by: newOwnerId, updated_at: new Date().toISOString() })
    .eq("id", orgId)
  if (error) throw new Error(error.message)
}

// ─── Slug Helpers ───────────────────────────────────────────────────────────

export function slugifyCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const { count } = await t("organizations")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug)
  return (count ?? 0) === 0
}

// ─── Page Visibility ────────────────────────────────────────────────────────

export async function setPageVisibility(
  pageId: string,
  visibility: "private" | "team" | "company" | "public",
  orgId?: string | null,
  teamId?: string | null
): Promise<void> {
  const update: Record<string, unknown> = { visibility }
  if (orgId !== undefined) update.organization_id = orgId
  if (teamId !== undefined) update.team_id = teamId

  const { error } = await t("pages")
    .update(update)
    .eq("id", pageId)
  if (error) throw new Error(error.message)
}

// ─── Org-Scoped Pages ──────────────────────────────────────────────────────

export interface OrgPage {
  id: string
  title: string
  icon: string | null
  visibility: string
  team_id: string | null
  organization_id: string | null
  parent_page_id: string | null
  user_id: string
  updated_at: string
  created_at: string
}

export async function getOrgPages(orgId: string, limit = 50): Promise<OrgPage[]> {
  const { data, error } = await t("pages")
    .select("id, title, icon, visibility, team_id, organization_id, user_id, updated_at, created_at")
    .eq("organization_id", orgId)
    .eq("trashed", false)
    .order("updated_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data || []) as OrgPage[]
}

export async function getOrgTeamPages(orgId: string, teamId: string): Promise<OrgPage[]> {
  const { data, error } = await t("pages")
    .select("id, title, icon, visibility, team_id, organization_id, user_id, updated_at, created_at")
    .eq("organization_id", orgId)
    .eq("team_id", teamId)
    .eq("trashed", false)
    .order("updated_at", { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return (data || []) as OrgPage[]
}

export async function getOrgDatabases(orgId: string): Promise<OrgPage[]> {
  const { data, error } = await t("pages")
    .select("id, title, icon, visibility, team_id, organization_id, user_id, updated_at, created_at, blocks")
    .eq("organization_id", orgId)
    .eq("trashed", false)
    .order("updated_at", { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  // Filter pages that contain database blocks
  return ((data || []) as any[]).filter((p) => {
    if (!p.blocks || !Array.isArray(p.blocks)) return false
    return p.blocks.some((b: any) => b?.type === "database" || b?.type === "database-inline" || b?.type === "database-full")
  }) as OrgPage[]
}

// ─── Projects ──────────────────────────────────────────────────────────────

export interface OrgProject {
  id: string
  organization_id: string
  name: string
  description: string
  owner_id: string
  team_id: string | null
  status: string
  priority: string
  health_status: string
  progress: number
  start_date: string | null
  due_date: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function getOrgProjects(orgId: string): Promise<OrgProject[]> {
  const { data, error } = await t("projects")
    .select("*")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return (data || []) as OrgProject[]
}

export async function createOrgProject(
  orgId: string,
  name: string,
  description: string,
  userId: string,
  teamId?: string | null
): Promise<string> {
  const { data, error } = await t("projects")
    .insert({
      organization_id: orgId,
      name,
      description,
      owner_id: userId,
      team_id: teamId || null,
      status: "active",
      priority: "medium",
    } as any)
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function updateOrgProject(
  projectId: string,
  patch: Partial<Pick<OrgProject, "name" | "description" | "status" | "priority" | "health_status" | "progress" | "team_id" | "due_date">>
): Promise<void> {
  const { error } = await t("projects")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", projectId)
  if (error) throw new Error(error.message)
}

export async function deleteOrgProject(projectId: string): Promise<void> {
  const { error } = await t("projects").delete().eq("id", projectId)
  if (error) throw new Error(error.message)
}

// ─── Project Members ───────────────────────────────────────────────────────

export interface ProjectMember {
  id: string
  project_id: string
  organization_member_id: string
  role: string
  created_at: string
  member?: OrganizationMember
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await t("project_members")
    .select("*, member:organization_member_id(id, user_id, job_title, status, user_profiles:user_id(user_name, email, avatar_url))")
    .eq("project_id", projectId)
    .order("created_at")
  if (error) throw new Error(error.message)
  return (data || []) as ProjectMember[]
}

export async function addProjectMember(
  projectId: string,
  organizationMemberId: string,
  role = "contributor"
): Promise<void> {
  const { error } = await t("project_members").insert({
    project_id: projectId,
    organization_member_id: organizationMemberId,
    role,
  } as any)
  if (error) throw new Error(error.message)
}

export async function removeProjectMember(projectId: string, organizationMemberId: string): Promise<void> {
  const { error } = await t("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("organization_member_id", organizationMemberId)
  if (error) throw new Error(error.message)
}

// ─── Organization Settings ─────────────────────────────────────────────────

export async function getOrgSettings(orgId: string): Promise<Record<string, unknown>> {
  const { data, error } = await t("organization_settings")
    .select("key, value")
    .eq("organization_id", orgId)
  if (error) throw new Error(error.message)
  const settings: Record<string, unknown> = {}
  for (const row of (data || []) as { key: string; value: unknown }[]) {
    settings[row.key] = row.value
  }
  return settings
}

export async function setOrgSetting(orgId: string, key: string, value: unknown): Promise<void> {
  const { error } = await t("organization_settings")
    .upsert({ organization_id: orgId, key, value } as any, { onConflict: "organization_id,key" })
  if (error) throw new Error(error.message)
}

// ─── Resend Invitation ─────────────────────────────────────────────────────

export async function resendInvitation(inviteId: string): Promise<void> {
  const { error } = await t("organization_invitations")
    .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
    .eq("id", inviteId)
    .eq("status", "pending")
  if (error) throw new Error(error.message)
}

// ─── Audit Log Search ──────────────────────────────────────────────────────

export async function searchAuditLogs(
  orgId: string,
  query: string,
  limit = 50
): Promise<AuditLog[]> {
  const { data, error } = await t("audit_logs")
    .select("*")
    .eq("organization_id", orgId)
    .or(`action.ilike.%${query}%,target_resource.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data || []) as AuditLog[]
}

// ─── Write Audit Log ───────────────────────────────────────────────────────

export async function writeAuditLog(
  orgId: string,
  actorId: string,
  action: string,
  targetResource: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await t("audit_logs").insert({
    organization_id: orgId,
    actor_id: actorId,
    action,
    target_resource: targetResource,
    details,
  } as any)
  if (error) throw new Error(error.message)
}

// ─── Company Search ────────────────────────────────────────────────────────

export interface SearchResult {
  type: "page" | "project" | "team" | "member"
  id: string
  title: string
  subtitle?: string
  icon?: string
}

export async function searchCompany(
  orgId: string,
  query: string,
  userId: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const q = query.toLowerCase()

  // Search pages (only company/team visibility or user-owned)
  const { data: pages } = await t("pages")
    .select("id, title, icon, visibility, user_id")
    .eq("organization_id", orgId)
    .eq("trashed", false)
    .ilike("title", `%${query}%`)
    .limit(10)
  for (const p of (pages || []) as any[]) {
    if (p.user_id === userId || ["company", "team", "public"].includes(p.visibility)) {
      results.push({ type: "page", id: p.id, title: p.title, icon: p.icon })
    }
  }

  // Search projects
  const { data: projects } = await t("projects")
    .select("id, name, description")
    .eq("organization_id", orgId)
    .ilike("name", `%${query}%`)
    .limit(10)
  for (const p of (projects || []) as any[]) {
    results.push({ type: "project", id: p.id, title: p.name, subtitle: p.description })
  }

  // Search teams
  const { data: teams } = await t("company_teams")
    .select("id, name, icon")
    .eq("organization_id", orgId)
    .ilike("name", `%${query}%`)
    .limit(10)
  for (const t of (teams || []) as any[]) {
    results.push({ type: "team", id: t.id, title: t.name, icon: t.icon })
  }

  // Search members
  const { data: members } = await t("organization_members")
    .select("id, user_id, user_profiles:user_id(user_name, email)")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .limit(10)
  for (const m of (members || []) as any[]) {
    const name = m.user_profiles?.user_name || ""
    const email = m.user_profiles?.email || ""
    if (name.toLowerCase().includes(q) || email.toLowerCase().includes(q)) {
      results.push({ type: "member", id: m.id, title: name || email, subtitle: email })
    }
  }

  return results
}
