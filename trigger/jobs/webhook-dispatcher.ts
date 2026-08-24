/**
 * Noska Platform V5 — Webhook dispatcher (Trigger.dev cron, every minute).
 * Bridges the scheduled world to the webhook-dispatcher Edge Function, which
 * performs event fan-out + signed deliveries with retries (single implementation).
 */

import { client } from "../client";

client.defineJob({
  id: "webhook-dispatcher",
  name: "Platform V5 — webhook dispatcher",
  version: "1.0.0",
  trigger: { type: "cron", cron: "* * * * *" },
  run: async () => {
    const url = `${process.env.SUPABASE_URL}/functions/v1/webhook-dispatcher`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-runtime-secret": process.env.AGENT_RUNTIME_SECRET ?? "",
      },
      body: JSON.stringify({ action: "dispatch" }),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  },
});
