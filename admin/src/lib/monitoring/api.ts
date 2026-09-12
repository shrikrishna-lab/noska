import { supabase, getAdminToken } from "@/lib/supabase";

type Service = "monitoring-sentry" | "monitoring-posthog" | "monitoring-resend" | "monitoring-vercel" | "monitoring-clerk";

export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

export function isAuthenticated(): boolean {
  return !!getAdminToken();
}

async function invokeService<T>(service: Service, params: Record<string, string>): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error("No admin session");

  const { data, error: fnError } = await supabase!.functions.invoke(service, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: params,
  });

  if (fnError) {
    // supabase-js wraps non-2xx responses in FunctionsHttpError whose message
    // is generic — read the status and error payload off the wrapped response.
    const ctx = (fnError as { context?: Response }).context;
    const status = typeof ctx?.status === "number" ? ctx.status : 0;
    let fnMessage = "";
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = (await ctx.clone().json()) as { error?: string };
        fnMessage = body.error ?? "";
      } catch { /* body wasn't JSON */ }
    }
    if (status === 503 || fnMessage.includes("not configured") || fnMessage.includes("Not configured")) {
      throw new Error("SERVICE_NOT_CONFIGURED");
    }
    // PostHog personal API keys are created with explicit scopes — a 403
    // permission_denied means the key exists but lacks query:read.
    if (fnMessage.includes("missing required scope")) {
      throw new Error("POSTHOG_TOKEN_MISSING_SCOPE");
    }
    if (fnMessage) throw new Error(fnMessage);
    throw fnError;
  }

  return data as T;
}

export const sentry = {
  issues: (statsPeriod = "24h") =>
    invokeService<Array<Record<string, unknown>>>("monitoring-sentry", { path: "issues", statsPeriod }),
  issueCounts: () =>
    invokeService<Record<string, number>>("monitoring-sentry", { path: "issue-counts" }),
  releases: (limit = "10") =>
    invokeService<Array<Record<string, unknown>>>("monitoring-sentry", { path: "releases", limit }),
  configCheck: () =>
    invokeService<Record<string, unknown>>("monitoring-sentry", { path: "config-check" }),
};

export const posthog = {
  liveUsers: () =>
    invokeService<{ liveUsers: number }>("monitoring-posthog", { path: "live-users" }),
  webVitals: () =>
    invokeService<{
      lcp: { p75: number; avg: number };
      fcp: { p75: number; avg: number };
      inp: { p75: number; avg: number };
      ttfb: { p75: number; avg: number };
      cls: { p75: number; avg: number };
      samples: number;
    }>("monitoring-posthog", { path: "web-vitals" }),
  sessionAnalytics: () =>
    invokeService<{
      todaySessions: number;
      avgSessionDuration: number;
      bounceRate: number;
      returningUsers: number;
      topPages: Array<{ path: string; views: number }>;
      topCountries: Array<{ country: string; count: number }>;
      topBrowsers: Array<{ browser: string; count: number }>;
      topDevices: Array<{ device: string; count: number }>;
    }>("monitoring-posthog", { path: "session-analytics" }),
  retention: (dateFrom = "-7d") =>
    invokeService<unknown>("monitoring-posthog", { path: "retention", date_from: dateFrom }),
  sessionRecordings: (dateFrom = "-7d") =>
    invokeService<{ total: number; hasMore: boolean }>("monitoring-posthog", {
      path: "session-recordings", date_from: dateFrom,
    }),
  featureFlags: () =>
    invokeService<Array<Record<string, unknown>>>("monitoring-posthog", { path: "feature-flags" }),
};

export const resend = {
  analytics: () =>
    invokeService<{
      sent: number; delivered: number; opened: number; clicked: number;
      failed: number; bounced: number; complaint: number; spam: number;
    }>("monitoring-resend", { path: "analytics" }),
  emails: (limit = "20") =>
    invokeService<Array<Record<string, unknown>>>("monitoring-resend", { path: "emails", limit }),
};

export const vercel = {
  deployments: (limit = "20") =>
    invokeService<Array<Record<string, unknown>>>("monitoring-vercel", { path: "deployments", limit }),
};

export const clerk = {
  userCount: () =>
    invokeService<{ total: number }>("monitoring-clerk", { path: "user-count" }),
  sessions: (status = "active") =>
    invokeService<{ total: number; active: number; recentSessions: Array<Record<string, unknown>> }>(
      "monitoring-clerk", { path: "sessions", status }
    ),
  signups: (days = "7") =>
    invokeService<Array<Record<string, unknown>>>("monitoring-clerk", { path: "signups", days }),
};

export interface StorageStats {
  dbSizeBytes: number;
  storageObjects: number;
  storageBytes: number;
  buckets: Array<{ name: string; objects: number; bytes: number }>;
  topTables: Array<{ table: string; bytes: number }>;
}

export const storageStats = (): Promise<StorageStats> =>
  import("@/lib/admin-api").then((m) => m.adminApi.monitor.storage());

