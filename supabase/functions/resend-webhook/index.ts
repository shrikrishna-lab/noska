import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import { createHmac } from "node:crypto";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

function verifyResendSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expected = hmac.digest("hex");
    return signature === expected;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("svix-signature") ?? req.headers.get("Resend-Signature") ?? "";
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");

  if (secret && !verifyResendSignature(rawBody, signature, secret)) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { type?: string; data?: Record<string, unknown> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventType = body.type ?? "unknown";
  const eventData = body.data ?? {};
  const recipient = (eventData.to as string) ?? (eventData.email as string) ?? null;
  const subject = (eventData.subject as string) ?? null;
  const messageId = (eventData.id as string) ?? (eventData.message_id as string) ?? null;

  const { error } = await supabase.from("email_events").insert({
    event: eventType,
    recipient,
    subject,
    message_id: messageId,
    raw_payload: body,
  });

  if (error) {
    console.error("[resend-webhook] insert error:", error);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
