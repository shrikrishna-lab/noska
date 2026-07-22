import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_ENABLED, getAdminToken } from "./supabase";
import type { SupportTicket, SupportMessage, BannedUser, DeletedAccount } from "./types";
import type { FeatureFlag, FeedbackItem, EmailCampaign, RoadmapItem, Integration, ApiKey, NotificationItem } from "./types";

function token(): string {
  const t = getAdminToken();
  if (!t) throw new Error("No admin session. Please sign in again.");
  return t;
}

async function adminSelect<T>(table: string, select = "*", options?: { order?: string; limit?: number; eq?: [string, unknown] }): Promise<T[]> {
  if (!SUPABASE_ENABLED || !supabase) return [];
  const params: Record<string, unknown> = { p_session_token: token(), p_table: table, p_select: select };
  if (options?.order) {
    const parts = options.order.split(/\s+/);
    params.p_order_col = parts[0];
    params.p_order_dir = parts[1]?.toLowerCase() === "asc" ? "asc" : "desc";
  }
  if (options?.limit) params.p_limit = options.limit;
  if (options?.eq) { params.p_eq_col = options.eq[0]; params.p_eq_val = String(options.eq[1]); }
  const { data, error } = await supabase.rpc("admin_select", params);
  if (error) throw error;
  return (data ?? []) as T[];
}

async function adminCount(table: string): Promise<number> {
  if (!SUPABASE_ENABLED || !supabase) return 0;
  const { data, error } = await supabase.rpc("admin_count", { p_session_token: token(), p_table: table });
  if (error) throw error;
  return data ?? 0;
}

// ── Users ──
export interface AdminUserRow {
  id: string; user_name: string; email: string | null; avatar_url: string | null;
  created_at: string | null; username: string | null; updated_at: string | null;
}
export function useUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminSelect<AdminUserRow>("user_profiles", "*", { order: "created_at desc" }),
  });
}

export function useUserCount() {
  return useQuery({ queryKey: ["admin", "users", "count"], queryFn: () => adminCount("user_profiles") });
}

// ── Pages / Workspaces ──
export interface PageRow {
  id: string; title: string; user_id: string | null;
  created_at: string | null; updated_at: string | null;
  trashed: boolean; blocks: unknown;
}
export function usePages() {
  return useQuery({
    queryKey: ["admin", "pages"],
    queryFn: () => adminSelect<PageRow>("pages", "id,title,user_id,created_at,updated_at,trashed", { order: "created_at desc" }),
  });
}

export function usePageCount() {
  return useQuery({ queryKey: ["admin", "pages", "count"], queryFn: () => adminCount("pages") });
}

// ── Audit Events ──
export interface AuditEventRow {
  id: string; action: string; user_name: string; detail: string | null;
  created_at: string | null; user_id: string; page_id: string | null;
  ai_model: string | null; ai_provider: string | null; ai_latency_ms: number | null;
  ai_cost: number | null; ai_prompt_tokens: number | null; ai_completion_tokens: number | null;
}
export function useAuditEvents(limit = 50) {
  return useQuery({
    queryKey: ["admin", "audit", limit],
    queryFn: () => adminSelect<AuditEventRow>("audit_events", "*", { order: "created_at desc", limit }),
  });
}

export function useAuditCount() {
  return useQuery({ queryKey: ["admin", "audit", "count"], queryFn: () => adminCount("audit_events") });
}

// ── AI Chats ──
export interface AiChatRow {
  id: string; name: string | null; chat_type: string | null;
  created_at: string | null; updated_at: string | null;
  user_id: string | null; messages: unknown;
}
export function useAiChats() {
  return useQuery({
    queryKey: ["admin", "aichats"],
    queryFn: () => adminSelect<AiChatRow>("ai_chats", "id,name,chat_type,created_at,updated_at,user_id", { order: "created_at desc" }),
  });
}

export function useAiChatCount() {
  return useQuery({ queryKey: ["admin", "aichats", "count"], queryFn: () => adminCount("ai_chats") });
}

// ── AI Usage from audit events ──
export function useAiUsageFromAudit() {
  return useQuery({
    queryKey: ["admin", "ai-usage"],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const { data, error } = await supabase
        .rpc("admin_select", {
          p_session_token: token(), p_table: "audit_events",
          p_select: "ai_model, ai_provider, ai_latency_ms, ai_cost, ai_prompt_tokens, ai_completion_tokens, created_at",
          p_order_col: "created_at", p_order_dir: "desc", p_limit: 100,
        });
      if (error) throw error;
      return (data ?? []).filter((r: Record<string, unknown>) => r.ai_model != null);
    },
  });
}

// ── Feature Flags ──
export type DbFeatureFlag = {
  id: string; key: string; name: string; description: string | null;
  enabled: boolean; rollout_percent: number; category: string;
  updated_at: string | null;
};
export function useFeatureFlags() {
  return useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: () => adminSelect<DbFeatureFlag>("feature_flags", "*", { order: "key asc" }),
  });
}

export function useCreateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { key: string; name: string; description?: string; category: string; enabled: boolean; rollout_percent: number }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "feature_flags",
        p_data: { ...data }, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "feature-flags"] }); },
  });
}

