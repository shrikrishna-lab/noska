import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

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

  try {
    const payload = await req.json();
    const eventType = payload.type as string;
    const event = EVENT_MAP[eventType];
    if (!event) {
      return new Response(JSON.stringify({ ok: true, skipped: eventType }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = payload.data ?? {};
    const recipient = Array.isArray(data.to) ? data.to[0] : data.to ?? "";
    const record: Record<string, unknown> = {
      event,
      recipient,
      subject: data.subject,
      message_id: data.email_id,
      created_at: data.created_at ?? new Date().toISOString(),
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
