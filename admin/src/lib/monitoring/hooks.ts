import { useQuery } from "@tanstack/react-query";
import { supabase, getAdminToken, SUPABASE_ENABLED } from "@/lib/supabase";
import { sentry, posthog, resend, vercel, clerk, storageStats, releaseApi, isSupabaseAvailable } from "./api";
import type {
  OverviewMetrics, SentryError, PerformanceMetric, PerformancePoint,
  SessionData, ServiceStatus, EmailMetric, RecentEmail, EmailCampaignMetric,
  Deployment, LogEntry, IntegrationStatus, ConnectorStat,
} from "./types";
import { CONNECTOR_CATALOG } from "@/lib/connectorCatalog";

const RETRY = { maxRetries: 1, delay: 2000 };
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "1.0.0";

function isNotConfigured(err: unknown): boolean {
  if (err instanceof Error && err.message === "SERVICE_NOT_CONFIGURED") return true;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message.includes("not configured")) return true;
  return false;
}

function parseSentryIssues(data: Array<Record<string, unknown>> | undefined): SentryError[] {
  if (!data || !Array.isArray(data)) return [];
  return data.map((i) => ({
    id: String(i.id ?? ""),
    title: String(i.title ?? ""),
    count: Number(i.count ?? 0),
    users: Number(i.userCount ?? i.users ?? 0),
    firstSeen: String(i.firstSeen ?? ""),
    lastSeen: String(i.lastSeen ?? ""),
    permalink: String(i.permalink ?? ""),
    environment: String(i.environment ?? "production"),
    release: String(i.release ?? "unknown"),
    level: (i.level as SentryError["level"]) ?? "error",
    platform: "javascript",
    status: (i.status as SentryError["status"]) ?? "unresolved",
  })) as SentryError[];
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Joins a throwaway realtime channel — an actual socket round trip against
// the project's Realtime server, not an inference from another request.
export function probeRealtime(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = supabase;
    if (!client) {
      reject(new Error("Supabase client not initialized"));
      return;
    }
    const channel = client.channel(`admin-health-${Date.now()}`);
    const timer = setTimeout(() => {
      client.removeChannel(channel);
      reject(new Error("Realtime connect timed out"));
    }, timeoutMs);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        client.removeChannel(channel);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        client.removeChannel(channel);
        reject(new Error(`Realtime ${status.toLowerCase()}`));
      }
    });
  });
}

async function adminSelect(
  table: string,
  p_select: string,
  opts: { p_limit?: number; p_order_col?: string; p_order_dir?: string } = {},
): Promise<Array<Record<string, unknown>> | null> {
  if (!isSupabaseAvailable()) return null;
  const token = getAdminToken();
  if (!token) return null;
  const { data, error } = await supabase!.rpc("admin_select", {
    p_session_token: token, p_table: table, p_select, ...opts,
  });
  if (error) throw error;
  return (data ?? []) as Array<Record<string, unknown>>;
}

async function adminCount(table: string): Promise<number | null> {
  if (!isSupabaseAvailable()) return null;
  const token = getAdminToken();
  if (!token) return null;
  const { data, error } = await supabase!.rpc("admin_count", { p_session_token: token, p_table: table });
  if (error) return null;
  return Number(data) || 0;
}

