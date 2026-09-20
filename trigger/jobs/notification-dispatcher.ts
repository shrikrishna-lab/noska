import { client } from "../client";

const WORKER_URL = `${process.env.SUPABASE_URL}/functions/v1/notification-worker`;
const WORKER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

client.defineJob({
  id: "notification-dispatcher",
  name: "Notifications — reminders and push delivery tick",
  version: "1.0.0",
  trigger: {
    type: "cron",
    cron: "*/5 * * * *",
  },
  run: async () => {
    if (!process.env.SUPABASE_URL || !WORKER_KEY) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${WORKER_KEY}` },
      body: JSON.stringify({ tick: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`notification-worker tick failed with HTTP ${res.status}`);
    const body = await res.json() as { reminders?: number; claimed?: number; sent?: number; deferred?: number; push_configured?: boolean };
    console.log(`[notification-dispatcher] reminders=${body.reminders} claimed=${body.claimed} sent=${body.sent} deferred=${body.deferred} push=${body.push_configured}`);
    return body;
  },
});
