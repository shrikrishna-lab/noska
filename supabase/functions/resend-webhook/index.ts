import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import { Webhook } from "npm:svix";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

const EVENT_MAP: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.identified": "identified",
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response(JSON.stringify({ error: "Missing svix headers" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");

  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown>;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const eventType = payload.type as string;
    const event = EVENT_MAP[eventType];
    if (!event) {
      return new Response(JSON.stringify({ ok: true, skipped: eventType }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = payload.data ?? ({} as Record<string, unknown>);
    const recipient = Array.isArray(data.to) ? data.to[0] : data.to ?? "";
    const record: Record<string, unknown> = {
      event,
      recipient,
      subject: (data as Record<string, unknown>).subject,
      message_id: (data as Record<string, unknown>).email_id,
      created_at: (data as Record<string, unknown>).created_at ?? new Date().toISOString(),
      raw_payload: payload,
    };

    await supabase.from("email_events").insert(record);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
