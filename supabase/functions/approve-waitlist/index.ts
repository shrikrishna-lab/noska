import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const supabase = createClient(supabaseUrl, supabaseKey)

function generateCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

async function getResendConfig(): Promise<{ apiKey: string; fromEmail: string }> {
  const envKey = Deno.env.get("RESEND_API_KEY") ?? ""
  const envFrom = Deno.env.get("FROM_EMAIL") ?? ""
  if (envKey && envFrom) return { apiKey: envKey, fromEmail: envFrom }
  try {
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["resend_api_key", "from_email"])
    const map: Record<string, string> = {}
    if (data) for (const row of data) map[row.key] = String(row.value ?? "")
    return {
      apiKey: map.resend_api_key || envKey,
      fromEmail: map.from_email || envFrom || "onboarding@resend.dev",
    }
  } catch {
    return { apiKey: envKey, fromEmail: envFrom || "onboarding@resend.dev" }
  }
}

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

    const body = await req.json()
    const waitlistId = body.waitlist_id as string | undefined
    const adminName = body.admin_name as string | undefined

    if (!waitlistId) return respond({ error: "waitlist_id is required" }, 400)

    const { data: entry, error: fetchErr } = await supabase
      .from("waitlist_entries")
      .select("id, name, email, status")
      .eq("id", waitlistId)
      .single()

    if (fetchErr || !entry) return respond({ error: "Waitlist entry not found" }, 404)
    if (entry.status === "invited" || entry.status === "accepted") {
      return respond({ error: "Already approved" }, 409)
    }

    const inviteCode = generateCode()

    const { error: updateErr } = await supabase
      .from("waitlist_entries")
      .update({
        status: "invited",
        invite_sent: true,
        invite_code: inviteCode,
        approved_at: new Date().toISOString(),
      })
      .eq("id", waitlistId)

    if (updateErr) return respond({ error: "Failed to update entry" }, 500)

    await supabase
      .from("approved_emails")
      .upsert({
        email: entry.email,
        waitlist_entry_id: waitlistId,
        invite_sent: true,
      }, { onConflict: "email" })

    const config = await getResendConfig()
    if (config.apiKey) {
      const html = `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-top: 0;">You're in! Welcome to Noska 🎉</h2>
        <p>Hey ${entry.name},</p>
        <p>Great news — you've been approved from the waitlist! You can now create your account and start using Noska.</p>
        <p style="margin: 24px 0;"><strong>Your invite code:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${inviteCode}</code></p>
        <a href="https://noska.dev/login" style="display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Create Account</a>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">If you didn't sign up for Noska, you can ignore this email.</p>
      </div>`

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.fromEmail,
          to: entry.email,
          subject: "You're approved for Noska! 🎉",
          html,
          click_tracking: true,
          open_tracking: true,
        }),
      })
    }

    return respond({ success: true, invite_code: inviteCode })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers,
    })
  }
})
