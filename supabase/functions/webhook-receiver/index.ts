import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

const ALLOWED_METHODS = ["POST", "PUT", "PATCH"];

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

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-ID": deliveryId,
        "X-Webhook-Event": event,
        ...(endpoint.secret ? { "X-Webhook-Signature": endpoint.secret } : {}),
      },
      body: JSON.stringify(body),
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
