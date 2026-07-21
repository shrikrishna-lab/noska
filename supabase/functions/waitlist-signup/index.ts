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
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }

  let body: { email?: string; name?: string; ref?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }

  const name = body.name?.trim() || email.split("@")[0]
  const referralCode = body.ref?.trim()?.toUpperCase()

  let clerkEntryId: string | null = null
  if (CLERK_SECRET_KEY) {
    try {
      const res = await fetch(`${CLERK_API}/waitlist_entries`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email_address: email }),
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

  // Resolve referral code to referrer
  let referrerId: string | null = null
  if (referralCode) {
    const { data: refEntry } = await supabase
      .from("waitlist_entries")
      .select("id, referral_count")
      .eq("invite_code", referralCode)
      .maybeSingle()
    if (refEntry) {
      referrerId = refEntry.id as string
      // Bump referrer's referral_count
      await supabase
        .from("waitlist_entries")
        .update({ referral_count: ((refEntry.referral_count as number) || 0) + 1 })
        .eq("id", referrerId)
    }
  }

  const upsertData: Record<string, unknown> = {
    name,
    email,
    provider: "clerk",
    status: "waiting",
    country: null,
    joined_at: new Date().toISOString(),
    referral_count: 0,
    invite_sent: false,
    accepted: false,
  }
  if (clerkEntryId) upsertData.clerk_entry_id = clerkEntryId
  if (referrerId) upsertData.referrer_id = referrerId

  const { error: dbError } = await supabase
    .from("waitlist_entries")
    .upsert(upsertData, { onConflict: "email" })

  if (dbError) {
    console.error("Failed to insert waitlist entry:", dbError)
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }

  return new Response(JSON.stringify({ success: true, clerk_entry_id: clerkEntryId }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  })
})