export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "feature_flags", p_id: id,
        p_data: { enabled, updated_at: new Date().toISOString() }, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "feature-flags"] }); },
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "feature_flags", p_id: id,
        p_data: { ...data, updated_at: new Date().toISOString() }, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "feature-flags"] }); },
  });
}

export function useDeleteFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "feature_flags", p_id: id, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "feature-flags"] }); },
  });
}

// ── Waitlist ──
export interface DbWaitlistEntry {
  id: string; name: string; email: string; provider: string;
  country: string | null; joined_at: string | null;
  referral_count: number; status: string; position: number | null;
  invite_sent: boolean; accepted: boolean;
  invite_code: string | null; notes: string | null;
  approved_by: string | null; approved_at: string | null;
  rejected_by: string | null; rejected_at: string | null;
  invite_expires_at: string | null;
  email_status: string | null;
  email_queued_at: string | null;
  email_sent_at: string | null;
  email_delivered_at: string | null;
  email_opened_at: string | null;
  email_clicked_at: string | null;
  first_login_at: string | null;
  workspace_created_at: string | null;
  github_id: string | null;
  google_id: string | null;
  microsoft_id: string | null;
  referrer_id: string | null;
  banned_at: string | null;
  ban_reason: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
}
export function useWaitlist() {
  return useQuery({
    queryKey: ["admin", "waitlist"],
    queryFn: () => adminSelect<DbWaitlistEntry>("waitlist_entries", "*", { order: "position asc" }),
    refetchInterval: 15_000,
  });
}

export function useWaitlistCount() {
  return useQuery({
    queryKey: ["admin", "waitlist", "count"],
    queryFn: () => adminCount("waitlist_entries"),
    refetchInterval: 15_000,
  });
}

// ── Admin Users ──
export interface DbAdminUser {
  id: string; name: string; email: string; role: string;
  avatar_url: string | null; created_at: string | null; last_login: string | null;
}
export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "admin-users"],
    queryFn: () => adminSelect<DbAdminUser>("admin_users", "*", { order: "created_at asc" }),
  });
}

// ── Feedback ──
export function useFeedback() {
  return useQuery({
    queryKey: ["admin", "feedback"],
    queryFn: () => adminSelect<FeedbackItem>("feedback", "*", { order: "created_at desc" }),
  });
}

// ── Support Tickets ──
export function useSupportTickets() {
  return useQuery({
    queryKey: ["admin", "support-tickets"],
    queryFn: () => adminSelect<SupportTicket>("support_tickets", "*", { order: "last_update desc" }),
  });
}

// ── Subscriptions ──
export interface DbSubscription {
  id: string; customer_name: string; email: string | null;
  plan: string; status: string; mrr: number;
  payment_method: string | null; started_at: string | null; renews_at: string | null;
}
export function useSubscriptions() {
  return useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: () => adminSelect<DbSubscription>("subscriptions", "*", { order: "started_at desc" }),
  });
}

// ── Payments ──
export interface DbPayment {
  id: string; amount: number; currency: string;
  customer_name: string; status: string; method: string | null;
  paid_at: string | null;
}
export function usePayments() {
  return useQuery({
    queryKey: ["admin", "payments"],
    queryFn: () => adminSelect<DbPayment>("payments", "*", { order: "paid_at desc" }),
  });
}

// ── Email Campaigns ──
export function useEmailCampaigns() {
  return useQuery({
    queryKey: ["admin", "campaigns"],
    queryFn: () => adminSelect<EmailCampaign>("email_campaigns", "*", { order: "created_at desc" }),
  });
}

// ── Roadmap ──
export function useRoadmap() {
  return useQuery({
    queryKey: ["admin", "roadmap"],
    queryFn: () => adminSelect<RoadmapItem>("roadmap_items", "*", { order: "priority desc" }),
  });
}

export function useRoadmapVoteCounts() {
  return useQuery({
    queryKey: ["admin", "roadmap", "votes"],
    queryFn: async () => {
      const votes = await adminSelect<{ roadmap_item_id: string; email: string }>("roadmap_votes", "roadmap_item_id, email");
      const map: Record<string, number> = {};
      for (const v of votes) {
        map[v.roadmap_item_id] = (map[v.roadmap_item_id] || 0) + 1;
      }
      return map;
    },
  });
}

export function useCreateRoadmapItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "roadmap_items", p_data: data,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "roadmap"] }),
  });
}

export function useUpdateRoadmapItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: unknown }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "roadmap_items", p_id: id, p_data: data,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "roadmap"] }),
  });
}

export function useDeleteRoadmapItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "roadmap_items", p_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "roadmap"] }),
  });
}

// ── Integrations ──
export function useIntegrations() {
  return useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: () => adminSelect<Integration>("integrations", "*", { order: "name asc" }),
  });
}

// ── API Keys ──
export function useApiKeys() {
  return useQuery({
    queryKey: ["admin", "api-keys"],
    queryFn: () => adminSelect<ApiKey>("api_keys", "*", { order: "created_at desc" }),
  });
}

// ── Notifications ──
export function useNotifications() {
  return useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => adminSelect<NotificationItem>("notifications", "*", { order: "created_at desc" }),
  });
}

