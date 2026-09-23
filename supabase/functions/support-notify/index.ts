import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import { buildTicketConfirmEmail } from "./email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

// Best-effort per-instance throttle (the DB once-lease is the real guard).
const lastHit = new Map<string, number>();

async function getResendSettings(db: ReturnType<typeof createClient>): Promise<{
  apiKey: string;
  fromEmail: string;
}> {
  const envKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const envFrom = Deno.env.get("FROM_EMAIL") ?? "";
  if (envKey && envFrom) return { apiKey: envKey, fromEmail: envFrom };
  try {
    const { data } = await db
      .from("platform_settings")
      .select("key, value")
      .in("key", ["resend_api_key", "from_email"]);
    const map: Record<string, string> = {};
    if (data) {
      for (const row of data as Array<{ key: string; value: unknown }>) {
        map[row.key] = String(row.value ?? "");
      }
    }
    return {
      apiKey: map.resend_api_key || envKey,
      fromEmail: map.from_email || envFrom || "onboarding@resend.dev",
    };
  } catch {
    return { apiKey: envKey, fromEmail: envFrom || "onboarding@resend.dev" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { ticket_number, email } = (body ?? {}) as { ticket_number?: unknown; email?: unknown };
  if (typeof ticket_number !== "string" || typeof email !== "string" || !ticket_number || !email) {
    return json({ error: "ticket_number and email are required" }, 400);
  }

  const throttleKey = `${ticket_number}:${email}`.toLowerCase();
  const now = Date.now();
  const prev = lastHit.get(throttleKey);
  if (prev && now - prev < 30_000) return json({ error: "Too many requests" }, 429);
  lastHit.set(throttleKey, now);

  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Claim the one-time send lease (exact match, replay-proof).
  const { data: lease, error: leaseErr } = await db.rpc("support_claim_confirm_email", {
    p_ticket_number: ticket_number,
    p_email: email,
  });
  if (leaseErr) {
    const msg = leaseErr.message || "";
    if (msg.includes("NOT_FOUND")) return json({ error: "Ticket not found" }, 404);
    if (msg.includes("ALREADY_SENT")) return json({ already_sent: true }, 200);
    if (msg.includes("INVALID_")) return json({ error: "Invalid ticket number or email" }, 400);
    return json({ error: "Could not verify ticket" }, 500);
  }
  const details = lease as { id: string; ticket_number: string; email: string; user_name: string; subject: string };

  const settings = await getResendSettings(db);
  if (!settings.apiKey) {
    // Release the lease so a retry works once email is configured.
    await db.from("support_tickets").update({ confirm_email_sent_at: null }).eq("id", details.id);
    return json({ error: "Email delivery is not configured" }, 500);
  }

  const mail = buildTicketConfirmEmail(details);
  let messageId: string | null = null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: settings.fromEmail,
        to: details.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { message?: string }).message || `Resend error ${res.status}`);
    messageId = (data as { id?: string }).id ?? null;
  } catch (err) {
    await db.from("support_tickets").update({ confirm_email_sent_at: null }).eq("id", details.id);
    return json({ error: err instanceof Error ? err.message : "Email send failed" }, 502);
  }

  try {
    await db.from("email_events").insert({
      event: "support_ticket_confirm",
      recipient: details.email,
      subject: mail.subject,
      message_id: messageId,
      raw_payload: { ticket_id: details.id, ticket_number: details.ticket_number },
    });
  } catch {
    // Logging must never break the send path.
  }

  return json({ sent: true, id: messageId });
});
