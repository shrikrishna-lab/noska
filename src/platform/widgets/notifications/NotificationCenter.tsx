/**
 * In-app Notification Center — slide-over panel fed by the notification
 * engine. Click-through opens the exact page (and focuses the block when
 * the notification carries one).
 */
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Inbox, X } from "lucide-react";
import { timeAgo } from "../../../utils/helpers";
import { useNotifications, type AppNotification } from "./engine";
import type { WidgetRuntimeContext } from "../types";

const SEVERITY_DOT: Record<AppNotification["severity"], string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
};

export function NotificationCenter({
  open,
  onClose,
  ctx,
}: {
  open: boolean;
  onClose: () => void;
  ctx: WidgetRuntimeContext;
}) {
  const { notifications, markRead, markAllRead, dismiss, clearAll } = useNotifications();

  const openTarget = (n: AppNotification) => {
    markRead(n.id);
    if (n.pageId) ctx.actions.onSelect(n.pageId);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-3 top-3 bottom-3 z-[71] flex w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            role="dialog"
            aria-label="Notification Center"
          >
            <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[var(--accent)]" />
                <h2 className="text-sm font-bold text-[var(--text)]">Notifications</h2>
                {notifications.some((n) => !n.read) && (
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    {notifications.filter((n) => !n.read).length} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={markAllRead}
                  title="Mark all read"
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  <CheckCheck size={14} />
                </button>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    title="Clear all"
                    className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface)]">
                    <Inbox size={18} className="text-[var(--muted)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text)]">You're all caught up</p>
                  <p className="text-xs text-[var(--muted)]">
                    Mentions, task deadlines and AI results will land here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {notifications.map((n) => (
                    <motion.li
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`group relative flex gap-3 px-4 py-3 transition-colors ${
                        n.read ? "" : "bg-blue-500/[0.04]"
                      }`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[n.severity]} ${n.read ? "opacity-30" : ""}`} />
                      <button
                        onClick={() => openTarget(n)}
                        className="min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <p className={`flex items-center gap-1.5 text-xs font-semibold text-[var(--text)] ${n.read ? "opacity-70" : ""}`}>
                          {n.isTest && (
                            <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[8.5px] font-bold text-amber-600 dark:text-amber-400">TEST</span>
                          )}
                          <span className="truncate">{n.title}</span>
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[var(--secondary)]">{n.body}</p>
                        <p className="mt-1 text-[10px] text-[var(--muted)]">{timeAgo(n.at)}</p>
                      </button>
                      <button
                        onClick={() => dismiss(n.id)}
                        title="Dismiss"
                        className="absolute right-2 top-2 rounded-md p-1 text-[var(--muted)] opacity-0 transition-opacity hover:bg-[var(--surface)] group-hover:opacity-100 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