// ── Teams ──
export interface DbTeam {
  id: string; name: string; lead_name: string | null;
  member_count: number; workspace_count: number; created_at: string | null;
}
export function useTeams() {
  return useQuery({
    queryKey: ["admin", "teams"],
    queryFn: () => adminSelect<DbTeam>("teams", "*", { order: "name asc" }),
  });
}

// ── Dashboard KPIs ──
export function useDashboardKpis() {
  return useQuery({
    queryKey: ["admin", "dashboard", "kpis"],
    queryFn: async () => {
      const [userCount, pageCount, auditCount, chatCount] = await Promise.all([
        adminCount("user_profiles"),
        adminCount("pages"),
        adminCount("audit_events"),
        adminCount("ai_chats"),
      ]);
      if (!SUPABASE_ENABLED || !supabase) {
        return { userCount: 0, pageCount: 0, auditCount: 0, chatCount: 0, aiEventsToday: 0 };
      }
      const { data: aiToday, error: aiError } = await supabase
        .rpc("get_ai_events_today_count", { p_session_token: token() });
      if (aiError) throw aiError;
      return { userCount, pageCount, auditCount, chatCount, aiEventsToday: aiToday ?? 0 };
    },
  });
}

// ── Workspace settings ──
export interface WorkspaceSetting {
  id: string; key: string; value: unknown; created_at: string | null;
}
export function useWorkspaceSettings() {
  return useQuery({
    queryKey: ["admin", "workspace-settings"],
    queryFn: () => adminSelect<WorkspaceSetting>("workspace_settings", "*", { order: "created_at desc" }),
  });
}

// ── Overview stats ──
export function useDailySignups(days = 14) {
  return useQuery({
    queryKey: ["admin", "daily-signups", days],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .rpc("admin_select", {
          p_session_token: token(), p_table: "user_profiles",
          p_select: "created_at",
          p_order_col: "created_at", p_order_dir: "asc",
        });
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ created_at: string | null }>) {
        if (!row.created_at) continue;
        const day = row.created_at.slice(0, 10);
        map.set(day, (map.get(day) ?? 0) + 1);
      }
      const labels: string[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        labels.push(d.toISOString().slice(0, 10));
      }
      return labels.map((d) => ({ date: d.slice(5), value: map.get(d) ?? 0 }));
    },
  });
}

export function useDailyAuditEvents(days = 30) {
  return useQuery({
    queryKey: ["admin", "daily-audit", days],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .rpc("admin_select", {
          p_session_token: token(), p_table: "audit_events",
          p_select: "created_at",
          p_order_col: "created_at", p_order_dir: "asc",
        });
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ created_at: string | null }>) {
        if (!row.created_at) continue;
        const day = row.created_at.slice(0, 10);
        map.set(day, (map.get(day) ?? 0) + 1);
      }
      const labels: string[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        labels.push(d.toISOString().slice(0, 10));
      }
      return labels.map((d) => ({ date: d.slice(5), value: map.get(d) ?? 0 }));
    },
  });
}

export function useRecordCount(table: string) {
  return useQuery({
    queryKey: ["admin", "count", table],
    queryFn: () => adminCount(table),
  });
}

// ── Platform Settings ──
export function usePlatformSetting(key: string) {
  return useQuery({
    queryKey: ["admin", "settings", key],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return null;
      const data = await adminSelect<{ key: string; value: unknown }>("platform_settings", "key, value", { eq: ["key", key] });
      return data?.[0]?.value ?? null;
    },
  });
}

export function useAllPlatformSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return {};
      const data = await adminSelect<{ key: string; value: unknown }>("platform_settings", "key, value");
      const map: Record<string, unknown> = {};
      for (const row of data ?? []) { map[row.key] = row.value; }
      return map;
    },
  });
}

export function useUpdatePlatformSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const existing = await adminSelect<{ id: string }>("platform_settings", "id", { eq: ["key", key] });
      if (existing && existing.length > 0) {
        const { error } = await supabase.rpc("admin_update", {
          p_session_token: token(), p_table: "platform_settings", p_id: existing[0].id,
          p_data: { value: JSON.stringify(value) }, p_min_role: "admin",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("admin_insert", {
          p_session_token: token(), p_table: "platform_settings",
          p_data: { key, value: JSON.stringify(value) }, p_min_role: "admin",
        });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "settings", variables.key] });
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

// ── Webhooks ──
export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  description: string | null;
  secret: string | null;
  events: string[];
  status: "active" | "paused" | "disabled";
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useWebhookEndpoints() {
  return useQuery({
    queryKey: ["admin", "webhooks"],
    queryFn: () => adminSelect<WebhookEndpoint>("webhook_endpoints", "*", { order: "created_at desc" }),
  });
}

export function useWebhookDeliveries(limit = 50) {
  return useQuery({
    queryKey: ["admin", "webhook-deliveries", limit],
    queryFn: () => adminSelect<WebhookDelivery>("webhook_deliveries", "*", { order: "created_at desc", limit }),
  });
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event: string;
  payload: unknown;
  status: "pending" | "delivering" | "success" | "failed" | "retrying";
  request_headers: unknown;
  request_body: string;
  response_status: number;
  response_body: string;
  duration_ms: number;
  error_message: string;
  retry_count: number;
  created_at: string;
}

