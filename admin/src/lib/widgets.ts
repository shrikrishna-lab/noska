/**
 * Widget platform admin data layer — talks to the widget RPC family
 * (admin_widget_*) which are gated server-side on require_admin_role.
 * The catalog table itself is readable only through admin_widget_overview.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_ENABLED, getAdminToken } from "@/lib/supabase";

function token(): string {
  const t = getAdminToken();
  if (!t) throw new Error("No admin session. Please sign in again.");
  return t;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface WidgetCatalogRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: "enabled" | "beta" | "disabled";
  rollout_percent: number;
  default_enabled: boolean;
  default_size: string;
  allowed_sizes: string[] | null;
  platforms: string[] | null;
  required_integration: string | null;
  min_app_version: string | null;
  default_config: Record<string, unknown> | null;
  version: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WidgetEvents7d {
  renders: number;
  interactions: number;
  errors: number;
  avg_load_ms: number | null;
  p95_load_ms: number | null;
  unique_users: number;
}

export interface WidgetPerWidget7d {
  widget_id: string;
  renders: number;
  interactions: number;
  errors: number;
  users: number;
  avg_load_ms: number | null;
}

export interface WidgetOverview {
  catalog: WidgetCatalogRow[];
  totals: { total: number; enabled: number; beta: number; disabled: number };
  events_7d: WidgetEvents7d;
  per_widget_7d: WidgetPerWidget7d[];
}

export interface WidgetDailyBucket {
  day: string;
  renders: number;
  interactions: number;
  errors: number;
  users: number;
  avg_load_ms: number | null;
}

export interface WidgetAnalytics {
  daily: WidgetDailyBucket[];
  totals: {
    renders: number;
    interactions: number;
    errors: number;
    unique_users: number;
    avg_load_ms: number | null;
    p95_load_ms: number | null;
  };
  platforms: Array<{ platform: string; renders: number; users: number }>;
  adoption: { users_with_layout: number };
}

export interface WidgetErrorGroup {
  error_message: string | null;
  frequency: number;
  affected_users: number;
  first_seen: string;
  last_seen: string;
}

export interface WidgetAuditRow {
  id: number;
  admin_email: string | null;
  action: string;
  widget_id: string | null;
  previous: Record<string, unknown> | null;
  next: Record<string, unknown> | null;
  created_at: string;
}

// ── RPC helpers ─────────────────────────────────────────────────────────────

async function rpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.rpc(fn, { p_session_token: token(), ...params });
  if (error) throw error;
  return data as T;
}

// ── Queries ─────────────────────────────────────────────────────────────────

export function useWidgetOverview() {
  return useQuery({
    queryKey: ["admin", "widgets", "overview"],
    queryFn: () => rpc<WidgetOverview>("admin_widget_overview", {}),
    refetchInterval: 60_000,
  });
}

export function useWidgetAnalytics(widgetId: string | null, days = 14) {
  return useQuery({
    queryKey: ["admin", "widgets", "analytics", widgetId, days],
    queryFn: () => rpc<WidgetAnalytics>("admin_widget_analytics", { p_widget_id: widgetId, p_days: days }),
    enabled: Boolean(widgetId),
  });
}

export function useWidgetErrors(widgetId: string | null) {
  return useQuery({
    queryKey: ["admin", "widgets", "errors", widgetId],
    queryFn: () => rpc<WidgetErrorGroup[]>("admin_widget_errors", { p_widget_id: widgetId, p_limit: 50 }),
    enabled: Boolean(widgetId),
  });
}

export function useWidgetAudit(widgetId: string | null) {
  return useQuery({
    queryKey: ["admin", "widgets", "audit", widgetId ?? "all"],
    queryFn: () => rpc<WidgetAuditRow[]>("admin_widget_audit", { p_widget_id: widgetId, p_limit: 100 }),
  });
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function useUpdateWidget(widgetId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      rpc<WidgetCatalogRow>("admin_widget_update", { p_widget_id: widgetId, p_data: data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "widgets"] });
    },
  });
}
