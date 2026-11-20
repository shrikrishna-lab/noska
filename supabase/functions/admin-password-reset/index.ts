import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const supabase = createClient(supabaseUrl, supabaseKey)

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "onboarding@resend.dev"
const APP_URL = Deno.env.get("APP_URL") ?? "http://127.0.0.1:5174"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info, baggage, traceparent, sentry-trace",
}

async function sendResetEmail(to: string, token: string, adminName: string) {
  if (!RESEND_API_KEY) {
    console.error("Resend not configured")
    return { error: "Resend not configured" }
  }

  const resetLink = `${APP_URL}/control/reset-password?token=${token}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Admin Password — Noska</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(102, 126, 234, 0.25);">
          <tr>
            <td style="padding: 48px 40px 40px 40px;">
              <div align="center">
                <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 8px 20px rgba(251, 191, 36, 0.4);">
                  <span style="color: #ffffff; font-size: 30px;">🔐</span>
                </div>
              </div>
              <h1 style="margin: 0 0 16px 0; color: #ffffff; font-size: 32px; font-weight: 800; text-align: center; letter-spacing: -0.5px;">Reset Your Admin Password</h1>
              <p style="margin: 0 0 32px 0; color: rgba(255,255,255,0.9); font-size: 16px; text-align: center; line-height: 1.6;">
                Hi <strong>${adminName}</strong>,<br>
                You requested a password reset for your Noska admin account. Click below to set a new password:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="border-radius: 14px;" bgcolor="#ffffff">
                          <a href="${resetLink}" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 700; text-align: center; text-decoration: none; color: #4f46e5; border-radius: 14px; mso-hide: all; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">Or copy and paste this link into your browser:</p>
                          <p style="margin: 0; word-break: break-all; color: #4f46e5; font-size: 13px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            <a href="${resetLink}" style="color: #4f46e5; text-decoration: underline;">${resetLink}</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px 40px 40px; border-top: 1px solid rgba(255,255,255,0.2);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.7); font-size: 13px; line-height: 1.5; font-weight: 600;">⏰ Link expires in 1 hour</p>
                    <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 13px; line-height: 1.5;">
                      If you didn't request this change, please ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-top: 24px;">
          <tr>
            <td align="center">
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                Noska Admin — Secure Control Panel
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: "Reset your Noska admin password",
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("Resend error:", res.status, err)
      return { error: `Resend API error: ${res.status}` }
    }

    return { success: true }
  } catch (err) {
    console.error("Failed to send reset email:", err)
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
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

  let body: { action?: string; email?: string; token?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }

  const { action, email, token, password } = body

  if (!action) {
    return new Response(JSON.stringify({ error: "Missing action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }

  // ── ACTION: request ──
  if (action === "request") {
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    // Call the RPC to generate/store the token
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "request_admin_password_reset",
      { p_email: email }
    )

    if (rpcError || !rpcData || !(rpcData as any).success) {
      const msg = (rpcData as any)?.error || rpcError?.message || "Failed to request reset"
      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    const resetToken = (rpcData as any).token

    // Get admin name for the email
    const { data: adminData } = await supabase
      .from("admin_users")
      .select("name")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    const adminName = (adminData as any)?.name || "Admin"

    // Send the reset email
    const emailResult = await sendResetEmail(email, resetToken, adminName)

    if (emailResult.error) {
      return new Response(
        JSON.stringify({ success: false, error: `Token created but email failed: ${emailResult.error}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: "Reset link sent to your email" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    )
  }

  // ── ACTION: reset ──
  if (action === "reset") {
    if (!token || !password) {
      return new Response(JSON.stringify({ error: "Token and password are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "reset_admin_password_with_token",
      { p_token: token, p_password: password }
    )

    if (rpcError || !rpcData || !(rpcData as any).success) {
      const msg = (rpcData as any)?.error || rpcError?.message || "Failed to reset password"
      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    )
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
    status: 400,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  })
})