export function useCreateWebhookEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; url: string; description?: string; events: string[]; secret?: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "webhook_endpoints",
        p_data: data satisfies Record<string, unknown>, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "webhooks"] }),
  });
}

export function useUpdateWebhookStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "webhook_endpoints", p_id: id,
        p_data: { status, updated_at: new Date().toISOString() }, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "webhooks"] }),
  });
}

export function useDeleteWebhookEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "webhook_endpoints", p_id: id, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "webhooks"] }),
  });
}

// ── Active collaboration sessions ──
export function useActiveCollabSessions() {
  return useQuery({
    queryKey: ["admin", "collab-sessions"],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .rpc("admin_select", {
          p_session_token: token(), p_table: "collaboration_sessions",
          p_select: "id, page_id, user_name, user_color, status, current_block_id, last_activity",
          p_order_col: "last_activity", p_order_dir: "desc",
        });
      if (error) throw error;
      return ((data ?? []) as Array<Record<string, unknown>>)
        .filter((r) => r.last_activity && String(r.last_activity) >= fiveMinutesAgo);
    },
    refetchInterval: 15000,
  });
}

// ── Banned Users ──
export function useBannedUsers() {
  return useQuery({
    queryKey: ["admin", "banned-users"],
    queryFn: () => adminSelect<BannedUser>("banned_users", "*", { order: "created_at desc" }),
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, reason, ban_type, expires_at }: { user_id: string; reason: string; ban_type: string; expires_at?: string | null }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("ban_user", {
        p_user_id: user_id, p_reason: reason, p_ban_type: ban_type,
        p_expires_at: expires_at ?? null, p_session_token: token(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "banned-users"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useHardBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, reason }: { user_id: string; reason: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("hard_ban_user", {
        p_user_id: user_id, p_reason: reason, p_session_token: token(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "banned-users"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useUnbanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("unban_user", { p_user_id: user_id, p_session_token: token() });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "banned-users"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useDeleteUserData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("delete_user_data", { p_user_id: user_id, p_session_token: token() });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
  });
}

// ── Deleted Accounts (Trash) ──
export function useDeletedAccounts() {
  return useQuery({
    queryKey: ["admin", "deleted-accounts"],
    queryFn: () => adminSelect<DeletedAccount>("deleted_accounts", "*", { order: "deleted_at desc" }),
    refetchInterval: 30000,
  });
}

export function useRestoreAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (account_id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("restore_account", { p_account_id: account_id, p_session_token: token() });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "deleted-accounts"] }); },
  });
}

export function usePermanentDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (account_id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("permanently_delete_account", { p_account_id: account_id, p_session_token: token() });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "deleted-accounts"] }); },
  });
}

// ── Support Messages (Live Chat) ──
export function useSupportMessages(ticketId: string) {
  return useQuery({
    queryKey: ["admin", "support-messages", ticketId],
    queryFn: () => adminSelect<SupportMessage>("support_messages", "*", { order: "created_at asc", eq: ["ticket_id", ticketId] }),
    refetchInterval: 5000,
  });
}

export function useSendSupportMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { ticket_id: string; sender_type: "admin" | "user"; sender_id?: string; sender_name: string; message: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "support_messages",
        p_data: msg satisfies Record<string, unknown>, p_min_role: "support",
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "support-messages", variables.ticket_id] });
    },
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, assignedTo }: { id: string; status: string; assignedTo?: string | null }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const updates: Record<string, unknown> = { status, last_update: new Date().toISOString() };
      if (assignedTo !== undefined) updates.assigned_to = assignedTo;
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "support_tickets", p_id: id,
        p_data: updates, p_min_role: "support",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "support-tickets"] }),
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "support_tickets", p_id: id, p_min_role: "support",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "support-tickets"] }),
  });
}

// ── Realtime subscription hook ──
export function useRealtimeInvalidate(queryKey: string[], table: string, event: "INSERT" | "UPDATE" | "DELETE" | "*" = "*") {
  const qc = useQueryClient();
  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return;
    const channel = supabase
      .channel(`realtime-${table}-${Date.now()}`)
      .on("postgres_changes" as never, { event, schema: "public", table }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [qc, queryKey.join(","), table, event]);
}

export function useRealtimeAuditFeed(limit = 20) {
  const [events, setEvents] = useState<AuditEventRow[]>([]);
  const qc = useQueryClient();

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return;
    const channel = supabase
      .channel("realtime-audit-feed")
      .on("postgres_changes" as never, { event: "INSERT", schema: "public", table: "audit_events" }, (payload: { new: AuditEventRow }) => {
        setEvents((prev) => [payload.new, ...prev].slice(0, limit));
        qc.invalidateQueries({ queryKey: ["admin", "audit"] });
      })
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [limit]);

  return events;
}

// ── Changelog Entries ──
export function useChangelogEntries() {
  return useQuery({
    queryKey: ["admin", "changelog"],
    queryFn: () => adminSelect<import("./types").ChangelogEntry>("changelog_entries", "*", { order: "created_at desc" }),
  });
}

