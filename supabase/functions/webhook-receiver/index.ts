import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

const ALLOWED_METHODS = ["POST", "PUT", "PATCH"];
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const requestLog = new Map<string, { count: number; windowStart: number }>();

async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  const msg = new TextEncoder().encode(data);
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = requestLog.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestLog.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req: Request) => {
  if (!ALLOWED_METHODS.includes(req.method)) {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const path = new URL(req.url).pathname;
  const endpointName = path.split("/").pop() ?? "unknown";
  const startTime = Date.now();

  if (!checkRateLimit(endpointName)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
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

  const event = (body as Record<string, unknown>)?.event ?? "unknown";

  const { data: endpoints, error: queryError } = await supabase
    .from("webhook_endpoints")
    .select("*")
    .eq("name", endpointName)
    .eq("status", "active")
    .limit(1);

  if (queryError || !endpoints || endpoints.length === 0) {
    return new Response(JSON.stringify({ error: "No matching active endpoint" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const endpoint = endpoints[0];
  const deliveryId = crypto.randomUUID();

  const deliveryPayload = {
    id: deliveryId,
    endpoint_id: endpoint.id,
    event,
    payload: body,
    status: "delivering",
    request_body: JSON.stringify(body),
    created_at: new Date().toISOString(),
  };

  await supabase.from("webhook_deliveries").insert(deliveryPayload);

  let responseStatus = 200;
  let responseBody = "";
  let errorMsg: string | null = null;

  const bodyStr = JSON.stringify(body);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-ID": deliveryId,
    "X-Webhook-Event": event,
  };

  if (endpoint.secret) {
    headers["X-Webhook-Signature-256"] = await hmacSha256(endpoint.secret, bodyStr);
  }

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers,
      body: bodyStr,
    });
    responseStatus = response.status;
    responseBody = await response.text();
  } catch (err) {
    responseStatus = 502;
    errorMsg = err instanceof Error ? err.message : "Connection failed";
  }

  const duration = Date.now() - startTime;
  const finalStatus = responseStatus >= 200 && responseStatus < 300 ? "success" : "failed";

  await supabase
    .from("webhook_deliveries")
    .update({
      status: finalStatus,
      response_status: responseStatus,
      response_body: responseBody.slice(0, 2000),
      duration_ms: duration,
      error_message: errorMsg,
      retry_count: finalStatus === "failed" ? 1 : 0,
    })
    .eq("id", deliveryId);

  await supabase
    .from("webhook_endpoints")
    .update({
      last_triggered_at: new Date().toISOString(),
      failure_count: finalStatus === "failed"
        ? (endpoint.failure_count ?? 0) + 1
        : 0,
    })
    .eq("id", endpoint.id);

  return new Response(
    JSON.stringify({
      status: finalStatus,
      delivery_id: deliveryId,
      duration_ms: duration,
    }),
    {
      status: finalStatus === "success" ? 200 : 502,
      headers: { "Content-Type": "application/json" },
    },
  );
});