export interface GitHubRun {
  id: number;
  name: string | null;
  status: string | null;
  conclusion: string | null;
  head_branch: string | null;
  event: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  draft: boolean;
  body?: string | null;
  prerelease: boolean;
  created_at: string;
  published_at: string | null;
  html_url: string;
  assets: Array<{ name: string; size: number; browser_download_url: string }>;
}

export interface ReleaseStatus {
  repo: string;
  branch: string;
  versions: Array<{ path: string; version: string | null; error: string | null }>;
  currentVersion: string | null;
  runs: GitHubRun[];
  releases: GitHubRelease[];
}

export interface TriggerReleaseResult {
  ok: boolean;
  tag: string;
  version: string;
  commitSha: string;
  releaseUrl: string | null;
  runUrl: string;
  warning: string | null;
}

export interface WhatsNewCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  type: "feat" | "fix" | "other";
  rawType: string;
  breaking: boolean;
}

export interface WhatsNew {
  baseTag: string | null;
  currentVersion: string | null;
  suggested: { version: string; kind: "major" | "minor" | "patch"; reason: string } | null;
  counts: { total: number; feat: number; fix: number; breaking: number; other: number };
  totalCommits: number;
  truncated: boolean;
  branch: string;
  upcoming: Array<{
    name: string;
    ahead: number;
    tip: { sha: string; message: string; author: string; date: string };
  }>;
  commits: WhatsNewCommit[];
  drafts: Array<{ tag: string; url: string; created_at: string }>;
  suggestions: Array<{ level: "info" | "warn"; title: string; detail: string; url?: string }>;
}

export type PreflightStatus = "pass" | "warn" | "fail" | "unknown";
export interface PreflightCheck {
  id: string;
  label: string;
  status: PreflightStatus;
  detail: string;
}
export interface PreflightReport {
  branch: string;
  checks: PreflightCheck[];
  summary: { pass: number; warn: number; fail: number; unknown: number };
}

export const releaseApi = {
  preflight: () =>
    invokeEdgeFunction<PreflightReport>("admin-trigger-release", { action: "preflight" }),
  status: () =>
    invokeEdgeFunction<ReleaseStatus>("admin-trigger-release", { action: "status" }),
  whatsnew: () =>
    invokeEdgeFunction<WhatsNew>("admin-trigger-release", { action: "whatsnew" }),
  trigger: (version: string, notes: string) =>
    invokeEdgeFunction<TriggerReleaseResult>("admin-trigger-release", { action: "trigger", version, notes }),
  runs: () =>
    invokeEdgeFunction<{ runs: GitHubRun[] }>("admin-trigger-release", { action: "runs" }),
  releases: () =>
    invokeEdgeFunction<{ releases: GitHubRelease[] }>("admin-trigger-release", { action: "releases" }),
  deleteDraft: (tag: string) =>
    invokeEdgeFunction<{ ok: boolean; tag: string }>("admin-trigger-release", { action: "delete_draft", tag }),
  retry: (tag: string, notes?: string) =>
    invokeEdgeFunction<{ ok: boolean; tag: string; headSha: string; previousSha: string }>(
      "admin-trigger-release", { action: "retry", tag, notes },
    ),
  // ── Mobile (iOS/Android) builds ──
  mobileStatus: () =>
    invokeEdgeFunction<MobileStatus>("admin-trigger-release", { action: "mobile_status" }),
  mobileTrigger: (version: string, notes?: string) =>
    invokeEdgeFunction<MobileTriggerResult>("admin-trigger-release", { action: "mobile_trigger", version, notes }),
};

/** One polled read covering the whole mobile pipeline. */
export interface MobileStatus {
  branch: string;
  workflowOnBranch: boolean;
  androidProject: "committed" | "missing";
  iosProject: "committed" | "missing";
  /** noska:// scheme registered in the committed AndroidManifest (null = manifest missing). */
  schemeRegistered: boolean | null;
  currentVersion: string | null;
  storeLinks: { appStore: string | null; googlePlay: string | null };
  runs: GitHubRun[];
  /** Only releases tagged mobile-v*. */
  releases: GitHubRelease[];
  runsError: string | null;
}

export interface MobileTriggerResult {
  ok: boolean;
  tag: string;
  version: string;
  commitSha: string;
  runUrl: string;
  warning: string | null;
}

async function invokeEdgeFunction<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error("No admin session");

  const { data, error: fnError } = await supabase!.functions.invoke(fn, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (fnError) {
    // supabase-js wraps non-2xx responses in FunctionsHttpError whose message
    // is the generic "Edge Function returned a non-2xx status code" — the
    // actual status and payload live on the wrapped response.
    const ctx = (fnError as { context?: Response }).context;
    const status = typeof ctx?.status === "number" ? ctx.status : 0;
    let fnMessage = "";
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = (await ctx.clone().json()) as { error?: string };
        fnMessage = body.error ?? "";
      } catch { /* body wasn't JSON */ }
    }
    if (status === 503 || fnMessage.includes("not configured") || fnMessage.includes("Not configured")) {
      throw new Error("SERVICE_NOT_CONFIGURED");
    }
    if (fnMessage) throw new Error(fnMessage);
    throw fnError;
  }

  return data as T;
}

export { supabase, getAdminToken };