export function useCreateChangelogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; tag?: string; version?: string; published?: boolean; published_at?: string | null }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "changelog_entries",
        p_data: { ...data, updated_at: new Date().toISOString() } satisfies Record<string, unknown>, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "changelog"] }),
  });
}

export function useUpdateChangelogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; tag?: string; version?: string; published?: boolean; published_at?: string | null }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "changelog_entries", p_id: id,
        p_data: { ...data, updated_at: new Date().toISOString() } satisfies Record<string, unknown>, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "changelog"] }),
  });
}

export function useDeleteChangelogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "changelog_entries", p_id: id, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "changelog"] }),
  });
}

// ── Blog Posts ──
export function useBlogPosts() {
  return useQuery({
    queryKey: ["admin", "blog-posts"],
    queryFn: () => adminSelect<import("./types").BlogPost>("blog_posts", "*", { order: "created_at desc" }),
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; slug: string; excerpt?: string; content?: string; author?: string; cover_image?: string; tags?: string[]; published?: boolean; published_at?: string | null }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "blog_posts",
        p_data: { ...data, tags: data.tags ?? [], updated_at: new Date().toISOString() } satisfies Record<string, unknown>, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "blog-posts"] }),
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; slug?: string; excerpt?: string; content?: string; author?: string; cover_image?: string; tags?: string[]; published?: boolean; published_at?: string | null }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "blog_posts", p_id: id,
        p_data: { ...data, updated_at: new Date().toISOString() } satisfies Record<string, unknown>, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "blog-posts"] }),
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "blog_posts", p_id: id, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "blog-posts"] }),
  });
}

// ── Legal Pages ──
export function useLegalPages() {
  return useQuery({
    queryKey: ["admin", "legal-pages"],
    queryFn: () => adminSelect<import("./types").LegalPage>("legal_pages", "*", { order: "title asc" }),
  });
}

export function useCreateLegalPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; slug: string; content?: string; published?: boolean }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "legal_pages",
        p_data: { ...data, updated_at: new Date().toISOString() } satisfies Record<string, unknown>, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "legal-pages"] }),
  });
}

export function useUpdateLegalPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; slug?: string; content?: string; published?: boolean }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "legal_pages", p_id: id,
        p_data: { ...data, updated_at: new Date().toISOString() } satisfies Record<string, unknown>, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "legal-pages"] }),
  });
}

export function useDeleteLegalPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "legal_pages", p_id: id, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "legal-pages"] }),
  });
}

// ── Broadcast Campaigns ──
export function useBroadcasts() {
  return useQuery({
    queryKey: ["admin", "broadcasts"],
    queryFn: () => adminSelect<import("./types").BroadcastCampaign>("admin_broadcasts", "*", { order: "created_at desc" }),
  });
}

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "admin_broadcasts",
        p_data: { ...data, updated_at: new Date().toISOString() } satisfies Record<string, unknown>, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "broadcasts"] }),
  });
}

export function useUpdateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "admin_broadcasts", p_id: id,
        p_data: { ...data, updated_at: new Date().toISOString() } satisfies Record<string, unknown>, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "broadcasts"] }),
  });
}

export function useDeleteBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "admin_broadcasts", p_id: id, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "broadcasts"] }),
  });
}

// ── Admin Accounts Mutations ──
export function useInviteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, email, role }: { name: string; email: string; role: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "admin_users",
        p_data: { name, email, role, avatar_url: null }, p_min_role: "super_admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "admin-users"] }),
  });
}

export function useDeleteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "admin_users", p_id: id, p_min_role: "super_admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "admin-users"] }),
  });
}

export function useUpdateAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "admin_users", p_id: id,
        p_data: { role }, p_min_role: "super_admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "admin-users"] }),
  });
}

// ── Subscription Provisioning ──
export function useProvisionSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sub: { customer_name: string; email: string; plan: string; mrr: number; started_at: string; renews_at: string; payment_method: string; status: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "subscriptions",
        p_data: sub satisfies Record<string, unknown>, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "subscriptions"] }),
  });
}

// ── Waitlist Mutations ──
export function useDeleteWaitlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "waitlist_entries", p_id: id, p_min_role: "support",
      });
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["admin", "waitlist"] });
      const previous = qc.getQueryData<DbWaitlistEntry[]>(["admin", "waitlist"]);
      qc.setQueryData<DbWaitlistEntry[]>(["admin", "waitlist"], (old) => old?.filter((e) => e.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => { if (context?.previous) qc.setQueryData(["admin", "waitlist"], context.previous); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "waitlist"] }),
  });
}

export function useSendWaitlistInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "waitlist_entries", p_id: id,
        p_data: { invite_sent: true, status: "invited", invite_code: code }, p_min_role: "support",
      });
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["admin", "waitlist"] });
      const previous = qc.getQueryData<DbWaitlistEntry[]>(["admin", "waitlist"]);
      qc.setQueryData<DbWaitlistEntry[]>(["admin", "waitlist"], (old) =>
        old?.map((e) => e.id === id ? { ...e, status: "invited", invite_sent: true } : e)
      );
      return { previous };
    },
    onError: (_err, _id, context) => { if (context?.previous) qc.setQueryData(["admin", "waitlist"], context.previous); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "waitlist"] }),
  });
}