export function useOverviewMetrics() {
  return useQuery({
    queryKey: ["monitoring", "overview"],
    queryFn: async () => {
      const out: OverviewMetrics = {
        systemStatus: "degraded", usersOnline: 0, todayUsers: 0,
        workspaces: 0, pages: 0, aiRequests: 0,
        errorsToday: 0, errorsCritical: 0, errorsHigh: 0, errorsMedium: 0, errorsLow: 0,
        emailsDelivered: 0, pageviews24h: 0,
        storageUsed: "—", storageBytes: 0,
        databaseStatus: "degraded", currentVersion: APP_VERSION,
        environment: "production", realtimeStatus: "disconnected",
        supabaseStatus: "unknown", clerkStatus: "unknown",
        resendStatus: "unknown", sentryStatus: "unknown", posthogStatus: "unknown",
      };

      await Promise.allSettled([
        adminCount("workspaces").then((n) => {
          if (n !== null) {
            out.workspaces = n;
            // The count succeeded, so PostgREST answered a real authenticated query.
            out.databaseStatus = "healthy";
            out.supabaseStatus = "operational";
          } else {
            out.databaseStatus = "degraded";
            out.supabaseStatus = "degraded";
          }
        }),
        adminCount("pages").then((n) => { if (n !== null) out.pages = n; }),
        (async () => {
          if (!isSupabaseAvailable()) return;
          const token = getAdminToken();
          if (!token) return;
          try {
            const { data, error } = await supabase!.rpc("get_ai_events_today_count", { p_session_token: token });
            if (!error) out.aiRequests = Number(data) || 0;
          } catch { /* counter is best-effort */ }
        })(),
        sentry.issueCounts().then((r) => {
          out.errorsToday = r.total ?? 0;
          out.errorsCritical = r.fatal ?? 0;
          out.errorsHigh = r.error ?? 0;
          out.errorsMedium = r.warning ?? 0;
          out.errorsLow = r.info ?? 0;
          out.sentryStatus = "operational";
        }).catch((err) => {
          if (isNotConfigured(err)) out.sentryStatus = "unknown";
          else out.sentryStatus = "degraded";
        }),
        posthog.liveUsers().then((r) => {
          out.usersOnline = r.liveUsers;
          out.posthogStatus = "operational";
        }).catch((err) => {
          if (isNotConfigured(err)) out.posthogStatus = "unknown";
          else out.posthogStatus = "degraded";
        }),
        posthog.sessionAnalytics().then((r) => {
          out.pageviews24h = (r.topPages ?? []).reduce((s, p) => s + p.views, 0) || r.todaySessions;
          if (!out.usersOnline) out.usersOnline = 0;
          out.posthogStatus = "operational";
        }).catch(() => { /* pageviews counter is optional; liveUsers above drives status */ }),
        resend.analytics().then((r) => {
          out.emailsDelivered = r.delivered;
          out.resendStatus = "operational";
        }).catch((err) => {
          if (isNotConfigured(err)) out.resendStatus = "unknown";
          else out.resendStatus = "degraded";
        }),
        clerk.userCount().then((r) => {
          out.todayUsers = r.total;
          out.clerkStatus = "operational";
        }).catch((err) => {
          if (isNotConfigured(err)) out.clerkStatus = "unknown";
          else out.clerkStatus = "degraded";
        }),
        storageStats().then((s) => {
          out.storageBytes = s.storageBytes;
          out.storageUsed = formatBytes(s.storageBytes);
        }).catch(() => { /* storage stat is best-effort */ }),
        probeRealtime().then(() => {
          out.realtimeStatus = "connected";
        }).catch(() => {
          out.realtimeStatus = "error";
        }),
        releaseApi.status().then((r) => {
          if (r.currentVersion) out.currentVersion = r.currentVersion;
        }).catch(() => { /* release function not configured; keep env version */ }),
      ]);

      if (!isSupabaseAvailable()) {
        out.databaseStatus = "degraded";
        out.realtimeStatus = "disconnected";
      }

      const serviceStatuses = [
        out.supabaseStatus, out.clerkStatus, out.resendStatus, out.sentryStatus, out.posthogStatus,
      ];
      if (serviceStatuses.some((s) => s === "outage")) {
        out.systemStatus = "critical";
      } else if (serviceStatuses.some((s) => s === "degraded")) {
        out.systemStatus = "degraded";
      } else if (serviceStatuses.every((s) => s === "operational")) {
        out.systemStatus = "healthy";
      }

      return out;
    },
    refetchInterval: 30000,
    staleTime: 15000,
    retry: 1,
  });
}

export function useSentryErrors() {
  return useQuery({
    queryKey: ["monitoring", "errors"],
    queryFn: async () => {
      const data = await sentry.issues("24h");
      return parseSentryIssues(data);
    },
    refetchInterval: 30000,
    staleTime: 15000,
    retry: RETRY.maxRetries,
    retryDelay: RETRY.delay,
  });
}

