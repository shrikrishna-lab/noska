import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const supabase = createClient(supabaseUrl, supabaseKey)

function generateCode(): string {
  // Unambiguous alphabet (no 0/O/1/I) so codes read correctly from emails.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
}

async function clerkApi(path: string, method: string, body?: unknown): Promise<Response | null> {
  const key = Deno.env.get("CLERK_SECRET_KEY")
  if (!key) return null
  return fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
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

    const authHeader = req.headers.get("Authorization") ?? ""
    const sessionToken = authHeader.replace(/^Bearer\s+/i, "").trim()
    if (!sessionToken) return respond({ error: "Unauthorized" }, 401)

    const { data: adminId, error: authErr } = await supabase.rpc("require_admin_role", {
      p_token: sessionToken,
      p_min_role: "support",
    })
    if (authErr) return respond({ error: "Forbidden" }, 403)
    const approvedBy = typeof adminId === "string" && adminId ? adminId : null

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
    const now = new Date().toISOString()
    // www host is canonical — the apex (noska.me) only 308-redirects to it.
    const appUrl = Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.noska.me"
    const inviteUrl = `${appUrl}/invite/${inviteCode}`
    const redirectUrl = `${appUrl}/sso-callback`

    let clerkInvitationId: string | null = null
    let clerkInvitationUrl: string | null = null

    const clerkRes = await clerkApi("/invitations", "POST", {
      email_address: entry.email,
      redirect_url: redirectUrl,
    })
    if (clerkRes && clerkRes.ok) {
      const clerkData = await clerkRes.json()
      clerkInvitationId = clerkData.id ?? null
      clerkInvitationUrl = clerkData.url ?? null
    } else {
      if (clerkRes) {
        console.error("Clerk invitation failed:", clerkRes.status, await clerkRes.text().catch(() => ""))
      }
    }

    const { error: updateErr } = await supabase
      .from("waitlist_entries")
      .update({
        status: "invited",
        invite_sent: true,
        invite_code: inviteCode,
        approved_at: now,
        approved_by: approvedBy,
        email_status: "pending",
        email_queued_at: now,
        ...(clerkInvitationId ? { clerk_entry_id: clerkInvitationId } : {}),
      })
      .eq("id", waitlistId)

    if (updateErr) return respond({ error: "Failed to update entry" }, 500)

    await supabase
      .from("approved_emails")
      .upsert({
        email: entry.email,
        waitlist_entry_id: waitlistId,
        invite_sent: true,
        status: "invited",
      }, { onConflict: "email" })

    const config = await getResendConfig()
    let emailSent = false
    let emailError: string | null = null

    if (!config.apiKey) {
      emailError = "No email provider configured — set RESEND_API_KEY as a function secret or add resend_api_key in Admin → Settings → Email. The invite link below can be shared manually."
      console.error("[approve-waitlist] email skipped:", emailError)
    } else {
      const html = `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-top: 0;">You're in! Welcome to Noska 🎉</h2>
        <p>Hey ${entry.name},</p>
        <p>Great news — you've been approved from the waitlist! You can now create your account and start using Noska.</p>
        <p style="margin: 24px 0;"><strong>Your invite code:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${inviteCode}</code></p>
        <p style="margin: 0 0 24px; color: #6b7280; font-size: 13px;">Or enter this code at ${appUrl}/code</p>
        <a href="${clerkInvitationUrl ?? inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Accept Invitation</a>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">If you didn't sign up for Noska, you can ignore this email.</p>
      </div>`

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
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

        if (emailRes.ok) {
          emailSent = true
        } else {
          const errBody = await emailRes.text().catch(() => "")
          console.error("[approve-waitlist] Resend error:", emailRes.status, errBody)
          let reason = `Resend returned ${emailRes.status}`
          try {
            const parsed = JSON.parse(errBody) as { message?: string; name?: string }
            if (parsed?.message) reason = parsed.message
          } catch { /* keep status-line reason */ }
          if (config.fromEmail.endsWith("@resend.dev") && emailRes.status === 403) {
            reason += " — resend.dev senders can only email your own account address. Verify a domain in Resend and set from_email in Admin → Settings → Email."
          }
          emailError = reason
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : "Unknown error contacting Resend"
        console.error("[approve-waitlist] Resend request threw:", err)
      }
    }

    // Reflect the real delivery attempt on the row so the admin table stops
    // showing a permanent "Queued" for mail that never went out.
    const finalEmailStatus = emailSent ? "sent" : config.apiKey ? "failed" : "pending"
    await supabase
      .from("waitlist_entries")
      .update({
        email_status: finalEmailStatus,
        ...(emailSent ? { email_sent_at: new Date().toISOString() } : {}),
      })
      .eq("id", waitlistId)

    // Best-effort: persist the failure reason when the email_error column
    // exists (see migration 20260907000001). Never blocks approval.
    if (emailError) {
      const { error: emailErrWriteError } = await supabase
        .from("waitlist_entries")
        .update({ email_error: emailError })
        .eq("id", waitlistId)
      if (emailErrWriteError) console.warn("[approve-waitlist] email_error column not present; reason only returned to admin UI")
    }

    return respond({
      success: true,
      invite_code: inviteCode,
      invite_url: inviteUrl,
      email_sent: emailSent,
      email_error: emailError,
      clerk_invitation_id: clerkInvitationId,
      clerk_invitation_url: clerkInvitationUrl,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers,
    })
  }
})