export function useApproveWaitlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "waitlist_entries", p_id: id,
        p_data: { status: "accepted", approved_at: new Date().toISOString() }, p_min_role: "support",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "waitlist"] }),
  });
}

export function useRejectWaitlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "waitlist_entries", p_id: id,
        p_data: { status: "rejected", rejected_at: new Date().toISOString() }, p_min_role: "support",
      });
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["admin", "waitlist"] });
      const previous = qc.getQueryData<DbWaitlistEntry[]>(["admin", "waitlist"]);
      qc.setQueryData<DbWaitlistEntry[]>(["admin", "waitlist"], (old) =>
        old?.map((e) => e.id === id ? { ...e, status: "rejected", rejected_at: new Date().toISOString() } : e)
      );
      return { previous };
    },
    onError: (_err, _id, context) => { if (context?.previous) qc.setQueryData(["admin", "waitlist"], context.previous); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "waitlist"] }),
  });
}

// ── API Keys Mutations ──
export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; scopes: string[] }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const prefix = "nsk_" + Array.from({ length: 8 }, () => Math.random().toString(36)[2]).join("");
      const key = prefix + "_" + Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join("");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "api_keys",
        p_data: { name: data.name, prefix, key, scopes: data.scopes, usage_this_month: 0 },
        p_min_role: "admin",
      });
      if (error) throw error;
      return { prefix, key, name: data.name };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "api-keys"] }),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "api_keys", p_id: id, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "api-keys"] }),
  });
}

// ── Email Campaigns Mutations ──
export function useCreateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; subject: string; html_content: string; status: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "email_campaigns",
        p_data: { ...data, recipients: 0, sent: 0, open_rate: "0", click_rate: "0", bounce_rate: "0" }, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns"] }),
  });
}

export function useUpdateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; subject?: string; html_content?: string; status?: string; scheduled_for?: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "email_campaigns", p_id: id,
        p_data: { ...data }, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns"] }),
  });
}

export function useDeleteEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "email_campaigns", p_id: id, p_min_role: "support",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns"] }),
  });
}

// ── Email Template Queries ──
export function useEmailTemplates() {
  return useQuery({
    queryKey: ["admin", "email-templates"],
    queryFn: () => adminSelect<import("./types").EmailTemplate>("email_templates", "*", { order: "updated_at desc" }),
  });
}

export function useEmailTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "email-templates", id],
    enabled: !!id,
    queryFn: async () => {
      const data = await adminSelect<import("./types").EmailTemplate>("email_templates", "*");
      return data?.find((t) => t.id === id) ?? null;
    },
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "email_templates", p_data: data, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "email-templates"] }),
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "email_templates", p_id: id, p_data: data, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "email-templates"] }),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "email_templates", p_id: id, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "email-templates"] }),
  });
}

// ── Email Branding Queries ──
export function useEmailBranding() {
  return useQuery({
    queryKey: ["admin", "email-branding"],
    queryFn: async () => {
      const data = await adminSelect<import("./types").EmailBranding>("email_branding", "*");
      return data?.[0] ?? null;
    },
  });
}

export function useUpdateEmailBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "email_branding", p_id: id, p_data: data, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "email-branding"] }),
  });
}

// ── Email Segment Queries ──
export function useEmailSegments() {
  return useQuery({
    queryKey: ["admin", "email-segments"],
    queryFn: () => adminSelect<import("./types").EmailSegment>("email_segments", "*", { order: "name asc" }),
  });
}

export function useCreateEmailSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "email_segments", p_data: data, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "email-segments"] }),
  });
}

export function useDeleteEmailSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "email_segments", p_id: id, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "email-segments"] }),
  });
}

// ── Email Version Queries ──
export function useEmailVersions(templateId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "email-versions", templateId],
    enabled: !!templateId,
    queryFn: () => adminSelect<import("./types").EmailVersion>(
      "email_versions", "*", { order: "version_number desc" }
    ).then((rows) => rows?.filter((v) => v.template_id === templateId) ?? []),
  });
}

export function useCreateEmailVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "email_versions", p_data: data, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "email-versions"] }),
  });
}

// ── Email History Queries ──
export function useEmailHistory(limit = 50) {
  return useQuery({
    queryKey: ["admin", "email-history", limit],
    queryFn: () => adminSelect<import("./types").EmailHistoryEntry>(
      "email_history", "*", { order: "created_at desc", limit }
    ),
  });
}

export function useEmailHistoryStats() {
  return useQuery({
    queryKey: ["admin", "email-history-stats"],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return defaultStats();
      const { data, error } = await supabase.rpc("admin_select", {
        p_session_token: token(), p_table: "email_history", p_select: "*",
        p_order_col: "created_at", p_order_dir: "desc",
      });
      if (error) throw error;
      const entries = (data ?? []) as import("./types").EmailHistoryEntry[];
      const today = entries.filter((e) =>
        new Date(e.created_at).toDateString() === new Date().toDateString()
      );
      const total = today.length;
      const delivered = today.filter((e) => e.status === "delivered" || e.status === "sent").length;
      const opened = today.filter((e) => e.status === "opened" || e.status === "clicked").length;
      const clicked = today.filter((e) => e.status === "clicked").length;
      const bounced = today.filter((e) => e.status === "bounced").length;
      const spammed = today.filter((e) => e.status === "complained").length;
      return {
        sentToday: total,
        deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
        clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
        bounceRate: total > 0 ? Math.round((bounced / total) * 100) : 0,
        spamRate: total > 0 ? Math.round((spammed / total) * 100) : 0,
      };
    },
    refetchInterval: 30000,
  });
}

