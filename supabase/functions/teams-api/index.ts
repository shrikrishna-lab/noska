import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const supabase = createClient(supabaseUrl, supabaseKey)

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    // baggage/traceparent/sentry-trace are auto-injected by PostHog/Sentry
    // browser SDKs into every fetch — rejecting them breaks preflight in prod.
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, apikey, baggage, traceparent, sentry-trace",
    "Content-Type": "application/json",
  }
}


function allowedOrigin(origin) {
  if (!origin) return "https://app.noska.me";
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  if (/^https:\/\/([\w-]+\.)?noska\.me$/.test(origin)) return origin;
  return "https://app.noska.me";
}

function getOrigin(req: Request): string {
  return allowedOrigin(req.headers.get("origin") || req.headers.get("referer") || "");
}

async function requireUser(req: Request): Promise<string> {
  const auth = req.headers.get("Authorization")
  if (!auth) throw new Error("Missing Authorization header")
  const token = auth.replace("Bearer ", "")
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error("Unauthorized")
  return user.id
}

interface TeamInput {
  name: string
  description?: string
  icon?: string
}

interface InviteInput {
  team_id: string
  invitee_email: string
  role?: "admin" | "member"
}

Deno.serve(async (req: Request) => {
  const origin = getOrigin(req)
  const headers = corsHeaders(origin)

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers })
  }

  try {
    const userId = await requireUser(req)
    const url = new URL(req.url)
    const path = url.pathname.replace("/teams-api", "").replace(/^\/+/, "")
    const method = req.method

    if (method === "GET" && (path === "teams" || path === "")) {
      const { data: memberships } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", userId)
      const teamIds = memberships?.map((m) => m.team_id) ?? []

      const { data: ownedTeams } = await supabase
        .from("teams")
        .select("*")
        .eq("created_by", userId)

      const { data: memberTeams } = teamIds.length
        ? await supabase.from("teams").select("*").in("id", teamIds)
        : { data: [] }

      const seen = new Set<string>()
      const allTeams = [...(ownedTeams ?? []), ...(memberTeams ?? [])].filter((t) => {
        if (seen.has(t.id)) return false
        seen.add(t.id)
        return true
      })

      return new Response(JSON.stringify({ teams: allTeams }), { headers })
    }

    if (method === "GET" && path.startsWith("teams/")) {
      const teamId = path.replace("teams/", "").split("/")[0]
      const sub = path.replace(`teams/${teamId}`, "").replace(/^\//, "")

      if (sub === "members") {
        const { data: members } = await supabase
          .from("team_members")
          .select("*")
          .eq("team_id", teamId)
          .order("joined_at", { ascending: true })
        return new Response(JSON.stringify({ members: members ?? [] }), { headers })
      }

      if (sub === "invites") {
        const { data: invites } = await supabase
          .from("team_invites")
          .select("*")
          .eq("team_id", teamId)
          .order("created_at", { ascending: false })
        return new Response(JSON.stringify({ invites: invites ?? [] }), { headers })
      }

      const { data: team } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single()
      return new Response(JSON.stringify({ team }), { headers })
    }

    if (method === "GET" && path === "invites") {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("user_id", userId)
        .single()
      const email = profile?.email
      if (!email) {
        return new Response(JSON.stringify({ invites: [] }), { headers })
      }
      const { data: invites } = await supabase
        .from("team_invites")
        .select("*, teams(name, icon, slug)")
        .eq("invitee_email", email)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
      return new Response(JSON.stringify({ invites: invites ?? [] }), { headers })
    }

    if (method === "POST" && path === "teams") {
      const body: TeamInput = await req.json()
      if (!body.name?.trim()) {
        return new Response(JSON.stringify({ error: "Team name is required" }),
          { status: 400, headers })
      }
      const slug = body.name.trim().toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")

      const { data: team, error } = await supabase
        .from("teams")
        .insert({
          name: body.name.trim(),
          description: body.description,
          icon: body.icon || "👥",
          slug,
          created_by: userId,
        })
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          return new Response(JSON.stringify({ error: "A team with this name already exists" }),
            { status: 409, headers })
        }
        throw error
      }

      await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: userId,
        role: "owner",
        user_name: null,
        user_email: null,
        user_avatar: "👤",
      })

      return new Response(JSON.stringify({ team }), { status: 201, headers })
    }

    if (method === "PATCH" && path.startsWith("teams/")) {
      const teamId = path.replace("teams/", "").split("/")[0]
      const body: Partial<TeamInput> = await req.json()
      const update: Record<string, unknown> = {}
      if (body.name) update.name = body.name.trim()
      if (body.description !== undefined) update.description = body.description
      if (body.icon !== undefined) update.icon = body.icon

      const { data: team, error } = await supabase
        .from("teams")
        .update(update)
        .eq("id", teamId)
        .select()
        .single()

      if (error) throw error
      return new Response(JSON.stringify({ team }), { headers })
    }

    if (method === "DELETE" && path.startsWith("teams/")) {
      const teamId = path.replace("teams/", "").split("/")[0]
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId)
        .eq("created_by", userId)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers })
    }

    if (method === "POST" && path === "invites") {
      const body: InviteInput = await req.json()
      if (!body.team_id || !body.invitee_email) {
        return new Response(JSON.stringify({ error: "team_id and invitee_email are required" }),
          { status: 400, headers })
      }

      const { data: existing } = await supabase
        .from("team_invites")
        .select("id")
        .eq("team_id", body.team_id)
        .eq("invitee_email", body.invitee_email.toLowerCase())
        .eq("status", "pending")
        .maybeSingle()

      if (existing) {
        return new Response(JSON.stringify({ error: "Invite already pending for this email" }),
          { status: 409, headers })
      }

      const { data: invite, error } = await supabase
        .from("team_invites")
        .insert({
          team_id: body.team_id,
          inviter_user_id: userId,
          invitee_email: body.invitee_email.toLowerCase(),
          role: body.role || "member",
        })
        .select()
        .single()

      if (error) throw error
      return new Response(JSON.stringify({ invite }), { status: 201, headers })
    }

    if (method === "POST" && path.startsWith("invites/")) {
      const inviteId = path.replace("invites/", "").split("/")[0]
      const action = path.replace(`invites/${inviteId}`, "").replace(/^\//, "")

      if (action === "accept") {
        const { data: invite } = await supabase
          .from("team_invites")
          .select("*")
          .eq("id", inviteId)
          .single()

        if (!invite) {
          return new Response(JSON.stringify({ error: "Invite not found" }),
            { status: 404, headers })
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("email, user_name, avatar_url")
          .eq("user_id", userId)
          .single()

        if (profile?.email !== invite.invitee_email) {
          return new Response(JSON.stringify({ error: "This invite is not for you" }),
            { status: 403, headers })
        }

        await supabase.from("team_members").insert({
          team_id: invite.team_id,
          user_id: userId,
          role: invite.role,
          user_name: profile?.user_name ?? null,
          user_email: profile?.email ?? null,
          user_avatar: profile?.avatar_url ?? "👤",
        })

        await supabase
          .from("team_invites")
          .update({ status: "accepted", invitee_user_id: userId, responded_at: new Date().toISOString() })
          .eq("id", inviteId)

        return new Response(JSON.stringify({ success: true }), { headers })
      }

      if (action === "decline") {
        await supabase
          .from("team_invites")
          .update({ status: "declined", responded_at: new Date().toISOString() })
          .eq("id", inviteId)

        return new Response(JSON.stringify({ success: true }), { headers })
      }
    }

    if (method === "DELETE" && path.startsWith("members/")) {
      const parts = path.replace("members/", "").split("/")
      const teamId = parts[0]
      const memberUserId = parts[1]
      if (!teamId || !memberUserId) {
        return new Response(JSON.stringify({ error: "team_id and user_id required" }),
          { status: 400, headers })
      }

      const { data: membership } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", userId)
        .single()

      if (!membership) {
        return new Response(JSON.stringify({ error: "Not a member of this team" }),
          { status: 403, headers })
      }

      if (memberUserId === userId) {
        await supabase
          .from("team_members")
          .delete()
          .eq("team_id", teamId)
          .eq("user_id", userId)
        return new Response(JSON.stringify({ success: true }), { headers })
      }

      if (membership.role !== "owner" && membership.role !== "admin") {
        return new Response(JSON.stringify({ error: "Only owners and admins can remove members" }),
          { status: 403, headers })
      }

      await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", memberUserId)

      return new Response(JSON.stringify({ success: true }), { headers })
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    const status = message === "Missing Authorization header" || message === "Unauthorized" ? 401 : 500
    return new Response(JSON.stringify({ error: message }), { status, headers })
  }
})
