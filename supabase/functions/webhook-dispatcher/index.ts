// ============================================================================
// Noska Platform V5 — Webhook Dispatcher (Edge Function)
//
// Drains the canonical event bus into signed webhook deliveries:
//
//   noska_events ──► fan-out (per matching endpoint, idempotent)
//                        │
//                        ▼
//              noska_webhook_deliveries (pending, backoff schedule)
//                        │
//                        ▼
//              signed POST ──► delivered / retried / dead
//
// Signature: HMAC-SHA256 over `${timestamp}.${body}`, header
//   X-Noska-Signature: sha256=<hex>  (+ X-Noska-Event-Id, X-Noska-Timestamp).
// Receivers verify by hashing their stored signing secret the same way.
//
// Invoke: supabase functions deploy webhook-dispatcher --no-verify-jwt
// Auth:   x-agent-runtime-secret (shared worker secret) — server-only.
// Cron:   trigger/jobs/webhook-dispatcher.ts calls this every minute.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const RUNTIME_SECRET = Deno.env.get("AGENT_RUNTIME_SECRET") ?? "";
const MAX_FAILURES_BEFORE_DISABLE = 20;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface EventRow {
  id: string;
  user_id: string;
  workspace_id: string;
  type: string;
  entity: string;
  entity_id: string;
  actor: string;
  data: Record<string, unknown>;
  created_at: string;
}

interface EndpointRow {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret_encrypted: string;
  status: string;
  failure_count: number;
}

interface DeliveryRow {
  id: string;
  endpoint_id: string;
  event_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  attempt: number;
  max_attempts: number;
  next_attempt_at: string;
}

/* AES-GCM secret decryption — mirrors _shared/core/runtime.ts. */
async function decryptSecret(blob: string): Promise<string> {
  const encKey = Deno.env.get("WEBHOOK_ENCRYPTION_KEY") ?? Deno.env.get("AGENT_ENCRYPTION_KEY") ?? "";
  if (!encKey) throw new Error("WEBHOOK_ENCRYPTION_KEY not configured");
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(encKey));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const bytes = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return new TextDecoder().decode(pt);
}

/* ─── Step 1: fan out recent events to subscribed endpoints ─── */

async function fanOut(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 3600_000).toISOString(); // 7-day window
  const { data: recentEvents } = await db.from("noska_events")
    .select("*").gte("created_at", cutoff).order("created_at").limit(500);
  if (!recentEvents?.length) return 0;

  const { data: endpoints } = await db.from("noska_webhook_endpoints")
    .select("id,user_id,url,events,secret_encrypted,status,failure_count")
    .eq("status", "active");
  if (!endpoints?.length) return 0;

  let enqueued = 0;
  for (const endpoint of endpoints as unknown as EndpointRow[]) {
    const subscribed = new Set(Array.isArray(endpoint.events) ? endpoint.events : []);
    for (const ev of recentEvents as unknown as EventRow[]) {
      if (ev.user_id !== endpoint.user_id) continue; // isolation
      if (!subscribed.has(ev.type)) continue;
      const body = {
        event_id: ev.id,
        event_type: ev.type,
        timestamp: ev.created_at,
        workspace_id: ev.workspace_id ?? "",
        actor: ev.actor,
        entity: ev.entity,
        entity_id: ev.entity_id ?? "",
        data: ev.data ?? {},
      };
      const { error } = await db.from("noska_webhook_deliveries").upsert({
        endpoint_id: endpoint.id,
        event_id: ev.id,
        event_type: ev.type,
        payload: body,
        attempt: 0,
        max_attempts: 5,
        status: "pending",
        next_attempt_at: new Date().toISOString(),
      }, { onConflict: "endpoint_id,event_id" });
      if (!error) enqueued++;
    }
  }
  return enqueued;
}

/* ─── Step 2: deliver due pending deliveries with retries/backoff ─── */

