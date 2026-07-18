import { createClient } from "jsr:@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

interface ServiceHealth {
  name: string;
  status: "operational" | "degraded" | "unknown";
  latency: number;
}

export async function monitor(action: string, _payload: Record<string, unknown>): Promise<unknown> {
  switch (action) {
    case "health": {
      const start = Date.now();
      const services: ServiceHealth[] = [];

      const checks = await Promise.allSettled([
        (async () => {
          const t = Date.now();
          await supabase.from("workspaces").select("id", { count: "exact", head: true });
          services.push({ name: "Supabase", status: "operational", latency: Date.now() - t });
        })(),
        (async () => {
          const t = Date.now();
          const r = await fetch("https://api.clerk.com/v1/users?limit=1", {
            headers: { Authorization: `Bearer ${Deno.env.get("CLERK_SECRET_KEY") ?? ""}` },
          });
          services.push({ name: "Clerk", status: r.ok ? "operational" : "degraded", latency: Date.now() - t });
        })(),
        (async () => {
          const t = Date.now();
          const token = Deno.env.get("SENTRY_AUTH_TOKEN");
          const org = Deno.env.get("SENTRY_ORG");
          const proj = Deno.env.get("SENTRY_PROJECT");
          if (!token || !org || !proj) { services.push({ name: "Sentry", status: "unknown", latency: 0 }); return; }
          const r = await fetch(`https://sentry.io/api/0/projects/${org}/${proj}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          services.push({ name: "Sentry", status: r.ok ? "operational" : "degraded", latency: Date.now() - t });
        })(),
        (async () => {
          const t = Date.now();
          const token = Deno.env.get("RESEND_API_KEY");
          if (!token) { services.push({ name: "Resend", status: "unknown", latency: 0 }); return; }
          const r = await fetch("https://api.resend.com/emails?limit=1", {
            headers: { Authorization: `Bearer ${token}` },
          });
          services.push({ name: "Resend", status: r.ok ? "operational" : "degraded", latency: Date.now() - t });
        })(),
        (async () => {
          const t = Date.now();
          const token = Deno.env.get("POSTHOG_PERSONAL_TOKEN");
          const projectId = Deno.env.get("POSTHOG_PROJECT_ID");
          const host = Deno.env.get("POSTHOG_HOST") ?? "https://us.posthog.com";
          if (!token || !projectId) { services.push({ name: "PostHog", status: "unknown", latency: 0 }); return; }
          const url = `${host}/api/projects/${projectId}/insights/trend/?display=ActionsLineGraph&events=${encodeURIComponent('[{"id":"$pageview","name":"$pageview","type":"events","order":0}]')}&date_from=-24h&interval=hour`;
          const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          services.push({ name: "PostHog", status: r.ok ? "operational" : "degraded", latency: Date.now() - t });
        })(),
        (async () => {
          const t = Date.now();
          const token = Deno.env.get("VERCEL_TOKEN");
          const projectId = Deno.env.get("VERCEL_PROJECT_ID");
          if (!token || !projectId) { services.push({ name: "Vercel", status: "unknown", latency: 0 }); return; }
          const r = await fetch(`https://api.vercel.com/v1/deployments?projectId=${projectId}&limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          services.push({ name: "Vercel", status: r.ok ? "operational" : "degraded", latency: Date.now() - t });
        })(),
      ]);

      return { services, elapsed: Date.now() - start };
    }

    case "overview":
      return {
        usersOnline: 0,
        todayUsers: await supabase.rpc("get_total_users_count").then((r) => r.data ?? 0).catch(() => 0),
        workspaces: await supabase.from("workspaces").select("id", { count: "exact", head: true }).then((r) => r.count ?? 0).catch(() => 0),
        pages: await supabase.from("pages").select("id", { count: "exact", head: true }).then((r) => r.count ?? 0).catch(() => 0),
        errors: 0,
        storage: 0,
        apiLatency: 0,
      };

    default:
      throw new Error(`Unknown monitor action: ${action}`);
  }
}
