import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface AdminInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

function hashToken(token: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = crypto.subtle.digestSync("SHA-512", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function validateAdmin(token: string): Promise<AdminInfo | null> {
  try {
    const { data, error } = await supabase.rpc("validate_admin_session", { p_token: token });
    if (error || !data) return null;
    if (typeof data === "object" && data !== null) {
      return { id: data.id, name: data.name, email: data.email, role: data.role };
    }
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return { id: parsed.id, name: parsed.name, email: parsed.email, role: parsed.role };
      } catch { return null; }
    }
    return null;
  } catch { return null; }
}

const ROLE_RANK: Record<string, number> = { marketing: 1, support: 2, developer: 3, admin: 4, super_admin: 5 };
const MIN_ROLES: Record<string, string> = {
  send_single: "support",
  send_campaign: "marketing",
  send_broadcast: "admin",
  send_invite: "support",
};

function hasMinRole(adminRole: string, minRole: string): boolean {
  return (ROLE_RANK[adminRole] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}

const RATE_LIMIT_CACHE = new Map<string, number>();

function checkRateLimit(adminId: string, action: string): { allowed: boolean; reason?: string } {
  if (action === "send_single") {
    // 10 test emails per hour per admin
    // Skipping in-memory tracking for simplicity; DB tracking would be better
    return { allowed: true };
  }
  if (action === "send_campaign" || action === "send_broadcast") {
    const key = `campaign_${adminId}`;
    const last = RATE_LIMIT_CACHE.get(key);
    if (last && Date.now() - last < 60000) {
      return { allowed: false, reason: "Rate limit: max 1 campaign/broadcast per minute" };
    }
    RATE_LIMIT_CACHE.set(key, Date.now());
    return { allowed: true };
  }
  return { allowed: true };
}

async function getSettings(): Promise<{ apiKey: string; fromEmail: string }> {
  const envKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const envFrom = Deno.env.get("FROM_EMAIL") ?? "";
  if (envKey && envFrom) return { apiKey: envKey, fromEmail: envFrom };

  try {
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["resend_api_key", "from_email"]);
    const map: Record<string, string> = {};
    if (data) for (const row of data) map[row.key] = String(row.value ?? "");
    return {
      apiKey: map.resend_api_key || envKey,
      fromEmail: map.from_email || envFrom || "onboarding@resend.dev",
    };
  } catch {
    return { apiKey: envKey, fromEmail: envFrom || "onboarding@resend.dev" };
  }
}

interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  bcc?: string[];
}

interface SendBulkPayload {
  campaign_id: string;
  campaign_name: string;
  recipients: Array<{ email: string; name?: string }>;
  subject: string;
  html: string;
  text?: string;
}