async function deliverDue(): Promise<{ attempted: number; delivered: number; failed: number }> {
  const stats = { attempted: 0, delivered: 0, failed: 0 };
  const nowIso = new Date().toISOString();

  const { data: due } = await db.from("noska_webhook_deliveries")
    .select("id,endpoint_id,event_id,event_type,payload,attempt,max_attempts,next_attempt_at")
    .eq("status", "pending").lte("next_attempt_at", nowIso).limit(100);
  if (!due?.length) return stats;

  // Cache decrypted secrets per endpoint for this pass.
  const secrets = new Map<string, string>();

  for (const d of due as unknown as DeliveryRow[]) {
    stats.attempted++;
    let endpoint: EndpointRow | null = null;
    const { data: ep } = await db.from("noska_webhook_endpoints").select("*").eq("id", d.endpoint_id).maybeSingle();
    endpoint = (ep as unknown as EndpointRow) ?? null;
    if (!endpoint || endpoint.status !== "active") {
      await db.from("noska_webhook_deliveries").update({ status: "failed", error: "endpoint inactive" }).eq("id", d.id);
      continue;
    }

    let rawSecret = secrets.get(endpoint.id);
    if (!rawSecret) {
      try {
        rawSecret = await decryptSecret(endpoint.secret_encrypted);
        secrets.set(endpoint.id, rawSecret);
      } catch (err) {
        await db.from("noska_webhook_deliveries").update({
          status: "failed", error: `secret_decrypt_failed`, next_attempt_at: new Date(Date.now() + 3_600_000).toISOString(),
        }).eq("id", d.id);
        console.error("[webhook-dispatcher]", err instanceof Error ? err.message : err);
        continue;
      }
    }

    const body = JSON.stringify(d.payload);
    const timestamp = new Date().toISOString();
    const signature = `sha256=${await hmacHex(rawSecret, `${timestamp}.${body}`)}`;

    let responseStatus: number | null = null;
    let errText: string | null = null;
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Noska-Webhooks/1.0",
          "X-Noska-Event-Id": String(d.event_id ?? ""),
          "X-Noska-Event-Type": d.event_type,
          "X-Noska-Timestamp": timestamp,
          "X-Noska-Signature": signature,
          "X-Noska-Delivery": d.id,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      responseStatus = res.status;
      if (!res.ok) errText = `endpoint responded ${res.status}`;
    } catch (e) {
      errText = e instanceof Error ? e.message.slice(0, 300) : "delivery failed";
    }

    const ok = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;
    const attempt = d.attempt + 1;

    if (ok) {
      stats.delivered++;
      await db.from("noska_webhook_deliveries").update({
        status: "delivered", attempt, response_status: responseStatus,
        delivered_at: new Date().toISOString(), error: null,
      }).eq("id", d.id);
      await db.from("noska_webhook_endpoints").update({
        failure_count: 0, last_delivery_at: new Date().toISOString(),
      }).eq("id", endpoint.id);
    } else {
      stats.failed++;
      const dead = attempt >= d.max_attempts;
      const delaysMs = [60_000, 300_000, 1_800_000, 7_200_000, 21_600_000];
      const delay = delaysMs[Math.min(attempt - 1, delaysMs.length - 1)];
      await db.from("noska_webhook_deliveries").update({
        status: dead ? "dead" : "pending",
        attempt,
        response_status: responseStatus,
        error: errText,
        next_attempt_at: new Date(Date.now() + delay).toISOString(),
      }).eq("id", d.id);

      const failures = (endpoint.failure_count ?? 0) + 1;
      await db.from("noska_webhook_endpoints").update({
        failure_count: failures,
        last_delivery_at: new Date().toISOString(),
        ...(failures >= MAX_FAILURES_BEFORE_DISABLE ? { status: "disabled" } : {}),
      }).eq("id", endpoint.id);
    }
  }
  return stats;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!RUNTIME_SECRET || req.headers.get("x-agent-runtime-secret") !== RUNTIME_SECRET) {
    return json({ error: "worker_auth_failed" }, 401);
  }

  try {
    const enqueued = await fanOut();
    const delivery = await deliverDue();
    return json({ ok: true, enqueued, ...delivery });
  } catch (err) {
    console.error("[webhook-dispatcher] unhandled:", err);
    return json({ error: "internal" }, 500);
  }
});
