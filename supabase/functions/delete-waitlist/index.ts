import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const supabase = createClient(supabaseUrl, supabaseKey)

const CLERK_API = "https://api.clerk.com/v1"
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY") ?? ""

Deno.serve(async (req: Request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json",
  }

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers })
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers })
  }

  try {
    const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers })

    const authHeader = req.headers.get("Authorization") ?? ""
    const sessionToken = authHeader.replace(/^Bearer\s+/i, "").trim()
    if (!sessionToken) return respond({ error: "Unauthorized" }, 401)

    const { error: authErr } = await supabase.rpc("require_admin_role", {
      p_session_token: sessionToken,
      p_min_role: "admin",
    })
    if (authErr) return respond({ error: "Forbidden" }, 403)

    const body = await req.json()
    const waitlistId = body.waitlist_id as string | undefined
    if (!waitlistId) return respond({ error: "waitlist_id is required" }, 400)

    // Fetch the entry to get clerk_entry_id before deleting
    const { data: entry } = await supabase
      .from("waitlist_entries")
      .select("id, email, clerk_entry_id")
      .eq("id", waitlistId)
      .single()

    // Delete from Clerk if a clerk_entry_id exists
    if (entry?.clerk_entry_id && CLERK_SECRET_KEY) {
      try {
        await fetch(`${CLERK_API}/waitlist_entries/${entry.clerk_entry_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
        })
      } catch (err) {
        console.error("Failed to delete Clerk waitlist entry:", err)
      }
    }

    // Delete from database
    const { error: deleteErr } = await supabase
      .from("waitlist_entries")
      .delete()
      .eq("id", waitlistId)

    if (deleteErr) return respond({ error: "Database delete failed" }, 500)

    await supabase.rpc("recalculate_waitlist_positions")

    return respond({ success: true })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers,
    })
  }
})
