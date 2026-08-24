/**
 * Noska Agent OS — Event Dispatcher (Trigger.dev cron, every minute)
 *
 * Drains the agent_event_queue table populated by Postgres triggers on the
 * pages table (page_created / page_updated / page_trashed / title_changed /
 * task_completed), matches active event-triggered automations and agents,
 * and invokes the agent-runtime Edge Function with per-event idempotency
 * keys so webhook/worker retries never double-fire.
 */

import { client } from "../client";
import { createClient } from "@supabase/supabase-js";
import { eventRunIdempotencyKey } from "../../src/ai/runtime/serverContract";
import { invokeRuntime } from "../lib/runtimeApi";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface QueueEvent {
  id: string;
  user_id: string;
  event_type: string;
  page_id: string | null;
  page_title: string | null;
  block_id: string | null;
  block_text: string | null;
}

interface Triggerable {
  id: string;
  owner_id: string;
  name: string;
  kind: "agent" | "automation";
  trigger_config: { type: string; scopePageId?: string | null };
}

client.defineJob({
  id: "agent-event-dispatcher",
  name: "Agent OS — server-side event dispatcher",
  version: "1.0.0",
  trigger: { type: "cron", cron: "* * * * *" },
  run: async () => {
    const results = { drained: 0, matched: 0, fired: 0, failed: 0 };

    // Claim a bounded batch of pending events (oldest first).
    const { data: events, error } = await supabase
      .from("agent_event_queue")
      .select("id,user_id,event_type,page_id,page_title,block_id,block_text")
      .is("processed_at", null)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) {
      console.error("[event-dispatcher] drain query failed:", error.message);
      return { error: error.message };
    }
    if (!events || events.length === 0) return results;

    // Load triggerable definitions once (agents + automations, event types only).
    const [agentsRes, automationsRes] = await Promise.all([
      supabase.from("agents").select("id,owner_id,name,status,trigger_config").eq("status", "active").limit(500),
      supabase.from("automations").select("id,owner_id,name,status,trigger_config").eq("status", "active").limit(500),
    ]);

    const triggerables: Triggerable[] = [
      ...((agentsRes.data ?? []).map((a: Record<string, unknown>) => ({ ...(a as unknown as Triggerable), kind: "agent" as const }))),
      ...((automationsRes.data ?? []).map((a: Record<string, unknown>) => ({ ...(a as unknown as Triggerable), kind: "automation" as const }))),
    ];

    for (const evt of events as unknown as QueueEvent[]) {
      results.drained++;

      // Mark processed FIRST (at-most-once dispatch); failures are recorded
      // but the event is not redelivered — retries of this job are safe.
      const { error: markErr } = await supabase
        .from("agent_event_queue")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", evt.id)
        .is("processed_at", null);
      if (markErr) {
        console.error("[event-dispatcher] claim failed:", markErr.message);
        continue;
      }

      const payload = {
        pageId: evt.page_id,
        pageTitle: evt.page_title,
        blockId: evt.block_id,
        blockText: evt.block_text,
      };

      for (const t of triggerables) {
        if (t.owner_id !== evt.user_id) continue;
        const triggerType = t.trigger_config?.type;
        if (!triggerType || triggerType !== evt.event_type) continue;

        // Optional scope restriction to one page subtree root.
        const scope = t.trigger_config?.scopePageId;
        if (scope && scope !== evt.page_id) continue;

        results.matched++;
        const idempotencyKey = eventRunIdempotencyKey(`${t.kind}:${t.id}`, evt.id);

        const invoke = await invokeRuntime({
          action: "execute",
          user_id: evt.user_id,
          source_kind: t.kind,
          source_id: t.id,
          trigger_type: evt.event_type,
          trigger_payload: payload,
          idempotency_key: idempotencyKey,
        });

        if (invoke.status >= 200 && invoke.status < 300) results.fired++;
        else {
          results.failed++;
          console.error(`[event-dispatcher] ${t.kind}/${t.id} failed:`, JSON.stringify(invoke.body).slice(0, 300));
          await notifyOwner(evt.user_id, `${t.kind === "agent" ? "Agent" : "Automation"} "${t.name}" failed`, `Triggered by ${evt.event_type}. ${JSON.stringify(invoke.body).slice(0, 180)}`);
        }
      }
    }

    return results;
  },
});

async function notifyOwner(userId: string, title: string, message: string): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: userId, type: "ai_agent", title: title.slice(0, 120), message: message.slice(0, 500),
    category: "agent", source: "noska-agent-os", status: "unread", action_url: "/commandCenter",
  });
}
