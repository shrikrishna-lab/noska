import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { supabase, getAdminToken, SUPABASE_ENABLED } from "@/lib/supabase";
import { subscribeRealtime, subscribeRealtimeInvalidation } from "@/lib/realtime";
import { useIslandNotification } from "@/components/ui/DynamicIslandNotification";
import type { AppNotification, NotificationsResponse, NotificationFilters } from "./types";

function token(): string {
  const t = getAdminToken();
  if (!t) throw new Error("No admin session");
  return t;
}

// ─── Helpers ───

async function searchNotifications(filters: NotificationFilters): Promise<NotificationsResponse> {
  if (!SUPABASE_ENABLED || !supabase) {
    return { data: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
  }
  const { data, error } = await supabase.rpc("search_notifications", {
    p_session_token: token(),
    p_search: filters.search ?? null,
    p_status: filters.status ?? null,
    p_severity: filters.severity ?? null,
    p_source: filters.source ?? null,
    p_type: filters.type ?? null,
    p_page: filters.page ?? 1,
    p_page_size: filters.pageSize ?? 20,
    p_sort_by: filters.sortBy ?? "created_at",
    p_sort_dir: filters.sortDir ?? "desc",
  });
  if (error) throw error;
  return data as unknown as NotificationsResponse;
}

async function getNotification(id: string): Promise<AppNotification> {
  if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
  const { data, error } = await supabase.rpc("admin_select", {
    p_session_token: token(),
    p_table: "notifications",
    p_select: "*",
    p_eq_col: "id",
    p_eq_val: id,
    p_limit: 1,
  });
  if (error) throw error;
  const rows = data as AppNotification[];
  if (!rows || rows.length === 0) throw new Error("Notification not found");
  return rows[0];
}

async function getUnreadCount(): Promise<number> {
  if (!SUPABASE_ENABLED || !supabase) return 0;
  const { data, error } = await supabase.rpc("get_unread_notification_count", {
    p_session_token: token(),
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

async function markNotificationRead(id: string): Promise<void> {
  if (!SUPABASE_ENABLED || !supabase) return;
  const { error } = await supabase.rpc("admin_update", {
    p_session_token: token(),
    p_table: "notifications",
    p_id: id,
    p_data: { status: "read", read_at: new Date().toISOString() },
    p_min_role: "support",
  });
  if (error) throw error;
}

async function markNotificationUnread(id: string): Promise<void> {
  if (!SUPABASE_ENABLED || !supabase) return;
  const { error } = await supabase.rpc("admin_update", {
    p_session_token: token(),
    p_table: "notifications",
    p_id: id,
    p_data: { status: "unread", read_at: null },
    p_min_role: "support",
  });
  if (error) throw error;
}

async function markAllNotificationsRead(): Promise<void> {
  if (!SUPABASE_ENABLED || !supabase) return;
  const { error } = await supabase.rpc("bulk_update_notifications", {
    p_session_token: token(),
    p_data: { status: "read", read_at: new Date().toISOString() },
    p_status_filter: "unread",
  });
  if (error) throw error;
}

async function archiveNotification(id: string): Promise<void> {
  if (!SUPABASE_ENABLED || !supabase) return;
  const { error } = await supabase.rpc("admin_update", {
    p_session_token: token(),
    p_table: "notifications",
    p_id: id,
    p_data: { status: "archived", archived_at: new Date().toISOString() },
    p_min_role: "support",
  });
  if (error) throw error;
}

async function deleteNotification(id: string): Promise<void> {
  if (!SUPABASE_ENABLED || !supabase) return;
  const { error } = await supabase.rpc("admin_delete", {
    p_session_token: token(),
    p_table: "notifications",
    p_id: id,
    p_min_role: "support",
  });
  if (error) throw error;
}

// ─── Query Keys ───

const NOTIF_KEYS = {
  all: ["notifications"] as const,
  list: (filters: NotificationFilters) => ["notifications", "list", filters] as const,
  detail: (id: string) => ["notifications", "detail", id] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

// ─── Hooks ───

export function useNotificationsList(filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: NOTIF_KEYS.list(filters),
    queryFn: () => searchNotifications(filters),
    staleTime: 15000,
  });
}

export function useNotification(id: string) {
  return useQuery({
    queryKey: NOTIF_KEYS.detail(id),
    queryFn: () => getNotification(id),
    enabled: !!id,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: NOTIF_KEYS.unreadCount,
    queryFn: getUnreadCount,
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

export function useTopNotifications(limit = 5) {
  return useQuery<AppNotification[]>({
    queryKey: ["notifications", "top", limit],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const { data, error } = await supabase.rpc("admin_select", {
        p_session_token: token(),
        p_table: "notifications",
        p_select: "*",
        p_order_col: "created_at",
        p_order_dir: "desc",
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

// ─── Mutations (with optimistic updates) ───

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousData = queryClient.getQueriesData({ queryKey: ["notifications"] });

      queryClient.setQueriesData<{ data: AppNotification[] } | AppNotification[]>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old) return old;
          const now = new Date().toISOString();
          if (Array.isArray(old)) {
            return old.map((n: AppNotification) =>
              n.id === id ? { ...n, status: "read" as const, read_at: now } : n
            );
          }
          if ("data" in old && Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.map((n: AppNotification) =>
                n.id === id ? { ...n, status: "read" as const, read_at: now } : n
              ),
            };
          }
          return old;
        }
      );

      queryClient.setQueryData(NOTIF_KEYS.unreadCount, (old: number) => Math.max(0, (old ?? 1) - 1));
      queryClient.setQueryData(NOTIF_KEYS.detail(id), (old: AppNotification | undefined) => {
        if (!old) return old;
        return { ...old, status: "read" as const, read_at: new Date().toISOString() };
      });

      return { previousData };
    },
    onError: (_err, _id, context) => {
      toast.error("Failed to mark notification as read");
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          if (data !== undefined) queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "detail"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "top"] });
    },
  });
}

