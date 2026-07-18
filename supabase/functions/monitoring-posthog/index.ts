import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminSession, handleCors, res, resError } from "../monitoring-utils/auth.ts";

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const allowed = await verifyAdminSession(req);
  if (!allowed) return resError("Unauthorized", 401);

  if (req.method !== "POST") return resError("Method not allowed", 405);

  const token = Deno.env.get("POSTHOG_PERSONAL_TOKEN");
  const projectId = Deno.env.get("POSTHOG_PROJECT_ID");
  const host = Deno.env.get("POSTHOG_HOST") ?? "https://us.posthog.com";
  if (!token || !projectId) return resError("PostHog not configured", 503);

  const body: { path?: string; date_from?: string; limit?: string } = {};
  try { Object.assign(body, await req.json()); } catch { /* ignore */ }

  const { path, date_from = "-7d", limit = "50" } = body;
  const base = `${host}/api/projects/${projectId}`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  try {
    if (path === "live-users") {
      const url = `${base}/insights/trend/?display=ActionsLineGraph&events=${encodeURIComponent('[{"id":"$pageview","name":"$pageview","type":"events","order":0}]')}&date_from=-24h&interval=hour`;
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const body = await r.text();
        return res({ liveUsers: 0, _debug: `PostHog ${r.status}: ${body.slice(0, 250)}` });
      }
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { data = null; }
      return res({ liveUsers: data?.result?.[0]?.data?.at?.(-1) ?? 0 });
    }

    if (path === "retention") {
      const url = `${base}/insights/retention/?display=RetentionTable&date_from=${date_from}`;
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const body = await r.text();
        return res({ _debug: `PostHog ${r.status}: ${body.slice(0, 250)}` });
      }
      return res(await r.json());
    }

    if (path === "session-recordings") {
      const url = `${base}/session_recordings/?date_from=${date_from}&limit=${limit}`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`PostHog API ${r.status}`);
      const data = await r.json();
      return res({ total: typeof data?.results?.length === "number" ? data.results.length : 0, hasMore: data?.has_next ?? false });
    }

    if (path === "feature-flags") {
      const url = `${base}/feature_flags/`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`PostHog API ${r.status}`);
      const data = await r.json();
      return res(data?.results ?? []);
    }

    return resError("Unknown path", 400);
  } catch (err) {
    return resError(err instanceof Error ? err.message : "Unknown error");
  }
});
