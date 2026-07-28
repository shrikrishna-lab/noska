import { supabase } from "./supabase"

const TEAMS_API = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teams-api`

async function call(method: string, path: string, body?: unknown) {
  const token = await supabase.auth.getSession().then((r) => r.data.session?.access_token)
  const res = await fetch(`${TEAMS_API}/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Request failed")
  return data
}

export interface Team {
  id: string
  name: string
  slug: string | null
  icon: string | null
  description: string | null
  created_by: string | null
  lead_name: string | null
  member_count: number | null
  workspace_count: number | null
  created_at: string | null
  updated_at: string | null
}

export interface TeamMember {
  team_id: string
  user_id: string
  user_name: string | null
  user_email: string | null
  user_avatar: string | null
  role: "owner" | "admin" | "member"
  joined_at: string | null
}

export interface TeamInvite {
  id: string
  team_id: string
  inviter_user_id: string
  invitee_email: string
  invitee_user_id: string | null
  role: string
  status: string
  created_at: string | null
  responded_at: string | null
  teams?: { name: string; icon: string | null; slug: string | null }
}

export async function fetchTeams(): Promise<Team[]> {
  const data = await call("GET", "teams")
  return data.teams ?? []
}

export async function fetchTeam(teamId: string): Promise<Team> {
  const data = await call("GET", `teams/${teamId}`)
  return data.team
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const data = await call("GET", `teams/${teamId}/members`)
  return data.members ?? []
}

export async function fetchTeamInvites(teamId: string): Promise<TeamInvite[]> {
  const data = await call("GET", `teams/${teamId}/invites`)
  return data.invites ?? []
}

export async function createTeam(name: string, description?: string, icon?: string): Promise<Team> {
  const data = await call("POST", "teams", { name, description, icon })
  return data.team
}

export async function updateTeam(teamId: string, patch: Partial<Team>): Promise<Team> {
  const data = await call("PATCH", `teams/${teamId}`, patch)
  return data.team
}

export async function deleteTeam(teamId: string): Promise<void> {
  await call("DELETE", `teams/${teamId}`)
}

export async function inviteMember(teamId: string, email: string, role?: "admin" | "member"): Promise<TeamInvite> {
  const data = await call("POST", "invites", { team_id: teamId, invitee_email: email, role })
  return data.invite
}

export async function acceptInvite(inviteId: string): Promise<void> {
  await call("POST", `invites/${inviteId}/accept`)
}

export async function declineInvite(inviteId: string): Promise<void> {
  await call("POST", `invites/${inviteId}/decline`)
}

export async function removeMember(teamId: string, userId: string): Promise<void> {
  await call("DELETE", `members/${teamId}/${userId}`)
}

export async function fetchPendingInvites(): Promise<TeamInvite[]> {
  const data = await call("GET", "invites")
  return data.invites ?? []
}
