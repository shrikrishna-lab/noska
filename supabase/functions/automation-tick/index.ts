import { createClient } from "jsr:@supabase/supabase-js";
import {
  decideDue, nextSlotStrictlyAfter, scheduledRunIdempotencyKey,
  backoffDelayMs, isRetryableError, type ScheduleSpecLite,
} from "../_shared/runtime/serverContract.ts";

const BASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RUNTIME_SECRET = Deno.env.get("AGENT_RUNTIME_SECRET") ?? "";
const RUNTIME_URL = `${BASE_URL}/functions/v1/agent-runtime`;

const db = createClient(BASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type MissedPolicy = "run_immediately" | "skip" | "run_once_latest" | "catch_up";

interface AutomationRow {
  id: string;
  owner_id: string;
  name: string;
  status: string;
  trigger_config: { type?: string; schedule?: ScheduleSpecLite } | null;
  timezone: string | null;
  last_run_at: string | null;
  missed_policy: MissedPolicy | null;
  max_retries: number | null;
  timeout_ms: number | null;
}

interface RetryRunRow {
  id: string;
  user_id: string;
  source_id: string;
  name: string;
  attempt: number;
  max_retries: number;
  error_message: string | null;
  trigger_type: string;
  trigger_payload: Record<string, unknown>;
}

async function constantTimeEquals(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function expectedTickSecret(): Promise<string> {
  const { data, error } = await db.rpc("automation_tick_secret");
  if (error || data == null) return "";
  return typeof data === "string" ? data : String((data as { secret?: string }).secret ?? "");
}

async function invokeRuntime(payload: Record<string, unknown>): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(RUNTIME_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "x-agent-runtime-secret": RUNTIME_SECRET,
    },
    body: JSON.stringify(payload),
  });
  let body: Record<string, unknown> = {};
  try { body = await res.json(); } catch { body = { error: "non_json_response" }; }
  return { status: res.status, body };
}

async function processScheduled(now: Date) {
  const results = { evaluated: 0, due: 0, fired: 0, paused: 0, deduplicated: 0, failed: 0, notDue: 0 };

  const { data, error } = await db
    .from("automations")
    .select("id,owner_id,name,status,trigger_config,timezone,last_run_at,missed_policy,max_retries,timeout_ms")
    .eq("status", "active")
    .limit(500);

  if (error) {
    console.error("tick: automations query failed", error.message);
    return results;
  }

  const scheduledRows = ((data ?? []) as unknown as AutomationRow[])
    .filter(row => row.trigger_config?.type === "schedule" && Boolean(row.trigger_config?.schedule?.kind));

  for (const row of scheduledRows) {
    const spec = row.trigger_config?.schedule;
    if (!spec?.kind) continue;
    results.evaluated++;
    const tz = row.timezone || "UTC";
    const policy = (row.missed_policy || "run_once_latest") as MissedPolicy;

    try {
      const decision = decideDue(spec, {
        now,
        lastRunAt: row.last_run_at ? new Date(row.last_run_at) : null,
        tz,
        policy,
      });

      if (!decision.due) {
        results.notDue++;
        if (decision.skippedCount > 0) {
          await advanceNextRun(row.id, spec, now, tz);
          await notifyOwner(row.owner_id, `Automation "${row.name}" skipped`, `${decision.reason} per your missed-run policy.`);
        }
        continue;
      }

      results.due++;
      let latestConsumed: string | null = null;

      for (const slotIso of decision.slots.slice(0, 5)) {
        const idempotencyKey = scheduledRunIdempotencyKey(row.id, slotIso);

        await db
          .from("agent_runs")
          .delete()
          .eq("idempotency_key", idempotencyKey)
          .in("status", ["failed", "timed_out", "cancelled"]);

        const { data: existing } = await db
          .from("agent_runs")
          .select("id,status")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (existing) {
          results.deduplicated++;
          latestConsumed = slotIso;
          continue;
        }

        const invoke = await invokeRuntime({
          action: "execute",
          user_id: row.owner_id,
          source_kind: "automation",
          source_id: row.id,
          trigger_type: "schedule",
          trigger_payload: { scheduledFor: slotIso, reason: decision.reason },
          idempotency_key: idempotencyKey,
          scheduled_for: slotIso,
        });

        const ok = invoke.status >= 200 && invoke.status < 300;
        const paused = Boolean(invoke.body.pausedForApproval);
        const runtimeStatus = typeof invoke.body.status === "string" ? invoke.body.status : ok ? "completed" : "waiting_approval";

        if (ok || paused) {
          await markConsumed(row.id, slotIso, runtimeStatus, paused);
          latestConsumed = slotIso;
          if (paused) { results.paused++; await db.from("automations").update({ health: "waiting_approval" }).eq("id", row.id); }
          else results.fired++;
        } else {
          const message = `runtime_http_${invoke.status}: ${JSON.stringify(invoke.body).slice(0, 300)}`;
          const runId = crypto.randomUUID();
          await db.from("agent_runs").insert({
            id: runId, user_id: row.owner_id, source_kind: "automation", source_id: row.id,
            name: row.name, trigger_type: "schedule",
            trigger_payload: { scheduledFor: slotIso, reason: decision.reason },
            status: "failed", started_at: new Date().toISOString(),
            idempotency_key: idempotencyKey, scheduled_for: slotIso,
            max_retries: row.max_retries ?? 2, timeout_ms: row.timeout_ms ?? 180000,
            error_code: "execution_failed", error_message: message.slice(0, 500),
          });
          await handleFailure(runId, row, message);
          latestConsumed = slotIso;
          results.failed++;
        }
      }

      if (latestConsumed) {
        await db.from("automations").update({ last_run_at: latestConsumed }).eq("id", row.id);
        await advanceNextRun(row.id, spec, now, tz);
      } else {
        await advanceNextRun(row.id, spec, now, tz);
      }
    } catch (err) {
      console.error(`tick: automation ${row.id} failed`, err);
      results.failed++;
    }
  }

  return results;
}

