/**
 * Admin data layer for server-delivered user notifications
 * (user_notifications table via the admin_user_notification_* RPCs).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_ENABLED, getAdminToken } from "@/lib/supabase";

function token(): string {
  const t = getAdminToken();
  if (!t) throw new Error("No admin session. Please sign in again.");
  return t;
}

export interface UserNotificationRow {
  id: string;
  title: string;
  body: string;
  category: string;
  severity: string;
  is_test: boolean;
  created_by_email: string | null;
  created_at: string;
  broadcast: boolean;
  target_label: string;
  read_count: number;
}

export interface UserNotificationKpis {
  sent_30d: number;
  broadcasts_30d: number;
  tests_30d: number;
  recipients_30d: number;
  read_rate_30d: number | null;
}

export interface UserNotificationOverview {
  kpis: UserNotificationKpis;
  recent: UserNotificationRow[];
}

async function rpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.rpc(fn, { p_session_token: token(), ...params });
  if (error) throw error;
  return data as T;
}

export function useUserNotificationOverview() {
  return useQuery({
    queryKey: ["admin", "user-notifications", "overview"],
    queryFn: () => rpc<UserNotificationOverview>("admin_user_notification_overview", {}),
    refetchInterval: 60_000,
  });
}

export interface SendNotificationInput {
  title: string;
  body: string;
  category: string;
  severity: string;
  broadcast: boolean;
  userIds: string[];
  isTest: boolean;
}

export function useSendUserNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendNotificationInput) =>
      rpc<{ ids: string[]; count: number; broadcast: boolean }>("admin_user_notification_send", {
        p_title: input.title,
        p_body: input.body,
        p_category: input.category,
        p_severity: input.severity,
        p_user_ids: input.broadcast ? null : input.userIds,
        p_broadcast: input.broadcast,
        p_is_test: input.isTest,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "user-notifications"] });
    },
  });
}

export function useDeleteUserNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      rpc<boolean>("admin_user_notification_delete", { p_notification_id: notificationId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "user-notifications"] });
    },
  });
}
