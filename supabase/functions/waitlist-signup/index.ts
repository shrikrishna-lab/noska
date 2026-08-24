import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const supabase = createClient(supabaseUrl, supabaseKey)

const CLERK_API = "https://api.clerk.com/v1"
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY") ?? ""

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // baggage/traceparent/sentry-trace are auto-injected by PostHog/Sentry
  // browser SDKs into every fetch — rejecting them breaks preflight in prod.
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, baggage, traceparent, sentry-trace",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders })

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let body: { email?: string; name?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const name = body.name?.trim() || email.split("@")[0]

  let clerkEntryId: string | null = null
  if (CLERK_SECRET_KEY) {
    try {
      const res = await fetch(`${CLERK_API}/waitlist_entries`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        const data = await res.json()
        clerkEntryId = data.id
      } else {
        const err = await res.text()
        console.error("Clerk waitlist API error:", res.status, err)
      }
    } catch (err) {
      console.error("Failed to call Clerk waitlist API:", err)
    }
  }

  const { data: entryRows, error: dbError } = await supabase
    .from("waitlist_entries")
    .upsert({
      name,
      email,
      provider: "clerk",
      status: "waiting",
      country: null,
      joined_at: new Date().toISOString(),
      referral_count: 0,
      invite_sent: false,
      accepted: false,
    }, { onConflict: "email" })
    .select("id, position, invite_code")

  if (dbError) {
    console.error("Failed to insert waitlist entry:", dbError)
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const entry = Array.isArray(entryRows) ? entryRows[0] : null

  return new Response(JSON.stringify({
    success: true,
    clerk_entry_id: clerkEntryId,
    position: entry?.position ?? null,
    invite_code: entry?.invite_code ?? null,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