export function useMarkUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationUnread(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousData = queryClient.getQueriesData({ queryKey: ["notifications"] });

      queryClient.setQueriesData<{ data: AppNotification[] } | AppNotification[]>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((n: AppNotification) =>
              n.id === id ? { ...n, status: "unread" as const, read_at: null } : n
            );
          }
          if ("data" in old && Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.map((n: AppNotification) =>
                n.id === id ? { ...n, status: "unread" as const, read_at: null } : n
              ),
            };
          }
          return old;
        }
      );

      queryClient.setQueryData(NOTIF_KEYS.unreadCount, (old: number) => (old ?? 0) + 1);
      queryClient.setQueryData(NOTIF_KEYS.detail(id), (old: AppNotification | undefined) => {
        if (!old) return old;
        return { ...old, status: "unread" as const, read_at: null };
      });

      return { previousData };
    },
    onError: (_err, _id, context) => {
      toast.error("Failed to mark notification as unread");
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          if (data !== undefined) queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "detail"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "top"] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousData = queryClient.getQueriesData({ queryKey: ["notifications"] });
      const previousUnread = queryClient.getQueryData(NOTIF_KEYS.unreadCount);

      queryClient.setQueriesData<{ data: AppNotification[] } | AppNotification[]>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old) return old;
          const now = new Date().toISOString();
          if (Array.isArray(old)) {
            return old.map((n: AppNotification) =>
              n.status === "unread" ? { ...n, status: "read" as const, read_at: now } : n
            );
          }
          if ("data" in old && Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.map((n: AppNotification) =>
                n.status === "unread" ? { ...n, status: "read" as const, read_at: now } : n
              ),
            };
          }
          return old;
        }
      );

      queryClient.setQueryData(NOTIF_KEYS.unreadCount, 0);

      return { previousData, previousUnread };
    },
    onError: (_err, _vars, context) => {
      toast.error("Failed to mark all notifications as read");
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          if (data !== undefined) queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousUnread !== undefined) {
        queryClient.setQueryData(NOTIF_KEYS.unreadCount, context.previousUnread);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useArchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveNotification(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousData = queryClient.getQueriesData({ queryKey: ["notifications"] });

      queryClient.setQueriesData<{ data: AppNotification[]; total?: number; page_size?: number } | AppNotification[]>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.filter((n: AppNotification) => n.id !== id);
          }
          if ("data" in old && Array.isArray(old.data)) {
            const resp = old as { data: AppNotification[]; total: number; page_size: number };
            return {
              ...old,
              data: old.data.filter((n: AppNotification) => n.id !== id),
              total: Math.max(0, resp.total - 1),
              total_pages: Math.max(1, Math.ceil((resp.total - 1) / resp.page_size)),
            };
          }
          return old;
        }
      );

      const prevUnread = queryClient.getQueryData(NOTIF_KEYS.unreadCount);
      queryClient.setQueryData(NOTIF_KEYS.unreadCount, (old: number) => Math.max(0, (old ?? 0) - 1));

      return { previousData, prevUnread };
    },
    onError: (_err, _id, context) => {
      toast.error("Failed to archive notification");
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          if (data !== undefined) queryClient.setQueryData(key, data);
        }
      }
      if (context?.prevUnread !== undefined) {
        queryClient.setQueryData(NOTIF_KEYS.unreadCount, context.prevUnread);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "detail"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "top"] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousData = queryClient.getQueriesData({ queryKey: ["notifications"] });

      queryClient.setQueriesData<{ data: AppNotification[]; total?: number; page_size?: number } | AppNotification[]>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.filter((n: AppNotification) => n.id !== id);
          }
          if ("data" in old && Array.isArray(old.data)) {
            const resp = old as { data: AppNotification[]; total: number; page_size: number };
            return {
              ...old,
              data: old.data.filter((n: AppNotification) => n.id !== id),
              total: Math.max(0, resp.total - 1),
              total_pages: Math.max(1, Math.ceil((resp.total - 1) / resp.page_size)),
            };
          }
          return old;
        }
      );

      const prevUnread = queryClient.getQueryData(NOTIF_KEYS.unreadCount);
      queryClient.setQueryData(NOTIF_KEYS.unreadCount, (old: number) => Math.max(0, (old ?? 0) - 1));

      return { previousData, prevUnread };
    },
    onError: (_err, _id, context) => {
      toast.error("Failed to delete notification");
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          if (data !== undefined) queryClient.setQueryData(key, data);
        }
      }
      if (context?.prevUnread !== undefined) {
        queryClient.setQueryData(NOTIF_KEYS.unreadCount, context.prevUnread);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "detail"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "top"] });
    },
  });
}

