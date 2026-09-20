import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminToken, supabase } from "./supabase";
import { useAuth } from "./auth";
import { hasRole } from "./rbac";

const count = z.number().int().nonnegative().nullable();
const timestamp = z.string().datetime({ offset: true });

export const notificationPlatformOverviewSchema = z.object({
  generated_at: timestamp,
  window_start: timestamp,
  kpis: z.object({
    notifications: count,
    deliveries: count,
    sent: count,
    failed: count,
    pending: count,
    read: count,
    read_rate: z.number().min(0).max(100).nullable(),
    reminders_pending: count,
  }),
  channels: z.array(z.object({
    channel: z.string(),
    available: z.boolean(),
    reason: z.string().nullable(),
  })),
  recent: z.array(z.object({
    id: z.string(),
    notification_id: z.string(),
    user_id: z.string(),
    title: z.string(),
    type: z.string(),
    channel: z.string(),
    status: z.string(),
    is_test: z.boolean(),
    created_at: timestamp,
    delivered_at: timestamp.nullable(),
    read_at: timestamp.nullable(),
    error: z.string().nullable(),
  })),
});

export type NotificationPlatformOverview = z.infer<typeof notificationPlatformOverviewSchema>;
export type NotificationDelivery = NotificationPlatformOverview["recent"][number];
export const PLATFORM_NOTIFICATION_TYPES = ["system", "task", "mention", "ai", "automation", "invite", "broadcast"] as const;

export const platformTestInputSchema = z.object({
  userIds: z.array(z.string().trim().min(1).max(200).regex(/^[a-zA-Z0-9_@.+-]+$/)).min(1).max(10)
    .transform((ids) => [...new Set(ids)]),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(1000),
  type: z.enum(PLATFORM_NOTIFICATION_TYPES),
});

export type PlatformTestInput = z.infer<typeof platformTestInputSchema>;
export const platformSendResultSchema = z.object({
  ids: z.array(z.string()),
  count: z.number().int().nonnegative(),
});

export function parseTargetIds(text: string): string[] {
  return [...new Set(text.split(/[\s,]+/).filter(Boolean))];
}

export function filterNotificationDeliveries(rows: NotificationDelivery[], filters: {
  search: string; channel: string; status: string; type: string; mode: string; read: string;
}): NotificationDelivery[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((row) =>
    (filters.channel === "all" || row.channel === filters.channel) &&
    (filters.status === "all" || row.status === filters.status) &&
    (filters.type === "all" || row.type === filters.type) &&
    (filters.mode === "all" || row.is_test === (filters.mode === "test")) &&
    (filters.read === "all" || Boolean(row.read_at) === (filters.read === "read")) &&
    (!search || [row.title, row.user_id, row.notification_id, row.error ?? ""].some((value) => value.toLowerCase().includes(search))),
  );
}

export function notificationPlatformError(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === "PGRST202" || code === "42883") return "The notification platform RPC is not deployed yet. Legacy notifications remain available in the Legacy sends tab.";
  if (code === "42501") return "Access denied or admin session expired. Sign in again with an authorized administrator account.";
  if (error instanceof z.ZodError) return "The notification platform returned an unsupported response. Metrics and test sends are unavailable until the backend contract matches.";
  return "Notification platform unavailable. Check your connection and refresh; no metrics have been substituted.";
}

async function platformRpc(name: string, params: Record<string, unknown> = {}) {
  const token = getAdminToken();
  if (!token) throw new Error("No admin session. Please sign in again.");
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.rpc(name, { ...params, p_session_token: token });
  if (error) throw error;
  return data;
}

export async function fetchNotificationPlatformOverview(): Promise<NotificationPlatformOverview> {
  return notificationPlatformOverviewSchema.parse(await platformRpc("admin_notification_platform_overview"));
}

export async function sendNotificationPlatformTest(input: PlatformTestInput) {
  const validated = platformTestInputSchema.parse(input);
  return platformSendResultSchema.parse(await platformRpc("admin_notification_platform_send", {
    p_user_ids: validated.userIds,
    p_title: validated.title,
    p_body: validated.body,
    p_type: validated.type,
    p_is_test: true,
  }));
}

export function useNotificationPlatformOverview() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin", "notification-platform", user?.id],
    queryFn: fetchNotificationPlatformOverview,
    enabled: hasRole(user, "admin"),
    retry: false,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useSendNotificationPlatformTest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: PlatformTestInput) => {
      if (!hasRole(user, "admin")) throw new Error("Administrator role required.");
      return sendNotificationPlatformTest(input);
    },
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "notification-platform"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "user-notifications"] });
    },
  });
}
