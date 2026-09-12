/**
 * Notification engine — the bridge between workspace events, widgets and
 * native desktop notifications.
 *
 * Rules (per the notification platform spec):
 *  - widget/data updates never notify on their own; only qualifying
 *    events create notifications
 *  - the user's own actions (task_completed without provenance, edits)
 *    do not notify; automation/agent-caused completions do
 *  - every notification is deduplicated by id; native notifications fire
 *    only when the app window is hidden, and never duplicate an in-app one
 *  - periodic scans (overdue tasks, due reviews, failing automations) are
 *    digest-style: one active notification per item, reminders at most
 *    once per day per item
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { subscribeWorkspaceEvents } from "../../../ai/runtime/eventBus";
import { sendAppNotification } from "../../../lib/desktop/notify";
import { supabase } from "../../../lib/supabase";
import { fetchAutomations } from "../../../features/automations/automationStore";
import { collectTasks, startOfToday } from "../shared";
import type { WidgetRuntimeContext } from "../types";

export type NotificationSeverity = "info" | "success" | "warning" | "critical";
export type NotificationCategory =
  | "task"
  | "mention"
  | "ai"
  | "automation"
  | "invite"
  | "broadcast"
  | "system";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  at: string;
  read: boolean;
  pageId?: string;
  blockId?: string;
  isTest?: boolean;
  /** "server" notifications were delivered by the backend (admin-sent);
   * their read state is a per-user receipt row, not local storage. */
  source?: "local" | "server";
}

const STORE_KEY = "noska:notifications:v1";
const REMINDER_KEY = "noska:notification-reminders:v1";
const MAX_STORED = 60;
const SCAN_INTERVAL_MS = 5 * 60 * 1000;

interface NotificationEngineValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  /** Test hooks (admin "test notification" flows) — always labelled. */
  push: (n: Omit<AppNotification, "at" | "read">, opts?: { native?: boolean }) => void;
}

const NotificationEngineContext = createContext<NotificationEngineValue | null>(null);

function load(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function persist(list: AppNotification[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX_STORED)));
  } catch {
    /* ignore */
  }
}