function defaultStats() {
  return { sentToday: 0, deliveryRate: 0, openRate: 0, clickRate: 0, bounceRate: 0, spamRate: 0 };
}

// ── Newsletter Subscriber Queries ──
export function useNewsletterSubscribers() {
  return useQuery({
    queryKey: ["admin", "newsletter-subscribers"],
    queryFn: () => adminSelect<import("./types").NewsletterSubscriber>(
      "newsletter_subscribers", "*", { order: "created_at desc" }
    ),
  });
}

// ── Integration Mutations ──
export function useSyncIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "integrations", p_id: id,
        p_data: { last_sync_at: new Date().toISOString() }, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "integrations"] }),
  });
}

export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "integrations", p_id: id,
        p_data: { status: "disconnected" }, p_min_role: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "integrations"] }),
  });
}

// ── Launch Control ──
import type { LaunchSettings, LandingContent, CTAButton, AnnouncementBar, WaitlistSettings, SocialLink, SEOSettings, LaunchAuditLog, WaitlistStats } from "./types";

export function useLaunchSettings() {
  return useQuery({
    queryKey: ["admin", "launch-settings"],
    queryFn: async () => {
      const data = await adminSelect<LaunchSettings>("launch_settings", "*");
      return data?.[0] ?? null;
    },
  });
}

export function useUpdateLaunchSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<LaunchSettings> & { admin_name?: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const existing = await adminSelect<LaunchSettings>("launch_settings", "*");
      const id = existing?.[0]?.id;
      if (!id) throw new Error("No launch settings found");
      const { admin_name, ...updates } = data;
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "launch_settings", p_id: id,
        p_data: { ...updates, updated_at: new Date().toISOString(), updated_by: getAdminId() }, p_min_role: "super_admin",
      });
      if (error) throw error;
      // Log audit
      for (const [key, newVal] of Object.entries(updates)) {
        const oldVal = existing[0]?.[key as keyof LaunchSettings];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          try { await supabase.rpc("log_launch_audit", {
            p_admin_name: admin_name ?? "Unknown",
            p_action: "update",
            p_entity_type: "launch_settings",
            p_entity_id: id,
            p_field: key,
            p_old_value: JSON.parse(JSON.stringify(oldVal ?? null)),
            p_new_value: JSON.parse(JSON.stringify(newVal)),
          }); } catch {}
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "launch-settings"] });
    },
  });
}

export function useLandingContent() {
  return useQuery({
    queryKey: ["admin", "landing-content"],
    queryFn: () => adminSelect<LandingContent>("landing_content", "*", { order: "sort_order asc" }),
  });
}

export function useUpdateLandingContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, admin_name, ...data }: { id: string; admin_name?: string } & Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "landing_content", p_id: id,
        p_data: { ...data, updated_at: new Date().toISOString(), updated_by: getAdminId() }, p_min_role: "marketing",
      });
      if (error) throw error;
      try { await supabase.rpc("log_launch_audit", {
        p_admin_name: admin_name ?? "Unknown",
        p_action: "update", p_entity_type: "landing_content", p_entity_id: id,
      }); } catch {}
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "landing-content"] }),
  });
}

// ── CTA Buttons ──
export function useCTAButtons() {
  return useQuery({
    queryKey: ["admin", "cta-buttons"],
    queryFn: () => adminSelect<CTAButton>("cta_buttons", "*", { order: "priority asc" }),
  });
}

export function useUpdateCTAButton() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, admin_name, ...data }: { id: string; admin_name?: string } & Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "cta_buttons", p_id: id,
        p_data: { ...data, updated_at: new Date().toISOString(), updated_by: getAdminId() }, p_min_role: "marketing",
      });
      if (error) throw error;
      try { await supabase.rpc("log_launch_audit", {
        p_admin_name: admin_name ?? "Unknown",
        p_action: "update", p_entity_type: "cta_button", p_entity_id: id,
        p_field: Object.keys(data).join(", "),
      }); } catch {}
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cta-buttons"] }),
  });
}

export function useResetCTAButton() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "cta_buttons", p_id: id,
        p_data: { destination: null, button_text: null, variant: null, visible: true, enabled: true, updated_at: new Date().toISOString() }, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cta-buttons"] }),
  });
}

// ── Announcement Bar ──
export function useAnnouncementBar() {
  return useQuery({
    queryKey: ["admin", "announcement-bar"],
    queryFn: async () => {
      const data = await adminSelect<AnnouncementBar>("announcement_bar", "*");
      return data?.[0] ?? null;
    },
  });
}

