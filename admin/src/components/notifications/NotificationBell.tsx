import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, ExternalLink, Loader2, MailCheck, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useUnreadCount, useTopNotifications, useMarkRead, useArchiveNotification, useMarkAllRead, useRealtimeNotifications } from "@/lib/notifications/hooks";
import type { AppNotification } from "@/lib/notifications/types";
import { SEVERITY_CONFIG } from "@/lib/notifications/types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: topNotifs = [] as AppNotification[] } = useTopNotifications(5) as { data: AppNotification[] | undefined };
  const { mutate: markRead } = useMarkRead();
  const { mutate: archive } = useArchiveNotification();
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead();
  useRealtimeNotifications();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleNotifClick = useCallback((n: AppNotification) => {
    if (n.status === "unread") {
      markRead(n.id);
    }
    setOpen(false);
    navigate(`/notifications/${n.id}`);
  }, [markRead, navigate]);

  const handleViewAll = useCallback(() => {
    setOpen(false);
    navigate("/notifications");
  }, [navigate]);

  const handleMarkAllRead = useCallback(() => {
    markAllRead();
  }, [markAllRead]);

  const handleMarkRead = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markRead(id);
  }, [markRead]);

  const handleArchive = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    archive(id);
  }, [archive]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="h-4 w-4" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              layout
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30, layout: { duration: 0.2 } }}
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 max-w-[calc(100vw-1rem)] sm:max-w-80 top-full z-50 mt-2 w-80 rounded-xl border bg-background shadow-xl"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  aria-label="Mark all as read"
                >
                  {markingAll ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3 w-3" />
                  )}
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto overscroll-contain">
              {topNotifs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground/60">We'll let you know when something arrives.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {topNotifs.map((n: AppNotification) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onClick={() => handleNotifClick(n)}
                      onMarkRead={handleMarkRead}
                      onArchive={handleArchive}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs"
                onClick={handleViewAll}
              >
                View all notifications
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationRow({
  notification: n,
  onClick,
  onMarkRead,
  onArchive,
}: {
  notification: AppNotification;
  onClick: () => void;
  onMarkRead: (id: string, e: React.MouseEvent) => void;
  onArchive: (id: string, e: React.MouseEvent) => void;
}) {
  const isUnread = n.status === "unread";
  const sev = SEVERITY_CONFIG[n.severity] ?? SEVERITY_CONFIG.info;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className={cn(
        "group relative flex w-full cursor-pointer gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
        isUnread && "bg-muted/20"
      )}
      role="button"
      tabIndex={0}
    >
      {isUnread && (
        <span className="absolute left-0 top-0 h-full w-0.5 rounded-r-full bg-primary" />
      )}
      <div className={cn("relative mt-1 h-2 w-2 shrink-0 rounded-full", sev.bg)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm truncate", isUnread && "font-semibold")}>{n.title}</p>
          <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
            {formatRelativeTime(n.created_at)}
          </span>
        </div>
        {n.message && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.message}</p>
        )}
        {n.source && (
          <span className="mt-1 inline-block rounded bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground uppercase">
            {n.source}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isUnread && (
          <button
            onClick={(e) => onMarkRead(n.id, e)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Mark as read"
            title="Mark as read"
          >
            <MailCheck className="h-3.5 w-3.5" />
          </button>
        )}
        {n.status !== "archived" && (
          <button
            onClick={(e) => onArchive(n.id, e)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Archive"
            title="Archive"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