async function markConsumed(automationId: string, slotIso: string, status: string, paused: boolean) {
  const patch: Record<string, unknown> = { last_run_at: slotIso };
  if (paused) patch.health = "waiting_approval";
  else if (status === "skipped") patch.last_status = "skipped";
  await db.from("automations").update(patch).eq("id", automationId);
}

async function advanceNextRun(automationId: string, spec: ScheduleSpecLite, now: Date, tz: string) {
  if (spec.kind === "interval") {
    const intervalMs = Math.max((spec.intervalMinutes || 15) * 60_000, 60_000);
    await db.from("automations").update({ next_run_at: new Date(now.getTime() + intervalMs).toISOString() }).eq("id", automationId);
    return;
  }
  const next = nextSlotStrictlyAfter(spec, now, tz);
  if (next) await db.from("automations").update({ next_run_at: next.toISOString() }).eq("id", automationId);
}

async function processRetries(now: Date) {
  const results = { retriesClaimed: 0, retriesFailed: 0 };
  const { data, error } = await db
    .from("agent_runs")
    .select("id,user_id,source_id,name,attempt,max_retries,error_message,trigger_type,trigger_payload")
    .eq("status", "waiting_retry")
    .lte("next_retry_at", now.toISOString())
    .limit(20);

  if (error) {
    console.error("tick: retry query failed", error.message);
    return results;
  }

  for (const run of (data ?? []) as unknown as RetryRunRow[]) {
    results.retriesClaimed++;
    await db.from("agent_runs").update({
      status: "running",
      started_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq("id", run.id).eq("status", "waiting_retry");

    try {
      await invokeRuntime({
        action: "execute",
        user_id: run.user_id,
        source_kind: "automation",
        source_id: run.source_id,
        trigger_type: run.trigger_type || "retry",
        trigger_payload: { ...(run.trigger_payload ?? {}), isRetry: true, attempt: run.attempt },
      });
    } catch (err) {
      results.retriesFailed++;
      console.error(`tick: retry ${run.id} invoke failed`, err);
    }
  }

  return results;
}

async function handleFailure(
  runId: string,
  automation: Pick<AutomationRow, "id" | "owner_id" | "name" | "max_retries">,
  errorMessage: string,
) {
  const { data: current } = await db.from("agent_runs").select("attempt").eq("id", runId).maybeSingle();
  const attempt = current?.attempt ?? 1;
  const maxRetries = automation.max_retries ?? 2;

  if (isRetryableError(errorMessage) && attempt <= maxRetries) {
    await db.from("agent_runs").update({
      status: "waiting_retry",
      attempt: attempt + 1,
      next_retry_at: new Date(Date.now() + backoffDelayMs(attempt - 1)).toISOString(),
      error_code: "execution_failed",
      error_message: errorMessage.slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq("id", runId);
    return;
  }

  const { data: auto } = await db.from("automations").select("failure_streak").eq("id", automation.id).maybeSingle();
  const streak = (auto?.failure_streak ?? 0) + 1;

  await db.from("agent_runs").update({
    status: "failed",
    completed_at: new Date().toISOString(),
    error_code: "execution_failed",
    error_message: errorMessage.slice(0, 500),
    failure_streak: streak,
    updated_at: new Date().toISOString(),
  }).eq("id", runId);

  await db.from("automations").update({
    failure_streak: streak,
    health: streak >= 3 ? "failing" : "warning",
    last_status: "failed",
  }).eq("id", automation.id);

  if (streak === 1 || streak % 5 === 0) {
    await notifyOwner(
      automation.owner_id,
      `Automation failing${streak > 1 ? ` (${streak} in a row)` : ""}`,
      `"${automation.name}": ${errorMessage.slice(0, 200)}`,
    );
  }
}

async function notifyOwner(userId: string, title: string, message: string) {
  await db.from("notifications").insert({
    user_id: userId,
    type: "ai_agent",
    title: title.slice(0, 120),
    message: message.slice(0, 500),
    category: "agent",
    source: "noska-agent-os",
    status: "unread",
    action_url: "/commandCenter",
  });
}

Deno.serve(async (request: Request) => {
  const expected = await expectedTickSecret();
  if (!expected || !RUNTIME_SECRET) {
    return Response.json({
      error: "tick_not_configured",
      db_secret_configured: Boolean(expected),
      runtime_secret_configured: Boolean(RUNTIME_SECRET),
    }, { status: 503 });
  }
  if (!await constantTimeEquals(request.headers.get("x-tick-secret") ?? "", expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const now = new Date();
  const scheduled = await processScheduled(now);
  const retried = await processRetries(now);
  return Response.json({ ok: true, at: now.toISOString(), scheduled, retried });
});