export function useUpdateAnnouncementBar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<AnnouncementBar> & { admin_name?: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const existing = await adminSelect<AnnouncementBar>("announcement_bar", "*");
      const id = existing?.[0]?.id;
      if (!id) throw new Error("No announcement bar found");
      const { admin_name, ...updates } = data;
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "announcement_bar", p_id: id,
        p_data: { ...updates, updated_at: new Date().toISOString(), updated_by: getAdminId() }, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "announcement-bar"] }),
  });
}

// ── Waitlist Settings ──
export function useWaitlistSettings() {
  return useQuery({
    queryKey: ["admin", "waitlist-settings"],
    queryFn: async () => {
      const data = await adminSelect<WaitlistSettings>("waitlist_settings", "*");
      return data?.[0] ?? null;
    },
  });
}

export function useUpdateWaitlistSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<WaitlistSettings>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const existing = await adminSelect<WaitlistSettings>("waitlist_settings", "*");
      const id = existing?.[0]?.id;
      if (!id) throw new Error("No waitlist settings found");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "waitlist_settings", p_id: id,
        p_data: { ...data, updated_at: new Date().toISOString(), updated_by: getAdminId() }, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "waitlist-settings"] }),
  });
}

export function useWaitlistStats() {
  return useQuery({
    queryKey: ["admin", "waitlist-stats"],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return null;
      const { data, error } = await supabase.rpc("get_waitlist_stats", { p_session_token: token() });
      if (error) throw error;
      return data as WaitlistStats;
    },
  });
}

// ── Social Links ──
export function useSocialLinks() {
  return useQuery({
    queryKey: ["admin", "social-links"],
    queryFn: () => adminSelect<SocialLink>("social_links", "*", { order: "sort_order asc" }),
  });
}

export function useUpdateSocialLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "social_links", p_id: id,
        p_data: data, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "social-links"] }),
  });
}

// ── SEO Settings ──
export function useSEOSettings(pagePath = "/") {
  return useQuery({
    queryKey: ["admin", "seo", pagePath],
    queryFn: async () => {
      const data = await adminSelect<SEOSettings>("seo_settings", "*", { eq: ["page_path", pagePath] });
      return data?.[0] ?? null;
    },
  });
}

export function useUpdateSEOSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ page_path, admin_name, ...data }: { page_path: string; admin_name?: string } & Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const existing = await adminSelect<SEOSettings>("seo_settings", "*", { eq: ["page_path", page_path] });
      const id = existing?.[0]?.id;
      if (id) {
        const { error } = await supabase.rpc("admin_update", {
          p_session_token: token(), p_table: "seo_settings", p_id: id,
          p_data: { ...data, updated_at: new Date().toISOString(), updated_by: getAdminId() }, p_min_role: "marketing",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("admin_insert", {
          p_session_token: token(), p_table: "seo_settings",
          p_data: { page_path, ...data, updated_by: getAdminId() }, p_min_role: "marketing",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "seo"] }),
  });
}

// ── Launch Audit Log ──
export function useLaunchAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ["admin", "launch-audit", limit],
    queryFn: () => adminSelect<LaunchAuditLog>("launch_audit_log", "*", { order: "created_at desc", limit }),
  });
}

// Helper to get admin ID from session
function getAdminId(): string | null {
  try {
    const token = getAdminToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    return payload.sub ?? payload.admin_id ?? null;
  } catch { return null; }
}

// ── Referral Types ──
export interface DbReferralCode {
  id: string; user_id: string; code: string;
  total_referrals: number; active_referrals: number;
  rewards_earned: number; ai_credits: number; xp: number; level: number;
  created_at: string; updated_at: string;
}

export interface DbReferralReward {
  id: string; name: string; description: string | null;
  type: string; value: number; min_referrals: number;
  icon: string | null; color: string | null; active: boolean;
  created_at: string;
}

export interface DbUserReferral {
  id: string; referrer_id: string; referred_id: string;
  referral_code_id: string | null;
  status: string; reward_claimed: boolean;
  reward_id: string | null; joined_at: string | null;
  created_at: string;
}

export function useReferralCodes() {
  return useQuery({
    queryKey: ["admin", "referral-codes"],
    queryFn: () => adminSelect<DbReferralCode>("referral_codes", "*", { order: "created_at desc" }),
  });
}

export function useReferralRewards() {
  return useQuery({
    queryKey: ["admin", "referral-rewards"],
    queryFn: () => adminSelect<DbReferralReward>("referral_rewards", "*", { order: "min_referrals asc" }),
  });
}

export function useUserReferrals() {
  return useQuery({
    queryKey: ["admin", "user-referrals"],
    queryFn: () => adminSelect<DbUserReferral>("user_referrals", "*", { order: "created_at desc" }),
  });
}

export function useCreateReferralReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_insert", {
        p_session_token: token(), p_table: "referral_rewards", p_data: data,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "referral-rewards"] }),
  });
}

export function useUpdateReferralReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: unknown }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "referral_rewards", p_id: id, p_data: data,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "referral-rewards"] }),
  });
}

export function useDeleteReferralReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: token(), p_table: "referral_rewards", p_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "referral-rewards"] }),
  });
}

// ── Feedback Mutations ──
export function useUpdateFeedbackStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: token(), p_table: "feedback", p_id: id,
        p_data: { status }, p_min_role: "support",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "feedback"] }),
  });
}

