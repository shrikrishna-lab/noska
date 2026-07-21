import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const supabase = createClient(supabaseUrl, supabaseKey)

Deno.serve(async (_req: Request) => {
  try {
    const now = new Date().toISOString()

    // Expire invites that have passed their expiration date
    const { data: expired, error: fetchErr } = await supabase
      .from("waitlist_entries")
      .select("id, email")
      .eq("status", "invited")
      .lt("invite_expires_at", now)

    if (fetchErr) {
      console.error("Error fetching expired invites:", fetchErr)
      return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 })
    }

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ expired: 0 }), { status: 200 })
    }

    const ids = expired.map((e: Record<string, unknown>) => e.id)
    const emails = expired.map((e: Record<string, unknown>) => e.email)

    // Update waitlist_entries
    const { error: updateErr } = await supabase
      .from("waitlist_entries")
      .update({ status: "expired" })
      .in("id", ids)

    if (updateErr) {
      console.error("Error updating expired entries:", updateErr)
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 })
    }

    // Update approved_emails
    await supabase
      .from("approved_emails")
      .update({ status: "expired" })
      .in("email", emails)

    return new Response(JSON.stringify({ expired: ids.length }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), { status: 500 })
  }
})
