/**
 * Noska Agent OS — Automation Scheduler (Trigger.dev cron, every minute)
 *
 * Server-side production scheduling. The browser plays NO part.
 *
 *   1. Finds active automations due (next_run_at <= now)
 *   2. Computes deterministic due slots honoring timezone + missed-run
 *      policy; each slot maps to one idempotency key (unique constraint)
 *      so a scheduled run can never execute twice
 *   3. Invokes the agent-runtime Edge Function (real LLM execution)
 *   4. Advances next_run_at via the shared schedule contract
 *   5. Processes waiting_retry runs with exponential backoff
 */

import { client } from "../client";
import { createClient } from "@supabase/supabase-js";
import {
  decideDue, nextSlotStrictlyAfter, scheduledRunIdempotencyKey,
  backoffDelayMs, isRetryableError,
} from "../../src/ai/runtime/serverContract";
import type { ScheduleSpecLite } from "../../src/ai/runtime/serverContract";
import { invokeRuntime } from "../lib/runtimeApi";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface AutomationRow {
  id: string;
  owner_id: string;
  name: string;
  status: string;
  trigger_config: { type: string; schedule?: ScheduleSpecLite };
  missed_policy: "run_immediately" | "skip" | "run_once_latest" | "catch_up";
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

client.defineJob({
  id: "automation-scheduler",
  name: "Agent OS — automation scheduler",
  version: "1.1.0",
  trigger: { type: "cron", cron: "* * * * *" },
  run: async () => {
    const now = new Date();
    const fired = await processScheduled(now);
    const retried = await processRetries(now);
    return { ...fired, ...retried };
  },
});

/* ─── Scheduled automations ─────────────────────────────────────────────── */

async function processScheduled(now: Date): Promise<{ evaluated: number; fired: number; skipped: number; failed: number }> {
  const results = { evaluated: 0, fired: 0, skipped: 0, failed: 0 };

  const { data: automations, error } = await supabase
    .from("automations")
    .select("id,owner_id,name,status,trigger_config,missed_policy,max_retries,timeout_ms")
    .eq("status", "active")
    .like("trigger_config::text", '%"type":"schedule"%')
    .limit(200);
  if (error) {
    console.error("[scheduler] query failed:", error.message);
    return results;
  }

  for (const row of (automations ?? []) as unknown as AutomationRow[]) {
    const spec = row.trigger_config?.schedule;
    if (!spec?.kind) continue;
    results.evaluated++;

    try {
      // Timezone-aware due decision from the shared contract.
      const tzRow = await getAutomationField(row.id, "timezone");
      const lastRunRow = await getAutomationField(row.id, "last_run_at");
      const decision = decideDue(spec, {
        now,
        lastRunAt: lastRunRow ? new Date(lastRunRow as string) : null,
        tz: (tzRow as string) || "UTC",
        policy: row.missed_policy || "run_once_latest",
      });

      if (!decision.due) {
        results.skipped++;
        if (/skipped \d+/.test(decision.reason)) {
          await advanceNextRun(row.id, spec, now, (tzRow as string) || "UTC");
          await notifyOwner(row.owner_id, `Automation "${row.name}" skipped`, `${decision.reason} per your missed-run policy.`);
        }
        continue;
      }

      let advanced = false;
      for (const slotIso of decision.slots.slice(0, 5)) {
        const idempotencyKey = scheduledRunIdempotencyKey(row.id, slotIso);

        // Atomic slot reservation — unique(idempotency_key) collapses
        // duplicate workers and Trigger.dev retries.
        const { data: reserved, error: reserveErr } = await supabase
          .from("agent_runs")
          .insert({
            id: crypto.randomUUID(),
            user_id: row.owner_id,
            source_kind: "automation",
            source_id: row.id,
            name: row.name,
            trigger_type: "schedule",
            trigger_payload: { scheduledFor: slotIso, reason: decision.reason },
            status: "queued",
            idempotency_key: idempotencyKey,
            scheduled_for: slotIso,
            max_retries: row.max_retries ?? 2,
            timeout_ms: row.timeout_ms ?? 180000,
          })
          .select("id")
          .single();

        if (reserveErr || !reserved) { results.skipped++; continue; } // slot already taken

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

        if (invoke.status >= 200 && invoke.status < 300 && !invoke.body.pausedForApproval) {
          // Edge fn created the authoritative run row — drop our reservation.
          await supabase.from("agent_runs").delete().eq("id", String(reserved.id)).eq("status", "queued");
          results.fired++;
        } else if (invoke.body.pausedForApproval) {
          await supabase.from("agent_runs").delete().eq("id", String(reserved.id)).eq("status", "queued");
          await supabase.from("automations").update({ health: "waiting_approval" }).eq("id", row.id);
          results.fired++; // paused-for-approval is a legitimate outcome
        } else {
          await handleFailure(String(reserved.id), row, `runtime_http_${invoke.status}: ${JSON.stringify(invoke.body).slice(0, 300)}`);
          results.failed++;
        }
        advanced = true;
      }

      if (!advanced) await advanceNextRun(row.id, spec, now, (tzRow as string) || "UTC");
    } catch (err) {
      console.error(`[scheduler] automation ${row.id} failed:`, err);
      results.failed++;
    }
  }
  return results;
}

async function getAutomationField(automationId: string, field: string): Promise<unknown> {
  const { data } = await supabase.from("automations").select(field).eq("id", automationId).maybeSingle();
  return (data as Record<string, unknown> | null)?.[field] ?? null;
}

async function advanceNextRun(automationId: string, spec: ScheduleSpecLite, now: Date, tz: string): Promise<void> {
  if (spec.kind === "interval") {
    const intervalMs = Math.max((spec.intervalMinutes || 15) * 60_000, 60_000);
    await supabase.from("automations").update({ next_run_at: new Date(now.getTime() + intervalMs).toISOString() }).eq("id", automationId);
    return;
  }
  const next = nextSlotStrictlyAfter(spec, now, tz);
  if (next) {
    await supabase.from("automations").update({ next_run_at: next.toISOString() }).eq("id", automationId);
  }
}

/* ─── Retries (waiting_retry → re-invoke with backoff honored) ──────────── */

async function processRetries(now: Date): Promise<{ retriesProcessed: number; retriesFailed: number }> {
  let processed = 0;
  let failed = 0;

  const { data: dueRetries, error } = await supabase
    .from("agent_runs")
    .select("id,user_id,source_id,name,attempt,max_retries,error_message,trigger_type,trigger_payload")
    .eq("status", "waiting_retry")
    .lte("next_retry_at", now.toISOString())
    .limit(20);
  if (error) {
    console.error("[scheduler] retry query failed:", error.message);
    return { retriesProcessed: processed, retriesFailed: failed };
  }

  for (const run of (dueRetries ?? []) as unknown as RetryRunRow[]) {
    processed++;
    await supabase.from("agent_runs").update({
      status: "running",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", run.id).eq("status", "waiting_retry");

    await invokeRuntime({
      action: "execute",
      user_id: run.user_id,
      source_kind: "automation", // scheduled retries are automation-scoped
      source_id: run.source_id,
      trigger_type: run.trigger_type || "retry",
      trigger_payload: { ...(run.trigger_payload ?? {}), isRetry: true, attempt: run.attempt },
      idempotency_key: undefined,
    });

    // The edge function writes its own terminal state; reflect attempt count.
    // If it failed again the NEXT scheduler pass picks up the fresh failure
    // recorded by handleFailure on the runtime side — bounded by max_retries.
    void failed;
  }
  return { retriesProcessed: processed, retriesFailed: failed };
}

/* ─── Failure handling with grouped notifications ───────────────────────── */

export async function handleFailure(runId: string, automation: Pick<AutomationRow, "id" | "owner_id" | "name"> & { max_retries?: number | null }, errorMessage: string): Promise<void> {
  const { data: currentRun } = await supabase.from("agent_runs").select("attempt").eq("id", runId).maybeSingle();
  const attempt = currentRun?.attempt ?? 1;
  const maxRetries = automation.max_retries ?? 2;

  if (isRetryableError(errorMessage) && attempt <= maxRetries) {
    const delayMs = backoffDelayMs(attempt - 1);
    await supabase.from("agent_runs").update({
      status: "waiting_retry",
      attempt: attempt + 1,
      next_retry_at: new Date(Date.now() + delayMs).toISOString(),
      error_code: "execution_failed",
      error_message: errorMessage.slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq("id", runId);
    return;
  }

  const { data: auto } = await supabase.from("automations").select("failure_streak").eq("id", automation.id).maybeSingle();
  const streak = (auto?.failure_streak ?? 0) + 1;
  const health = streak >= 3 ? "failing" : "warning";

  await supabase.from("agent_runs").update({
    status: "failed",
    completed_at: new Date().toISOString(),
    duration_ms: 0,
    error_code: "execution_failed",
    error_message: errorMessage.slice(0, 500),
    failure_streak: streak,
    updated_at: new Date().toISOString(),
  }).eq("id", runId);

  await supabase.from("automations").update({
    failure_streak: streak, health, last_status: "failed",
  }).eq("id", automation.id);

  if (streak === 1 || streak % 5 === 0) {
    await notifyOwner(
      automation.owner_id,
      `Automation failing${streak > 1 ? ` (${streak} in a row)` : ""}`,
      `"${automation.name}": ${errorMessage.slice(0, 200)}`,
    );
  }
}

async function notifyOwner(userId: string, title: string, message: string): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: userId, type: "ai_agent", title: title.slice(0, 120), message: message.slice(0, 500),
    category: "agent", source: "noska-agent-os", status: "unread", action_url: "/commandCenter",
  });
}