function loadReminders(): Record<string, string> {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function sameDay(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

export function NotificationProvider({
  children,
  ctx,
}: {
  children: React.ReactNode;
  ctx: WidgetRuntimeContext;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => load());
  const remindersRef = useRef<Record<string, string>>(loadReminders());
  /** Notifications that already fired a native toast (dedupe across rerenders). */
  const nativeSentRef = useRef<Set<string>>(new Set());
  const notificationsRef = useRef<AppNotification[]>(notifications);
  notificationsRef.current = notifications;

  const push = useCallback(
    (n: Omit<AppNotification, "at" | "read">, opts?: { native?: boolean }) => {
      const notification: AppNotification = { ...n, at: new Date().toISOString(), read: false };
      setNotifications((prev) => {
        if (prev.some((p) => p.id === notification.id)) return prev;
        const next = [notification, ...prev].slice(0, MAX_STORED);
        persist(next);
        return next;
      });
      // Native only for non-info severities while the window is hidden —
      // never duplicate what's already on screen.
      const wantsNative =
        opts?.native ??
        (notification.severity !== "info" && typeof document !== "undefined" && document.hidden);
      if (wantsNative && !nativeSentRef.current.has(notification.id)) {
        nativeSentRef.current.add(notification.id);
        void sendAppNotification(`Noska — ${notification.title}`, notification.body);
      }
    },
    [],
  );

  // Workspace event feed — automation/agent-caused changes notify, the
  // user's own changes don't (they're on-screen already).
  useEffect(() => {
    return subscribeWorkspaceEvents((event) => {
      const provenance = event.provenance;
      if (event.type === "task_completed" && provenance) {
        push({
          id: `task:${event.blockId ?? event.pageId}:${event.at}`,
          title: "Task completed",
          body: `${event.blockText || "A task"} was completed${
            event.pageTitle ? ` on “${event.pageTitle}”` : ""
          } by ${provenance.sourceId.startsWith("automation:") ? "an automation" : "an agent"}.`,
          category: "automation",
          severity: "success",
          pageId: event.pageId,
          blockId: event.blockId,
        });
      } else if ((event.type === "page_trashed" || event.type === "title_changed") && provenance) {
        push({
          id: `page:${event.pageId}:${event.type}:${event.at}`,
          title: event.type === "page_trashed" ? "Page trashed" : "Page renamed",
          body: `“${event.pageTitle || "A page"}” was ${
            event.type === "page_trashed" ? "moved to trash" : "renamed"
          } by ${provenance.sourceId.startsWith("automation:") ? "an automation" : "an agent"}.`,
          category: "automation",
          severity: "info",
          pageId: event.pageId,
        });
      }
    });
  }, [push]);

  // Periodic digest scans: overdue tasks, failing automations.
  const scanOverdue = useCallback(() => {
    if (!ctx.pages.length) return;
    const now = Date.now();
    const todayIso = startOfToday().toISOString();
    const reminders = remindersRef.current;
    for (const task of collectTasks(ctx.pages)) {
      if (task.checked || !task.due) continue;
      if (new Date(task.due).getTime() >= now) continue;
      const reminderAt = reminders[task.key];
      if (reminderAt && sameDay(reminderAt, todayIso)) continue;
      reminders[task.key] = todayIso;
      push({
        id: `overdue:${task.key}`,
        title: "Task overdue",
        body: `“${task.text}” on “${task.pageTitle}” is past due.`,
        category: "task",
        severity: "warning",
        pageId: task.pageId,
        blockId: task.blockId,
      });
    }
    try {
      localStorage.setItem(REMINDER_KEY, JSON.stringify(reminders));
    } catch {
      /* ignore */
    }
  }, [ctx.pages, push]);

  useEffect(() => {
    scanOverdue();
    const interval = setInterval(scanOverdue, SCAN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [scanOverdue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const automations = await fetchAutomations();
        if (cancelled) return;
        const todayIso = startOfToday().toISOString();
        const reminders = remindersRef.current;
        for (const a of automations) {
          if (a.health === "healthy" || a.status !== "active") continue;
          const key = `automation:${a.id}`;
          if (reminders[key] && sameDay(reminders[key], todayIso)) continue;
          reminders[key] = todayIso;
          push({
            id: key,
            title: "Automation needs attention",
            body: `“${a.name}” reported a ${a.health} state. Open Automations to review it.`,
            category: "automation",
            severity: "critical",
          });
        }
        try {
          localStorage.setItem(REMINDER_KEY, JSON.stringify(reminders));
        } catch {
          /* ignore */
        }
      } catch {
        /* automations are optional for notifications */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [push]);

  // Pending invites become actionable notifications (deduped by invite id).
  useEffect(() => {
    for (const invite of ctx.pendingInvites) {
      const id = String(invite.id ?? "");
      if (!id) continue;
      push({
        id: `invite:${id}`,
        title: "Page invite",
        body: `You were invited to “${String(invite.page_title ?? invite.pageTitle ?? "a page")}”.`,
        category: "invite",
        severity: "info",
      });
    }
  }, [ctx.pendingInvites, push]);

  // Server-delivered notifications: admin broadcasts and targeted sends
  // arrive through the user_notifications table (realtime + initial
  // fetch). Read state lives in per-user receipt rows so broadcasts can
  // be read independently by each user.
  const uid = ctx.currentUserId;
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    type ServerRow = {
      id: string;
      title: string;
      body: string;
      category: string | null;
      severity: string | null;
      page_id: string | null;
      is_test: boolean;
      created_at: string;
    };
    const toApp = (row: ServerRow): AppNotification => ({
      id: `srv:${row.id}`,
      title: row.title,
      body: row.body,
      category: (["task", "mention", "ai", "automation", "invite", "broadcast", "system"].includes(row.category ?? "")
        ? row.category
        : "broadcast") as NotificationCategory,
      severity: (["info", "success", "warning", "critical"].includes(row.severity ?? "")
        ? row.severity
        : "info") as NotificationSeverity,
      at: row.created_at,
      read: false,
      pageId: row.page_id ?? undefined,
      isTest: row.is_test,
      source: "server",
    });
    const nativeFor = (row: ServerRow) => {
      const sev = row.severity ?? "info";
      if (sev !== "info" && typeof document !== "undefined" && document.hidden && !nativeSentRef.current.has(`srv:${row.id}`)) {
        nativeSentRef.current.add(`srv:${row.id}`);
        void sendAppNotification(`Noska — ${row.title}`, row.body);
      }
    };

    (async () => {
      const [notices, receipts] = await Promise.all([
        supabase
          .from("user_notifications")
          .select("*")
          .or(`user_id.eq.${uid},user_id.is.null`)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("user_notification_reads").select("notification_id").eq("user_id", uid),
      ]);
      if (cancelled) return;
      const readIds = new Set((receipts.data ?? []).map((r) => r.notification_id as string));
      const mapped = (notices.data ?? []).map((row) => ({ ...toApp(row as ServerRow), read: readIds.has(row.id) }));
      setNotifications((prev) => {
        const existing = new Set(prev.map((n) => n.id));
        const merged = [...mapped.filter((m) => !existing.has(m.id)), ...prev].slice(0, MAX_STORED);
        persist(merged);
        return merged;
      });
    })();

    const upsertServer = (row: ServerRow) => {
      nativeFor(row);
      setNotifications((prev) => {
        if (prev.some((p) => p.id === `srv:${row.id}`)) return prev;
        const next = [toApp(row), ...prev].slice(0, MAX_STORED);
        persist(next);
        return next;
      });
    };

    const channelMe = supabase
      .channel(`user-notifications-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${uid}` },
        (payload) => upsertServer(payload.new as ServerRow),
      )
      .subscribe();
    const channelBroadcast = supabase
      .channel("user-notifications-broadcast")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_notifications", filter: "user_id=is.null" },
        (payload) => upsertServer(payload.new as ServerRow),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channelMe);
      void supabase.removeChannel(channelBroadcast);
    };
  }, [uid]);

  const markRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        persist(next);
        return next;
      });
      if (id.startsWith("srv:") && ctx.currentUserId) {
        void supabase
          .from("user_notification_reads")
          .upsert(
            { notification_id: id.slice(4), user_id: ctx.currentUserId },
            { onConflict: "notification_id,user_id", ignoreDuplicates: true },
          );
      }
    },
    [ctx.currentUserId],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      persist(next);
      return next;
    });
    if (ctx.currentUserId) {
      const unreadServer = notificationsRef.current
        .filter((n) => n.source === "server" && !n.read)
        .map((n) => n.id.slice(4));
      if (unreadServer.length > 0) {
        void supabase.from("user_notification_reads").upsert(
          unreadServer.map((notification_id) => ({ notification_id, user_id: ctx.currentUserId })),
          { onConflict: "notification_id,user_id", ignoreDuplicates: true },
        );
      }
    }
  }, [ctx.currentUserId]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications(() => {
      persist([]);
      return [];
    });
  }, []);

  const value = useMemo<NotificationEngineValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markRead,
      markAllRead,
      dismiss,
      clearAll,
      push,
    }),
    [notifications, markRead, markAllRead, dismiss, clearAll, push],
  );

  return <NotificationEngineContext.Provider value={value}>{children}</NotificationEngineContext.Provider>;
}

export function useNotifications(): NotificationEngineValue {
  const value = useContext(NotificationEngineContext);
  if (!value) throw new Error("useNotifications must be used inside <NotificationProvider>");
  return value;
}
