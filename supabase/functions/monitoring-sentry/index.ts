import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminSession, handleCors, res, resError } from "../monitoring-utils/auth.ts";

interface SentryIssue {
  id: string; title: string; level: string; status: string;
  count: number; userCount: number; lastSeen: string; firstSeen: string;
  permalink: string; project: string;
}

interface SentryRelease {
  version: string; dateReleased: string | null; dateCreated: string;
  projects: Array<{ name: string }>;
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const allowed = await verifyAdminSession(req);
  if (!allowed) return resError("Unauthorized", 401);

  if (req.method !== "POST") return resError("Method not allowed", 405);

  const authToken = Deno.env.get("SENTRY_AUTH_TOKEN");
  const org = Deno.env.get("SENTRY_ORG");
  const project = Deno.env.get("SENTRY_PROJECT");
  if (!authToken || !org || !project) return resError("Sentry not configured", 503);

  const body: { path?: string; statsPeriod?: string; limit?: string } = {};
  try { Object.assign(body, await req.json()); } catch { /* ignore */ }

  const { path, statsPeriod = "24h", limit = "10" } = body;
  const base = "https://sentry.io/api/0";
  const headers = { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" };

  try {
    if (path === "issues") {
      const url = `${base}/projects/${org}/${project}/issues/?statsPeriod=${statsPeriod}&query=is:unresolved&limit=50`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`Sentry API ${r.status}`);
      const issues: Array<Record<string, unknown>> = await r.json();
      return res(issues.map((i) => ({
        id: i.id, title: i.title, level: i.level, status: i.status,
        count: i.count, userCount: i.userCount, lastSeen: i.lastSeen,
        firstSeen: i.firstSeen, permalink: i.permalink,
        project: (i.project as Record<string, unknown>)?.name ?? project,
      })));
    }

    if (path === "issue-counts") {
      const [unresolvedRes, newRes, resolvedRes] = await Promise.all([
        fetch(`${base}/projects/${org}/${project}/stats/?stat=received&since=${Date.now() / 1000 - 86400}`, { headers }),
        fetch(`${base}/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=24h&limit=1`, { headers }),
        fetch(`${base}/projects/${org}/${project}/issues/?query=is:resolved&statsPeriod=24h&limit=1`, { headers }),
      ]);

      const unresolvedStats = unresolvedRes.ok ? await unresolvedRes.json() : [];
      const resolvedCount = resolvedRes.ok ? await resolvedRes.json() : [];
      const newCount = resolvedRes.ok ? await newRes.json() : [];

      return res({
        total: unresolvedStats.length > 0 ? (unresolvedStats as number[][]).reduce((a: number, b: number[]) => a + (b[1] ?? 0), 0) : 0,
        resolved: Array.isArray(resolvedCount) ? resolvedCount.length : 0,
        newCount: Array.isArray(newCount) ? newCount.length : 0,
      });
    }

    if (path === "releases") {
      const url = `${base}/projects/${org}/${project}/releases/?limit=${limit}`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`Sentry API ${r.status}`);
      const releases: SentryRelease[] = await r.json();
      return res(releases.map((r) => ({
        version: r.version, dateCreated: r.dateCreated,
        projects: r.projects,
      })));
    }

    return resError("Unknown path", 400);
  } catch (err) {
    return resError(err instanceof Error ? err.message : "Unknown error");
  }
});
