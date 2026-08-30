import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const supabase = createClient(supabaseUrl, supabaseKey)

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "onboarding@resend.dev"
const NOTIFY_EMAIL = Deno.env.get("NOTIFY_EMAIL") ?? "hello@noska.me"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // baggage/traceparent/sentry-trace are auto-injected by PostHog/Sentry
  // browser SDKs into every fetch — rejecting them breaks preflight in prod.
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info, baggage, traceparent, sentry-trace",
}

async function sendNotification(name: string, email: string, company: string, employees: string, message: string | null) {
  if (!RESEND_API_KEY) return

  const html = `<div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
    <h2 style="margin-top: 0; color: #7c3aed;">New Demo Request</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 0; color: #6b7280;">Name</td><td style="padding: 8px 0;"><strong>${name}</strong></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0;"><strong>${email}</strong></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Company</td><td style="padding: 8px 0;"><strong>${company}</strong></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Size</td><td style="padding: 8px 0;"><strong>${employees} employees</strong></td></tr>
      ${message ? `<tr><td style="padding: 8px 0; color: #6b7280;">Message</td><td style="padding: 8px 0;"><strong>${message}</strong></td></tr>` : ""}
    </table>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="color: #6b7280; font-size: 13px;">View in admin: <a href="https://noska.me/control/demo-requests" style="color: #7c3aed;">noska.me/control/demo-requests</a></p>
  </div>`

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `Demo Request: ${name} from ${company}`,
        html,
      }),
    })
  } catch {}
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

  let body: { name?: string; email?: string; company?: string; employees?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }

  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase()
  const company = body.company?.trim()
  const employees = body.employees?.trim() || "100-500"
  const message = body.message?.trim() || null

  if (!name || !email || !company) {
    return new Response(JSON.stringify({ error: "Name, email, and company are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }

  const { data: existing } = await supabase
    .from("demo_requests")
    .select("id, status")
    .eq("email", email)
    .maybeSingle()

  if (existing) {
    return new Response(JSON.stringify({ error: "A demo request for this email already exists." }), {
      status: 409,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }

  const { error: dbError } = await supabase
    .from("demo_requests")
    .insert({
      name,
      email,
      company,
      employees,
      message,
      status: "new",
      created_at: new Date().toISOString(),
    })

  if (dbError) {
    console.error("Failed to insert demo request:", dbError)
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }

  await sendNotification(name, email, company, employees, message)

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  })
})