export function usePerformanceMetrics() {
  return useQuery({
    queryKey: ["monitoring", "performance"],
    queryFn: async () => {
      const out: PerformanceMetric = {
        lcp: 0, cls: 0, fcp: 0, inp: 0, ttfb: 0, vitalsSamples: 0,
        pageviews24h: 0, realtimeConnections: 0, pageVersions24h: 0,
        largestSnapshot: "—", posthogError: null,
      };

      await Promise.allSettled([
        posthog.webVitals().then((v) => {
          out.lcp = v.lcp.p75;
          out.fcp = v.fcp.p75;
          out.inp = v.inp.p75;
          out.ttfb = v.ttfb.p75;
          out.cls = v.cls.p75;
          out.vitalsSamples = v.samples;
        }).catch((err) => {
          // Surfaced on the page — zeros with a hidden failure would lie.
          out.posthogError = err instanceof Error ? err.message : "PostHog request failed";
        }),
        posthog.sessionAnalytics().then((s) => {
          out.pageviews24h = (s.topPages ?? []).reduce((sum, p) => sum + p.views, 0);
        }),
        (async () => {
          const rows = await adminSelect("collaboration_sessions", "last_activity", { p_limit: 500 }).catch(() => null);
          if (!rows) return;
          const since = Date.now() - 300000;
          out.realtimeConnections = rows.filter((r) => {
            const t = new Date(String(r.last_activity ?? "")).getTime();
            return Number.isFinite(t) && t >= since;
          }).length;
        })(),
        (async () => {
          const rows = await adminSelect("page_versions", "created_at", { p_order_col: "created_at", p_order_dir: "desc", p_limit: 2000 }).catch(() => null);
          if (!rows) return;
          const since = Date.now() - 86400000;
          out.pageVersions24h = rows.filter((r) => {
            const t = new Date(String(r.created_at ?? "")).getTime();
            return Number.isFinite(t) && t >= since;
          }).length;
          // Largest actual page snapshot stored in the last versions — a real
          // payload-size measurement, not a synthetic bundle number.
          const snapshotRows = await adminSelect("page_versions", "page_snapshot", { p_order_col: "created_at", p_order_dir: "desc", p_limit: 200 }).catch(() => null);
          if (snapshotRows && snapshotRows.length > 0) {
            let maxSize = 0;
            for (const row of snapshotRows) {
              if (row.page_snapshot) {
                maxSize = Math.max(maxSize, new Blob([JSON.stringify(row.page_snapshot)]).size);
              }
            }
            if (maxSize > 0) {
              const kb = maxSize / 1024;
              out.largestSnapshot = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
            }
          }
        })(),
      ]);

      return out;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function usePerformanceHistory(range: "1h" | "24h" | "7d") {
  return useQuery({
    queryKey: ["monitoring", "performance", "history", range],
    queryFn: async () => {
      const points: PerformancePoint[] = [];
      try {
        const rows = await adminSelect("page_versions", "created_at", { p_order_col: "created_at", p_order_dir: "asc", p_limit: 2000 });
        if (!rows || rows.length === 0) return points;
        const bucketMs = range === "1h" ? 60000 : range === "24h" ? 300000 : 3600000;
        const buckets = new Map<number, number>();
        for (const row of rows) {
          const ts = new Date(String(row.created_at)).getTime();
          if (!Number.isFinite(ts)) continue;
          const bucket = Math.floor(ts / bucketMs) * bucketMs;
          buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
        }
        for (const [ts, count] of buckets) {
          points.push({ timestamp: new Date(ts).toISOString(), value: count });
        }
        points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      } catch { /* history chart is best-effort */ }
      return points;
    },
    staleTime: 10000,
  });
}

export function useSessionData() {
  return useQuery({
    queryKey: ["monitoring", "sessions"],
    queryFn: async () => {
      // liveUsers is the connectivity probe: if PostHog fails (missing key,
      // missing scope, outage) the error propagates so the page shows a real
      // error state instead of a wall of zeros.
      const live = await posthog.liveUsers();
      const out: SessionData = {
        liveUsers: live.liveUsers, todaySessions: 0, returningUsers: 0,
        retention: 0, bounceRate: 0, avgSessionDuration: 0, replayCount: 0,
        topPages: [], topCountries: [], topBrowsers: [], topDevices: [],
      };

      await Promise.allSettled([
        posthog.sessionAnalytics().then((s) => {
          out.todaySessions = s.todaySessions;
          out.returningUsers = s.returningUsers;
          out.avgSessionDuration = s.avgSessionDuration;
          out.bounceRate = s.bounceRate;
          out.topPages = s.topPages;
          out.topCountries = s.topCountries;
          out.topBrowsers = s.topBrowsers;
          out.topDevices = s.topDevices;
        }),
        posthog.retention("-7d").then((r) => {
          const retention = (r as { retention?: number })?.retention;
          if (typeof retention === "number") out.retention = retention;
        }),
        posthog.sessionRecordings("-1d").then((r) => {
          out.replayCount = r.total;
        }),
      ]);

      return out;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useServiceStatuses() {
  return useQuery({
    queryKey: ["monitoring", "services"],
    queryFn: async () => {
      const byName: Record<string, ServiceStatus> = {
        Clerk: { name: "Clerk", status: "unknown", latency: 0, health: 0, lastIncident: null, version: "—" },
        Supabase: { name: "Supabase", status: "unknown", latency: 0, health: 0, lastIncident: null, version: "—" },
        Realtime: { name: "Realtime", status: "unknown", latency: 0, health: 0, lastIncident: null, version: "—" },
        Storage: { name: "Storage", status: "unknown", latency: 0, health: 0, lastIncident: null, version: "—" },
        Resend: { name: "Resend", status: "unknown", latency: 0, health: 0, lastIncident: null, version: "—" },
        Sentry: { name: "Sentry", status: "unknown", latency: 0, health: 0, lastIncident: null, version: "—" },
        PostHog: { name: "PostHog", status: "unknown", latency: 0, health: 0, lastIncident: null, version: "—" },
        Vercel: { name: "Vercel", status: "unknown", latency: 0, health: 0, lastIncident: null, version: "—" },
      };

      const healthy = (name: string, t0: number) => {
        const latency = Date.now() - t0;
        byName[name] = { ...byName[name], status: "operational", latency, health: 100 };
      };
      const probe = async (name: string, check: () => Promise<unknown>) => {
        const t0 = Date.now();
        try {
          const result = await check();
          if (result === false) return; // stayed unknown (e.g. no session)
          healthy(name, t0);
        } catch (err) {
          if (!isNotConfigured(err)) {
            byName[name] = { ...byName[name], status: "degraded", health: 75, latency: 0 };
          }
        }
      };

      await Promise.allSettled([
        probe("Clerk", () => clerk.userCount()),
        probe("Supabase", async () => {
          const n = await adminCount("workspaces");
          if (n === null) throw new Error("Database query failed");
          return n;
        }),
        probe("Realtime", () => probeRealtime()),
        probe("Storage", () => storageStats()),
        probe("Resend", () => resend.analytics()),
        probe("Sentry", () => sentry.issueCounts()),
        probe("PostHog", () => posthog.liveUsers()),
        probe("Vercel", () => vercel.deployments("1")),
      ]);

      return Object.values(byName);
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useEmailMetrics() {
  return useQuery({
    queryKey: ["monitoring", "email"],
    queryFn: async () => {
      const data = await resend.analytics();
      return data as EmailMetric;
    },
    refetchInterval: 60000,
    staleTime: 30000,
    retry: RETRY.maxRetries,
    retryDelay: RETRY.delay,
  });
}

export function useRecentEmails() {
  return useQuery({
    queryKey: ["monitoring", "email", "recent"],
    queryFn: async () => {
      const data = await resend.emails("20");
      return data.map((e) => ({
        id: e.id,
        to: e.to,
        subject: e.subject,
        status: e.status,
        sentAt: e.createdAt ?? e.sentAt,
      })) as RecentEmail[];
    },
    staleTime: 30000,
    retry: RETRY.maxRetries,
    retryDelay: RETRY.delay,
  });
}

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ["monitoring", "email", "campaigns"],
    queryFn: async () => {
      const rows = await adminSelect(
        "email_campaigns",
        "id, name, sent, open_rate, click_rate, bounce_rate, sent_at",
        { p_order_col: "sent_at", p_order_dir: "desc", p_limit: 10 },
      );
      if (!rows) return [] as EmailCampaignMetric[];
      return rows.map((c) => ({
        id: String(c.id ?? ""),
        name: String(c.name ?? ""),
        sent: Number(c.sent ?? 0),
        opened: Number(c.open_rate ?? 0),
        clicked: Number(c.click_rate ?? 0),
        bounced: Number(c.bounce_rate ?? 0),
        sentAt: String(c.sent_at ?? new Date().toISOString()),
      })) as EmailCampaignMetric[];
    },
    staleTime: 60000,
  });
}

export function useDeployments() {
  return useQuery({
    queryKey: ["monitoring", "deployments"],
    queryFn: async () => {
      const data = await vercel.deployments("20");
      return data.map((d) => {
        const meta = (d.meta ?? {}) as Record<string, unknown>;
        const commitSha = String(meta.githubCommitSha ?? d.commitSha ?? "");
        return {
          id: String(d.id ?? ""),
          name: String(d.name ?? "noska"),
          version: String(meta.githubCommitSha ?? d.version ?? "unknown").slice(0, 7),
          commitSha,
          branch: String(meta.githubCommitRef ?? d.branch ?? "main"),
          commitMessage: String(meta.githubCommitMessage ?? "").split("\n")[0],
          author: String(meta.githubCommitAuthorName ?? ""),
          status: (d.status as Deployment["status"]) ?? "unknown",
          deployedAt: String(d.readyAt ?? d.createdAt ?? d.deployedAt ?? new Date().toISOString()),
          previousDeployments: Number(d.previousDeployments ?? 0),
          rollbackAvailable: Boolean(d.rollbackAvailable ?? false),
        };
      }) as Deployment[];
    },
    refetchInterval: 60000,
    staleTime: 30000,
    retry: RETRY.maxRetries,
    retryDelay: RETRY.delay,
  });
}

// Real log sources only: audit_events for platform activity and Resend for
// email delivery. Failed/bounced emails are genuinely error-level; audit
// actions are informational, not fabricated "errors".
export function useLogEntries(filters?: { level?: string; source?: string; search?: string }) {
  return useQuery({
    queryKey: ["monitoring", "logs", filters],
    queryFn: async () => {
      const source = filters?.source ?? "all";
      const search = (filters?.search ?? "").toLowerCase();

      const [auditRows, emailRows] = await Promise.all([
        source === "all" || source === "audit"
          ? adminSelect(
              "audit_events",
              "id, action, user_name, detail, block_type, created_at",
              { p_order_col: "created_at", p_order_dir: "desc", p_limit: 200 },
            ).catch(() => null)
          : Promise.resolve(null),
        source === "all" || source === "email"
          ? resend.emails("50").catch(() => null)
          : Promise.resolve(null),
      ]);

      const entries: LogEntry[] = [];

      if (auditRows) {
        for (const row of auditRows) {
          const action = String(row.action ?? "");
          const blockType = String(row.block_type ?? "").trim();
          const user = String(row.user_name ?? "");
          const detail = row.detail ? String(row.detail) : undefined;
          const hay = `${action} ${user} ${detail ?? ""} ${blockType}`.toLowerCase();
          if (search && !hay.includes(search)) continue;
          entries.push({
            id: `audit-${String(row.id ?? "")}`,
            timestamp: String(row.created_at ?? new Date().toISOString()),
            level: "info",
            source: "audit",
            message: blockType ? `${action} ${blockType}` : action,
            detail: user ? `${user}${detail ? ` · ${detail}` : ""}` : detail,
          });
        }
      }

      if (emailRows && Array.isArray(emailRows)) {
        for (const e of emailRows) {
          const status = String(e.status ?? "sent");
          const to = String(e.to ?? "");
          const subject = String(e.subject ?? "");
          if (search && !`${subject} ${to} ${status}`.toLowerCase().includes(search)) continue;
          entries.push({
            id: `email-${String(e.id ?? "")}`,
            timestamp: String(e.createdAt ?? e.sentAt ?? new Date().toISOString()),
            level: status === "failed" || status === "bounced" ? "error" : "info",
            source: "email",
            message: `email ${status}: ${subject}`,
            detail: to || undefined,
          });
        }
      }

      const level = filters?.level;
      return entries
        .filter((e) => !level || level === "all" || e.level === level)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 50);
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });
}

export function useIntegrationStatuses() {
  return useQuery({
    queryKey: ["monitoring", "integrations"],
    queryFn: async () => {
      const probe = async (
        name: string,
        check: () => Promise<unknown>,
        dashboardUrl: string,
        notConfiguredMsg: string,
      ): Promise<IntegrationStatus> => {
        try {
          await check();
          return { name, configured: true, environment: "production", lastSync: new Date().toISOString(), lastError: null, dashboardUrl };
        } catch (err) {
          const scopeMissing = err instanceof Error && err.message === "POSTHOG_TOKEN_MISSING_SCOPE";
          return {
            name,
            configured: false,
            environment: "production",
            lastSync: null,
            lastError: isNotConfigured(err)
              ? notConfiguredMsg
              : scopeMissing
                ? "Personal API key is missing the 'query:read' scope — create a new key in PostHog (Settings → Personal API Keys) and update POSTHOG_PERSONAL_TOKEN"
                : err instanceof Error ? err.message.slice(0, 200) : "Check failed",
            dashboardUrl,
          };
        }
      };

      const results = await Promise.all([
        probe("Clerk", () => clerk.userCount(), "https://dashboard.clerk.com", "CLERK_SECRET_KEY not set"),
        probe(
          "Supabase",
          async () => {
            if (!isSupabaseAvailable()) throw new Error("Supabase client not initialized");
          },
          "https://supabase.com/dashboard",
          "Supabase client not initialized",
        ),
        probe("Resend", () => resend.analytics(), "https://resend.com/dashboard", "RESEND_API_KEY not set"),
        probe("Sentry", () => sentry.issueCounts(), "https://sentry.io", "SENTRY_AUTH_TOKEN not set"),
        probe("PostHog", () => posthog.liveUsers(), "https://app.posthog.com", "POSTHOG_PERSONAL_TOKEN not set"),
        probe("Vercel", () => vercel.deployments("1"), "https://vercel.com", "VERCEL_TOKEN not set"),
      ]);

      return results;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// Real per-connector connection stats for the app connectors (GitHub, Jira,
// Slack, …): active connections, total rows, and last connection time from
// user_connections joined to the connectors catalog. Returns available:false
// when the admin_select allowlist migration hasn't been applied yet.
export function useConnectorStats() {
  return useQuery({
    queryKey: ["monitoring", "connector-stats"],
    queryFn: async (): Promise<{ available: boolean; stats: ConnectorStat[] }> => {
      const [catalogRows, connectionRows] = await Promise.all([
        adminSelect("connectors", "id, slug, name", { p_limit: 500 }).catch((err) => {
          if (err instanceof Error && err.message.includes("TABLE_NOT_ALLOWED")) return { notAllowed: true as const };
          return null;
        }),
        adminSelect("user_connections_admin", "connector_id, status, external_account_label, connected_at", {
          p_order_col: "connected_at", p_order_dir: "desc", p_limit: 2000,
        }).catch((err) => {
          if (err instanceof Error && err.message.includes("TABLE_NOT_ALLOWED")) return { notAllowed: true as const };
          return null;
        }),
      ]);

      if (!catalogRows || !connectionRows || "notAllowed" in catalogRows || "notAllowed" in connectionRows) {
        return { available: false, stats: [] };
      }

      const slugById = new Map(catalogRows.map((c) => [String(c.id), String(c.slug ?? "").toLowerCase()]));
      const agg = new Map<string, { active: number; total: number; last: string | null }>();
      for (const row of connectionRows) {
        const slug = slugById.get(String(row.connector_id)) ?? "";
        if (!slug) continue;
        const entry = agg.get(slug) ?? { active: 0, total: 0, last: null };
        entry.total += 1;
        if (String(row.status ?? "") !== "revoked") entry.active += 1;
        const at = String(row.connected_at ?? "");
        if (at && (!entry.last || at > entry.last)) entry.last = at;
        agg.set(slug, entry);
      }

      const stats: ConnectorStat[] = CONNECTOR_CATALOG.map((c) => {
        const entry = agg.get(c.id.toLowerCase());
        return {
          id: c.id,
          name: c.name,
          category: c.category,
          activeConnections: entry?.active ?? 0,
          totalConnections: entry?.total ?? 0,
          lastConnectedAt: entry?.last ?? null,
          inCatalog: agg.has(c.id.toLowerCase()),
        };
      });
      return { available: true, stats };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
