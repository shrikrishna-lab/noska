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
    const msg = typeof fnError === "object" && fnError !== null ? String((fnError as Record<string, unknown>).message ?? "") : String(fnError);
    if (msg.includes("503") || msg.includes("not configured")) {
      throw new Error("SERVICE_NOT_CONFIGURED");
    }
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
};

export const posthog = {
  liveUsers: () =>
    invokeService<{ liveUsers: number }>("monitoring-posthog", { path: "live-users" }),
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

export { supabase, getAdminToken };
