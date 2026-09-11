import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminSession, handleCors, res, resError } from "../monitoring-utils/auth.ts";

// PostHog personal API tokens no longer have access to the legacy /insights/*
// endpoints — every analytical route here goes through the query API with
// HogQL instead (POST /api/projects/{id}/query/).

interface QueryResult {
  results: unknown[][];
  columns?: string[];
}

async function hogql(
  base: string,
  headers: HeadersInit,
  query: string,
): Promise<QueryResult> {
  const r = await fetch(`${base}/query/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: { kind: "HogQLQuery", query },
      refresh: "blocking",
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`PostHog query ${r.status}: ${body.slice(0, 300)}`);
  }
  return (await r.json()) as QueryResult;
}

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
      const data = await hogql(
        base,
        headers,
        `SELECT count(DISTINCT distinct_id) FROM events
         WHERE event = '$pageview' AND timestamp > now() - INTERVAL 5 MINUTE`,
      );
      return res({ liveUsers: Number(data.results?.[0]?.[0] ?? 0) });
    }

    if (path === "web-vitals") {
      // p75 is Google's Core Web Vitals assessment percentile; averages kept
      // alongside for trend context.
      const data = await hogql(
        base,
        headers,
        `SELECT
           quantile(0.75)(toFloatOrNull(properties."$web_vitals_LCP")),
           quantile(0.75)(toFloatOrNull(properties."$web_vitals_FCP")),
           quantile(0.75)(toFloatOrNull(properties."$web_vitals_INP")),
           quantile(0.75)(toFloatOrNull(properties."$web_vitals_TTFB")),
           quantile(0.75)(toFloatOrNull(properties."$web_vitals_CLS")),
           avg(toFloatOrNull(properties."$web_vitals_LCP")),
           avg(toFloatOrNull(properties."$web_vitals_FCP")),
           avg(toFloatOrNull(properties."$web_vitals_INP")),
           avg(toFloatOrNull(properties."$web_vitals_TTFB")),
           avg(toFloatOrNull(properties."$web_vitals_CLS")),
           count()
         FROM events
         WHERE event = '$web_vitals' AND timestamp > now() - INTERVAL 24 HOUR`,
      );
      const row = data.results?.[0] ?? [];
      const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
      return res({
        lcp: { p75: Math.round(n(row[0])), avg: Math.round(n(row[5])) },
        fcp: { p75: Math.round(n(row[1])), avg: Math.round(n(row[6])) },
        inp: { p75: Math.round(n(row[2])), avg: Math.round(n(row[7])) },
        ttfb: { p75: Math.round(n(row[3])), avg: Math.round(n(row[8])) },
        cls: { p75: Math.round(n(row[4]) * 100) / 100, avg: Math.round(n(row[9]) * 100) / 100 },
        samples: n(row[10]),
      });
    }

    if (path === "session-analytics") {
      const [sessionsData, pagesData, countriesData, browsersData, devicesData, returningData] =
        await Promise.all([
          hogql(
            base,
            headers,
            `SELECT properties."$session_id" AS sid,
                    dateDiff('second', min(timestamp), max(timestamp)) AS duration_s,
                    count() AS pageviews
             FROM events
             WHERE event = '$pageview' AND timestamp > now() - INTERVAL 24 HOUR
             GROUP BY sid LIMIT 5000`,
          ),
          hogql(
            base,
            headers,
            `SELECT properties."$pathname" AS path, count() AS views
             FROM events
             WHERE event = '$pageview' AND timestamp > now() - INTERVAL 24 HOUR
             GROUP BY path ORDER BY views DESC LIMIT 10`,
          ),
          hogql(
            base,
            headers,
            `SELECT coalesce(nullIf(properties."$geoip_country_name", ''), 'Unknown') AS country,
                    count(DISTINCT distinct_id) AS users
             FROM events
             WHERE event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY
             GROUP BY country ORDER BY users DESC LIMIT 10`,
          ),
          hogql(
            base,
            headers,
            `SELECT coalesce(nullIf(properties."$browser", ''), 'Unknown') AS browser,
                    count(DISTINCT distinct_id) AS users
             FROM events
             WHERE event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY
             GROUP BY browser ORDER BY users DESC LIMIT 10`,
          ),
          hogql(
            base,
            headers,
            `SELECT coalesce(nullIf(properties."$device_type", ''), 'Unknown') AS device,
                    count(DISTINCT distinct_id) AS users
             FROM events
             WHERE event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY
             GROUP BY device ORDER BY users DESC LIMIT 10`,
          ),
          hogql(
            base,
            headers,
            `SELECT count(DISTINCT distinct_id) FROM events
             WHERE event = '$pageview' AND timestamp > now() - INTERVAL 1 DAY
               AND distinct_id IN (
                 SELECT DISTINCT distinct_id FROM events
                 WHERE event = '$pageview'
                   AND timestamp <= now() - INTERVAL 1 DAY
                   AND timestamp > now() - INTERVAL 8 DAY
               )`,
          ),
        ]);

      const sessionRows = sessionsData.results ?? [];
      const durations = sessionRows.map((r) => Number(r[1]) || 0).filter((d) => d >= 0);
      const bounceRate =
        sessionRows.length > 0
          ? Math.round((sessionRows.filter((r) => Number(r[2]) <= 1).length / sessionRows.length) * 100)
          : 0;

      return res({
        todaySessions: sessionRows.length,
        avgSessionDuration:
          durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : 0,
        bounceRate,
        returningUsers: Number(returningData.results?.[0]?.[0] ?? 0),
        topPages: (pagesData.results ?? []).map((r) => ({
          path: String(r[0] ?? "/"),
          views: Number(r[1] ?? 0),
        })),
        topCountries: (countriesData.results ?? []).map((r) => ({
          country: String(r[0] ?? "Unknown"),
          count: Number(r[1] ?? 0),
        })),
        topBrowsers: (browsersData.results ?? []).map((r) => ({
          browser: String(r[0] ?? "Unknown"),
          count: Number(r[1] ?? 0),
        })),
        topDevices: (devicesData.results ?? []).map((r) => ({
          device: String(r[0] ?? "Unknown"),
          count: Number(r[1] ?? 0),
        })),
      });
    }

    if (path === "retention") {
      // Share of users active in the last 7 days who were also active 7-14 days ago.
      const data = await hogql(
        base,
        headers,
        `SELECT
           countIf(recent > 0 AND prior > 0),
           countIf(prior > 0)
         FROM (
           SELECT distinct_id,
                  countIf(timestamp > now() - INTERVAL 7 DAY) AS recent,
                  countIf(timestamp <= now() - INTERVAL 7 DAY AND timestamp > now() - INTERVAL 14 DAY) AS prior
           FROM events
           WHERE event = '$pageview' AND timestamp > now() - INTERVAL 14 DAY
           GROUP BY distinct_id
         )`,
      );
      const row = data.results?.[0] ?? [];
      const returned = Number(row[0] ?? 0);
      const priorUsers = Number(row[1] ?? 0);
      return res({
        retention: priorUsers > 0 ? Math.round((returned / priorUsers) * 100) : 0,
        returnedUsers: returned,
        priorUsers,
      });
    }

    if (path === "session-recordings") {
      const url = `${base}/session_recordings/?date_from=${date_from}&limit=${limit}`;
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const errBody = await r.text();
        throw new Error(`PostHog API ${r.status}: ${errBody.slice(0, 200)}`);
      }
      const data = await r.json();
      return res({ total: typeof data?.results?.length === "number" ? data.results.length : 0, hasMore: data?.has_next ?? false });
    }

    if (path === "feature-flags") {
      const url = `${base}/feature_flags/`;
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const errBody = await r.text();
        throw new Error(`PostHog API ${r.status}: ${errBody.slice(0, 200)}`);
      }
      const data = await r.json();
      return res(data?.results ?? []);
    }

    return resError("Unknown path", 400);
  } catch (err) {
    return resError(err instanceof Error ? err.message : "Unknown error");
  }
});