// ─── Realtime Subscription ──
//
// Subscribes to the `admin_realtime_outbox` relay (RLS-protected tables
// never deliver events to the anon-key client).  On any `notifications`
// row change it invalidates all notification queries.

export function useRealtimeNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeRealtimeInvalidation(queryClient, ["notifications"], "notifications");
  }, [queryClient]);
}

// ─── Realtime Notification Popups (Dynamic Island) ──
//
// Mounted once at the Shell level.  When a NEW notification row is
// inserted anywhere in the system, it fetches the row via the admin RPC
// and pops an app-notch-style Dynamic Island notification in real time.

export function useRealtimeNotificationPopups() {
  const island = useIslandNotification();
  const islandRef = useRef(island);
  islandRef.current = island;

  useEffect(() => {
    return subscribeRealtime(async (row) => {
      if (row.table_name !== "notifications" || row.event !== "INSERT" || !row.record_id) return;

      try {
        const notif = await getNotification(row.record_id);
        const current = islandRef.current;
        const sev = notif.severity ?? "info";
        const meta: Record<string, string | number> = {
          source: notif.source ?? "system",
          category: notif.category ?? "system",
          severity: sev,
        };

        const description = notif.message || notif.description || undefined;
        const opts = {
          icon: sev === "critical" ? ("error" as const) : (sev as "info" | "warning" | "success"),
          metadata: meta,
        };

        if (sev === "critical") {
          current.error(notif.title, description, opts);
        } else if (sev === "warning") {
          current.warning(notif.title, description, opts);
        } else if (sev === "success") {
          current.success(notif.title, description, opts);
        } else {
          current.info(notif.title, description, opts);
        }
      } catch {
        // row may have been deleted between the relay event and the fetch
      }
    });
  }, []);
}
