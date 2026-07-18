export async function posthogAnalytics(action: string, payload: Record<string, unknown>): Promise<unknown> {
  const token = Deno.env.get("POSTHOG_PERSONAL_TOKEN");
  const projectId = Deno.env.get("POSTHOG_PROJECT_ID");
  const host = Deno.env.get("POSTHOG_HOST") ?? "https://us.posthog.com";
  if (!token || !projectId) throw new Error("PostHog not configured");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const base = `${host}/api/projects/${projectId}`;

  switch (action) {
    case "live-users": {
      const url = `${base}/insights/trend/?display=ActionsLineGraph&events=${encodeURIComponent('[{"id":"$pageview","name":"$pageview","type":"events","order":0}]')}&date_from=-24h&interval=hour`;
      const r = await fetch(url, { headers });
      if (!r.ok) return { liveUsers: 0 };
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { data = null; }
      return { liveUsers: data?.result?.[0]?.data?.at?.(-1) ?? 0 };
    }

    case "retention": {
      const url = `${base}/insights/retention/?display=RetentionTable&date_from=${String(payload.date_from ?? "-7d")}`;
      const r = await fetch(url, { headers });
      return r.ok ? r.json() : { error: `PostHog ${r.status}` };
    }

    case "session-recordings": {
      const url = `${base}/session_recordings/?date_from=${String(payload.date_from ?? "-7d")}&limit=${String(payload.limit ?? "50")}`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`PostHog API ${r.status}`);
      const data = await r.json();
      return { total: typeof data?.results?.length === "number" ? data.results.length : 0, hasMore: data?.has_next ?? false };
    }

    case "feature-flags": {
      const r = await fetch(`${base}/feature_flags/`, { headers });
      if (!r.ok) throw new Error(`PostHog API ${r.status}`);
      const data = await r.json();
      return data?.results ?? [];
    }

    default:
      throw new Error(`Unknown analytics action: ${action}`);
  }
}