interface BroadcastPayload {
  broadcast_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "announcement" | "alert";
  target_users?: Array<{ email: string; name?: string }> | null;
  target_type: "all" | "random" | "selected" | "per_user";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing Authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized: empty token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const admin = await validateAdmin(token);
    if (!admin) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid or expired admin session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { action, ...payload } = body as Record<string, unknown>;
    if (!action || typeof action !== "string") {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const minRole = MIN_ROLES[action] ?? "admin";
    if (!hasMinRole(admin.role, minRole)) {
      return new Response(JSON.stringify({
        error: `Forbidden: role "${admin.role}" cannot perform action "${action}" (requires "${minRole}")`,
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rateCheck = checkRateLimit(admin.id, action);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: rateCheck.reason }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const settings = await getSettings();
    if (!settings.apiKey) {
      return new Response(JSON.stringify({ error: "Resend API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "send_single":
        return await handleSendSingle(payload as unknown as SendEmailPayload, settings);
      case "send_campaign":
        return await handleSendCampaign(payload as unknown as SendBulkPayload, settings);
      case "send_broadcast":
        return await handleSendBroadcast(payload as unknown as BroadcastPayload, settings);
      case "send_invite":
        return await handleSendInvite(payload as unknown as { waitlist_id: string; name: string; email: string }, settings);
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Failed to process request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function handleSendSingle(payload: SendEmailPayload, settings: { apiKey: string; fromEmail: string }): Promise<Response> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: settings.fromEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || undefined,
      bcc: payload.bcc || undefined,
    }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleSendCampaign(payload: SendBulkPayload, settings: { apiKey: string; fromEmail: string }): Promise<Response> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (const recipient of payload.recipients) {
    try {
      const personalHtml = payload.html
        .replace(/{{name}}/g, recipient.name || "Valued User")
        .replace(/{{email}}/g, recipient.email);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: settings.fromEmail,
          to: recipient.email,
          subject: payload.subject,
          html: personalHtml,
          text: payload.text || undefined,
        }),
      });

      if (res.ok) {
        results.sent++;
      } else {
        results.failed++;
        const errData = await res.json().catch(() => ({}));
        results.errors.push(`${recipient.email}: ${errData.message || res.status}`);
      }
    } catch (err) {
      results.failed++;
      results.errors.push(`${recipient.email}: ${err instanceof Error ? err.message : "Network error"}`);
    }
  }

  await supabase
    .from("email_campaigns")
    .update({
      sent: results.sent,
      sent_at: new Date().toISOString(),
      status: results.failed > 0 ? "sending" : "sent",
    })
    .eq("id", payload.campaign_id);

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleSendBroadcast(payload: BroadcastPayload, settings: { apiKey: string; fromEmail: string }): Promise<Response> {
  const now = new Date().toISOString();
  let users: Array<{ email: string; name?: string }> = [];

  if (payload.target_type === "all") {
    const { data } = await supabase
      .from("user_profiles")
      .select("email, user_name")
      .not("email", "is", null);
    if (data) users = data.map((u) => ({ email: u.email!, name: u.user_name }));
  } else if (payload.target_users) {
    users = payload.target_users;
  }

  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (const user of users) {
    try {
      const html = `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-top: 0;">${payload.title}</h2>
        <p>${payload.message.replace(/\n/g, "<br>")}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">You are receiving this because you use Noska.</p>
      </div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: settings.fromEmail,
          to: user.email,
          subject: payload.title,
          html: html,
        }),
      });

      if (res.ok) {
        results.sent++;
      } else {
        results.failed++;
      }
    } catch {
      results.failed++;
    }
  }

  await supabase
    .from("admin_broadcasts")
    .update({
      sent_count: results.sent,
      total_count: users.length,
      status: results.failed > 0 && results.sent === 0 ? "cancelled" : "sent",
      updated_at: now,
    })
    .eq("id", payload.broadcast_id);

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleSendInvite(payload: { waitlist_id: string; name: string; email: string }, settings: { apiKey: string; fromEmail: string }): Promise<Response> {
  const { data: entry, error: entryErr } = await supabase
    .from("waitlist_entries")
    .select("id, name, email, invite_code")
    .eq("id", payload.waitlist_id)
    .single();

  if (entryErr || !entry) {
    return new Response(JSON.stringify({ error: "Waitlist entry not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let inviteCode: string = entry.invite_code ?? "";
  if (!inviteCode) {
    // Generate server-side so the emailed code always matches the stored one.
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    inviteCode = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    const { error: codeErr } = await supabase
      .from("waitlist_entries")
      .update({ invite_code: inviteCode })
      .eq("id", payload.waitlist_id);
    if (codeErr) {
      return new Response(JSON.stringify({ error: "Failed to assign invite code" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // www host is canonical — the apex (noska.me) only 308-redirects to it.
  const appUrl = Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.noska.me";
  const inviteUrl = `${appUrl}/invite/${inviteCode}`;
  const html = `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="margin-top: 0;">You're invited to Noska!</h2>
    <p>Hey ${entry.name},</p>
    <p>You've been invited to join Noska — the intelligent workspace for teams.</p>
    <p style="margin: 24px 0;"><strong>Your invite code:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${inviteCode}</code></p>
    <p style="margin: 0 0 24px; color: #6b7280; font-size: 13px;">Or enter this code at ${appUrl}/code</p>
    <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Accept Invite</a>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="color: #6b7280; font-size: 12px;">If you didn't sign up, you can ignore this email.</p>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: settings.fromEmail,
      to: entry.email,
      subject: "You're invited to Noska!",
      html,
    }),
  });

  const data = await res.json();

  if (res.ok) {
    await supabase
      .from("waitlist_entries")
      .update({ invite_sent: true, status: "invited", email_status: "sent", email_sent_at: new Date().toISOString() })
      .eq("id", payload.waitlist_id);
  } else {
    console.error("[send-email:send_invite] Resend error:", res.status, JSON.stringify(data).slice(0, 500));
    await supabase
      .from("waitlist_entries")
      .update({ email_status: "failed" })
      .eq("id", payload.waitlist_id);
  }

  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
