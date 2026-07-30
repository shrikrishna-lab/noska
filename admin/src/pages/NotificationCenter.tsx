import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, Bell, Filter, ArrowUpDown, MoreHorizontal,
  CheckCheck, Archive, Trash2, CheckCircle2,
  AlertTriangle, Info, XCircle, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  useNotificationsList, useMarkRead, useMarkAllRead,
  useArchiveNotification, useDeleteNotification, useRealtimeNotifications,
} from "@/lib/notifications/hooks";
import type { AppNotification, NotificationSeverity, NotificationSource, NotificationStatus, NotificationCategory } from "@/lib/notifications/types";
import { SEVERITY_CONFIG, CATEGORY_LABELS } from "@/lib/notifications/types";

const FILTER_TABS: Array<{ label: string; value: NotificationStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
  { label: "Archived", value: "archived" },
];

const SEVERITY_FILTERS: Array<{ label: string; value: NotificationSeverity | "all" }> = [
  { label: "All Severities", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "Warning", value: "warning" },
  { label: "Info", value: "info" },
  { label: "Success", value: "success" },
];

const SOURCE_FILTERS: Array<{ label: string; value: NotificationSource | "all" }> = [
  { label: "All Sources", value: "all" },
  { label: "System", value: "system" },
  { label: "Sentry", value: "sentry" },
  { label: "PostHog", value: "posthog" },
  { label: "Vercel", value: "vercel" },
  { label: "Supabase", value: "supabase" },
  { label: "Resend", value: "resend" },
  { label: "Clerk", value: "clerk" },
  { label: "Auth", value: "auth" },
  { label: "Billing", value: "billing" },
];

const PAGE_SIZE = 20;

export function NotificationCenter() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<NotificationSeverity | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<NotificationSource | "all">("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const navigate = useNavigate();
  useRealtimeNotifications();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, severityFilter, sourceFilter]);

  const filters = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    severity: severityFilter === "all" ? undefined : severityFilter,
    source: sourceFilter === "all" ? undefined : sourceFilter,
    page,
    pageSize: PAGE_SIZE,
    sortBy,
    sortDir,
  }), [debouncedSearch, statusFilter, severityFilter, sourceFilter, page, sortBy, sortDir]);

  const { data, isLoading, isError } = useNotificationsList(filters);
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead();
  const { mutate: archive } = useArchiveNotification();
  const { mutate: deleteNotif } = useDeleteNotification();

  const handleRowClick = useCallback((n: AppNotification) => {
    if (n.status === "unread") {
      markRead(n.id);
    }
    navigate(`/notifications/${n.id}`);
  }, [markRead, navigate]);

  const handleMarkRead = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markRead(id);
  }, [markRead]);

  const handleArchive = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    archive(id);
  }, [archive]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotif(id);
  }, [deleteNotif]);

  const notifications = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  return (
    <div className="p-6">
      <PageHeader
        title="Notifications"
        description="View and manage all system notifications"
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead()}
                disabled={markingAll}
              >
                {markingAll ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                )}
                Mark all read
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="pl-9 h-9"
            aria-label="Search notifications"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <ArrowUpDown className="mr-1.5 h-3 w-3" />
                {sortBy === "created_at" ? "Newest" : sortBy === "severity" ? "Severity" : "Source"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSortBy("created_at"); setSortDir("desc"); }}>
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy("created_at"); setSortDir("asc"); }}>
                Oldest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy("severity"); setSortDir("desc"); }}>
                Severity (high to low)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy("source"); setSortDir("asc"); }}>
                Source (A-Z)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {tab.label}
          </button>
        ))}
        <div className="mx-2 h-5 w-px bg-border" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                severityFilter !== "all"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {severityFilter !== "all" ? severityFilter : "Severity"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {SEVERITY_FILTERS.map((s) => (
              <DropdownMenuItem key={s.value} onClick={() => setSeverityFilter(s.value)}>
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                sourceFilter !== "all"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {sourceFilter !== "all" ? sourceFilter : "Source"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {SOURCE_FILTERS.map((s) => (
              <DropdownMenuItem key={s.value} onClick={() => setSourceFilter(s.value)}>
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <LoadingState count={5} />
      ) : isError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">Failed to load notifications</p>
          <p className="mt-1 text-xs text-muted-foreground">Please try refreshing the page.</p>
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications found"
          description={search ? "Try a different search term." : "Notifications will appear here as system events occur."}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <div className="divide-y">
              {notifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.15 }}
                >
                  <NotificationRow
                    notification={n}
                    onClick={() => handleRowClick(n)}
                    onMarkRead={(e) => handleMarkRead(e, n.id)}
                    onArchive={(e) => handleArchive(e, n.id)}
                    onDelete={(e) => handleDelete(e, n.id)}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="min-w-[32px]"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NotificationRow({
  notification: n, onClick, onMarkRead, onArchive, onDelete,
}: {
  notification: AppNotification;
  onClick: () => void;
  onMarkRead: (e: React.MouseEvent) => void;
  onArchive: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const isUnread = n.status === "unread";
  const sev = SEVERITY_CONFIG[n.severity] ?? SEVERITY_CONFIG.info;
  const SeverityIcon = n.severity === "critical" ? XCircle
    : n.severity === "warning" ? AlertTriangle
    : n.severity === "success" ? CheckCircle2
    : Info;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
        isUnread && "bg-muted/15"
      )}
      aria-label={`${n.title}${isUnread ? " (unread)" : ""}`}
    >
      {isUnread && (
        <motion.span
          layoutId="unread-indicator"
          className="absolute left-0 top-0 h-full w-0.5 rounded-r-full bg-primary"
        />
      )}

      <div className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded", sev.bg + "/10")}>
        <SeverityIcon className={cn("h-3.5 w-3.5", sev.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={cn("text-sm", isUnread && "font-semibold")}>{n.title}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{formatRelativeTime(n.created_at)}</span>
        </div>
        {n.message && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.message}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          {n.source && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground uppercase">
              {n.source}
            </span>
          )}
          {n.category && CATEGORY_LABELS[n.category] && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              {CATEGORY_LABELS[n.category]}
            </Badge>
          )}
          {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isUnread && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMarkRead}
            aria-label="Mark as read"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </Button>
        )}
        {n.status !== "archived" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onArchive}
            aria-label="Archive"
          >
            <Archive className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {!isUnread && (
              <DropdownMenuItem onClick={onMarkRead} className="text-xs">
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Mark as read
              </DropdownMenuItem>
            )}
            {n.status !== "archived" && (
              <DropdownMenuItem onClick={onArchive} className="text-xs">
                <Archive className="mr-2 h-3.5 w-3.5" /> Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-xs text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
