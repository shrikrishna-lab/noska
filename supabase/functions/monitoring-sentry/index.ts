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

async function sentryFetch(
  base: string,
  headers: HeadersInit,
  path: string,
): Promise<unknown> {
  const r = await fetch(`${base}${path}`, { headers });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Sentry API ${r.status}: ${body.slice(0, 250)}`);
  }
  return r.json();
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
    if (path === "config-check") {
      // Operational diagnostics: lists the orgs/projects the token can
      // actually reach so a bad SENTRY_ORG/SENTRY_PROJECT slug is obvious.
      const orgs = (await sentryFetch(base, headers, "/organizations/")) as Array<{ slug: string; name: string; status?: unknown }>;
      let projects: Array<{ slug: string; name: string }> | { error: string } = [];
      try {
        projects = (await sentryFetch(base, headers, `/organizations/${org}/projects/`)) as Array<{ slug: string; name: string }>;
      } catch (e) {
        projects = { error: e instanceof Error ? e.message : "unknown" };
      }
      return res({
        configuredOrg: org,
        configuredProject: project,
        accessibleOrgs: orgs.map((o) => ({ slug: o.slug, name: o.name })),
        orgProjects: projects,
      });
    }

    if (path === "issues") {
      const issues = (await sentryFetch(
        base,
        headers,
        `/projects/${org}/${project}/issues/?statsPeriod=${statsPeriod}&query=is:unresolved&limit=50&sort=freq`,
      )) as Array<Record<string, unknown>>;
      return res(issues.map((i) => ({
        id: i.id, title: i.title, level: i.level, status: i.status,
        count: i.count, userCount: i.userCount, lastSeen: i.lastSeen,
        firstSeen: i.firstSeen, permalink: i.permalink,
        project: (i.project as Record<string, unknown>)?.name ?? project,
      })));
    }

    if (path === "issue-counts") {
      const since = new Date(Date.now() - 86400000).toISOString();
      const [unresolved, resolved] = await Promise.all([
        sentryFetch(
          base,
          headers,
          `/projects/${org}/${project}/issues/?statsPeriod=24h&query=is:unresolved&limit=100`,
        ) as Promise<Array<Record<string, unknown>>>,
        sentryFetch(
          base,
          headers,
          `/projects/${org}/${project}/issues/?statsPeriod=24h&query=is:resolved&limit=100`,
        ).catch(() => [] as Array<Record<string, unknown>>),
      ]);

      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      let total = 0;
      let fatal = 0;
      let error = 0;
      let warning = 0;
      let info = 0;
      let newCount = 0;
      for (const issue of unresolved) {
        const events = num(issue.count);
        total += events;
        const level = String(issue.level ?? "error").toLowerCase();
        if (level === "fatal") fatal += events;
        else if (level === "error" || level === "exception") error += events;
        else if (level === "warning") warning += events;
        else info += events;
        const firstSeen = String(issue.firstSeen ?? "");
        if (firstSeen && new Date(firstSeen).getTime() >= new Date(since).getTime()) newCount += 1;
      }
      const resolvedEvents = resolved.reduce((a: number, i) => a + num(i.count), 0);

      return res({ total, fatal, error, warning, info, newCount, resolved: resolvedEvents });
    }

    if (path === "releases") {
      const releases = (await sentryFetch(
        base,
        headers,
        `/projects/${org}/${project}/releases/?limit=${limit}`,
      )) as SentryRelease[];
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
