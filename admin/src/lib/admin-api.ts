import { supabase, SUPABASE_ENABLED, getAdminToken } from "./supabase";

class AdminApi {
  private async request<T>(service: string, action: string, payload?: Record<string, unknown>): Promise<T> {
    if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
    const token = getAdminToken();
    if (!token) throw new Error("No admin session");
    const { data, error } = await supabase.functions.invoke("admin-api", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { service, action, payload },
    });
    if (error) throw error;
    return data as T;
  }

  monitor = {
    health: () => this.request<{ services: Array<{ name: string; status: string; latency: number }>; elapsed: number }>("monitor", "health"),
    overview: () => this.request<{ usersOnline: number; todayUsers: number; workspaces: number; pages: number; errors: number; storage: number; apiLatency: number }>("monitor", "overview"),
  };

  users = {
    count: () => this.request<{ total: number }>("users", "count"),
    list: (limit = 50, offset = 0) => this.request<unknown>("users", "list", { limit, offset }),
    get: (userId: string) => this.request<unknown>("users", "user", { userId }),
    sessions: (userId: string) => this.request<unknown>("users", "sessions", { userId }),
    organizations: (userId: string) => this.request<unknown>("users", "organizations", { userId }),
  };

  analytics = {
    liveUsers: () => this.request<{ liveUsers: number }>("analytics", "live-users"),
    retention: (date_from = "-7d") => this.request<unknown>("analytics", "retention", { date_from }),
    sessionRecordings: (date_from = "-7d", limit = 50) => this.request<{ total: number; hasMore: boolean }>("analytics", "session-recordings", { date_from, limit }),
    featureFlags: () => this.request<Array<Record<string, unknown>>>("analytics", "feature-flags"),
  };

  errors = {
    issueCounts: () => this.request<{ total: number }>("errors", "issue-counts"),
    events: (limit = 50) => this.request<unknown>("errors", "events", { limit }),
  };

  email = {
    analytics: () => this.request<{ total: number; delivered: number; bounced: number; complaints: number }>("email", "analytics"),
  };

  deployments = {
    list: (limit = 25) => this.request<unknown>("deployments", "list", { limit }),
  };
}

export const adminApi = new AdminApi();
