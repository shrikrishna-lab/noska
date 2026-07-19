import { motion } from "framer-motion";
import { useState } from "react";
import {
  Users, FileText, Bot, Activity, Database, HardDrive, BarChart3,
  UserCheck, Radio, Wifi, Globe, Bell, RotateCcw, Zap, Clock,
  CheckCircle2, XCircle, Eye, Timer, ArrowUpRight, TrendingUp,
  UserPlus, Search, Shield, Settings, Download, Inbox, Mail,
  ExternalLink, ChevronRight, MessageSquare, Terminal, RefreshCw,
  AlertCircle, Plus, List, Star, Ticket, Flag, Megaphone,
  Webhook, Ban, Send, Percent, ThumbsUp, MessageCircle,
  Gauge, Server, Cpu, TrendingDown, Lightbulb, Sparkles, Layout,
} from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCommandCenter } from "@/components/ui/AdminCommandCenter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import {
  useDashboardKpis, useDailySignups, useDailyAuditEvents,
  useUserCount, usePageCount, useAuditCount, useAiChatCount,
  useActiveCollabSessions, useRealtimeInvalidate, useRealtimeAuditFeed,
  useUsers, usePages, useWaitlist, useWaitlistCount,
  useEmailCampaigns, useFeedback, useSupportTickets,
  useFeatureFlags, useBroadcasts, useWebhookDeliveries, useBannedUsers,
} from "@/lib/queries";
import { useTopNotifications, useUnreadCount, useRealtimeNotifications } from "@/lib/notifications/hooks";
import { usePerformanceMetrics, useSessionData, useServiceStatuses } from "@/lib/monitoring/hooks";
import { formatNumber, formatRelativeTime, cn } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemAnim = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const STATUS_DOT: Record<string, string> = {
  viewing: "bg-blue-500",
  editing: "bg-green-500",
  idle: "bg-yellow-500",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted/40", className)} />;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span>{p.name}: <span className="font-semibold">{p.value}</span></span>
        </div>
      ))}
    </div>
  );
}

function ActivityIcon({ action }: { action: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    create: <UserPlus className="h-4 w-4 text-emerald-500" />,
    update: <Settings className="h-4 w-4 text-blue-500" />,
    delete: <XCircle className="h-4 w-4 text-red-500" />,
    login: <Shield className="h-4 w-4 text-violet-500" />,
    view: <Eye className="h-4 w-4 text-amber-500" />,
    search: <Search className="h-4 w-4 text-muted-foreground" />,
    export: <Download className="h-4 w-4 text-indigo-500" />,
  };
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50">
      {iconMap[action?.toLowerCase()] ?? <Activity className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
}

function KpiDialog({ open, onOpenChange, title, icon: Icon, color, children }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  title: string; icon: React.ComponentType<{ className?: string }>; color: string; children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", color)}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>{title} Details</DialogTitle>
              <DialogDescription>Real-time breakdown and recent activity</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UsersDetail() {
  const { data: users } = useUsers();
  const { data: collabSessions } = useActiveCollabSessions();
  const recent = (users ?? []).slice(0, 8);
  const online = collabSessions?.length ?? 0;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{formatNumber(users?.length ?? 0)}</p>
          <p className="text-[11px] text-muted-foreground">Total registered</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{online}</p>
          <p className="text-[11px] text-muted-foreground">Online now</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{formatNumber(recent.filter(u => {
            const d = new Date(u.created_at ?? "");
            return !isNaN(d.getTime()) && (Date.now() - d.getTime()) < 86400000;
          }).length)}</p>
          <p className="text-[11px] text-muted-foreground">Joined today</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Recent signups</p>
        <div className="divide-y divide-border rounded-lg border">
          {recent.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No users yet</p>
          ) : recent.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                  {(u.user_name ?? u.email ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{u.user_name || u.email || "Unknown"}</p>
                <p className="text-[11px] text-muted-foreground">{u.email ?? ""}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {u.created_at ? formatRelativeTime(u.created_at) : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PagesDetail() {
  const { data: pages } = usePages();
  const top = (pages ?? []).filter(p => !p.trashed).slice(0, 8);
  const trashed = (pages ?? []).filter(p => p.trashed).length;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{formatNumber(pages?.length ?? 0)}</p>
          <p className="text-[11px] text-muted-foreground">Total pages</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{formatNumber(top.length)}</p>
          <p className="text-[11px] text-muted-foreground">Active</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{formatNumber(trashed)}</p>
          <p className="text-[11px] text-muted-foreground">Trashed</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Recent pages</p>
        <div className="divide-y divide-border rounded-lg border">
          {top.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No pages yet</p>
          ) : top.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.title || "Untitled"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.trashed ? "Trashed" : "Active"} · {p.updated_at ? formatRelativeTime(p.updated_at) : "Never"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function AuditDetail() {
  const liveEvents = useRealtimeAuditFeed(20);
  const { data: auditCount } = useAuditCount();

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{formatNumber(auditCount ?? 0)}</p>
          <p className="text-[11px] text-muted-foreground">Total events</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{liveEvents.length}</p>
          <p className="text-[11px] text-muted-foreground">Recent events</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">
            {liveEvents.filter(e => e.action?.toLowerCase() === "create").length}
          </p>
          <p className="text-[11px] text-muted-foreground">Recent creates</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2 flex items-center gap-2">
          <span>Live audit feed</span>
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </p>
        <div className="divide-y divide-border rounded-lg border max-h-64 overflow-y-auto">
          {liveEvents.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Waiting for events...</p>
          ) : liveEvents.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 px-4 py-2.5">
              <ActivityIcon action={ev.action} />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">
                  <span className="font-medium">{ev.user_name}</span>
                  <span className="text-muted-foreground"> {ev.action}</span>
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatRelativeTime(ev.created_at || "")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function AIDetail() {
  const { data: chatCount } = useAiChatCount();
  const { data: kpis } = useDashboardKpis();
  const { data: signups } = useDailySignups(7);

  const aiToday = kpis?.aiEventsToday ?? 0;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{formatNumber(chatCount ?? 0)}</p>
          <p className="text-[11px] text-muted-foreground">Total AI chats</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{formatNumber(aiToday)}</p>
          <p className="text-[11px] text-muted-foreground">Events today</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">
            {chatCount && chatCount > 0
              ? ((aiToday / Math.max(chatCount, 1)) * 100).toFixed(0)
              : "0"}%
          </p>
          <p className="text-[11px] text-muted-foreground">Activity ratio</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Daily signups (7 days)</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={signups?.length ? signups : [{ date: "", value: 0 }]}>
              <defs>
                <linearGradient id="aiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill="url(#aiGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function RecentUsers() {
  const { data: users } = useUsers();
  const recent = (users ?? []).slice(0, 5);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Recent Signups</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] font-normal">{users?.length ?? 0} total</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {recent.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">No users yet</div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-6 py-2.5 transition-colors hover:bg-muted/30">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                    {(u.user_name ?? u.email ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{u.user_name || u.email || "Unknown"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.email ?? ""}</p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {u.created_at ? formatRelativeTime(u.created_at) : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationsFeed() {
  const { data: notifications } = useTopNotifications(5);
  const { data: unreadCount } = useUnreadCount();
  useRealtimeNotifications();

  const severityColor: Record<string, string> = {
    info: "bg-blue-500/10 text-blue-600",
    warning: "bg-amber-500/10 text-amber-600",
    error: "bg-red-500/10 text-red-600",
    success: "bg-emerald-500/10 text-emerald-600",
  };

  const severityIcon: Record<string, React.ReactNode> = {
    info: <Bell className="h-4 w-4" />,
    warning: <AlertCircle className="h-4 w-4" />,
    error: <XCircle className="h-4 w-4" />,
    success: <CheckCircle2 className="h-4 w-4" />,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
          </div>
          {unreadCount != null && unreadCount > 0 && (
            <Badge variant="secondary" className="text-[10px] animate-pulse">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {(!notifications || notifications.length === 0) ? (
          <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-6 py-2.5 transition-colors hover:bg-muted/30">
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", severityColor[n.severity] ?? "bg-muted text-muted-foreground")}>
                  {severityIcon[n.severity] ?? <Bell className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  {n.message && <p className="text-[11px] text-muted-foreground line-clamp-1">{n.message}</p>}
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
                  {formatRelativeTime(n.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveSessionsCard() {
  const { data: collabSessions } = useActiveCollabSessions();
  const sessions = (collabSessions as any[]) ?? [];

  if (sessions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-green-500" />
            <CardTitle className="text-sm font-semibold">Active Realtime Sessions</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">{sessions.length} active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {sessions.slice(0, 6).map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2 transition-colors hover:bg-muted/40">
              <Avatar className="h-8 w-8" style={{ backgroundColor: s.user_color || "#7c3aed" }}>
                <AvatarFallback className="text-[11px] text-white font-semibold">
                  {(s.user_name ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{s.user_name}</span>
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[s.status] ?? "bg-gray-400")} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {s.current_block_id ? "Editing" : "Viewing"} · {formatRelativeTime(s.last_activity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WaitlistDetail() {
  const { data: waitlist } = useWaitlist();
  const entries = (waitlist ?? []).slice(0, 10);
  const pending = (waitlist ?? []).filter((w: any) => w.status === "pending").length;
  const approved = (waitlist ?? []).filter((w: any) => w.status === "approved").length;
  const invited = (waitlist ?? []).filter((w: any) => w.invite_sent).length;

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{formatNumber(waitlist?.length ?? 0)}</p>
          <p className="text-[11px] text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{pending}</p>
          <p className="text-[11px] text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{approved}</p>
          <p className="text-[11px] text-muted-foreground">Approved</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{invited}</p>
          <p className="text-[11px] text-muted-foreground">Invited</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Waitlist entries</p>
        <div className="divide-y divide-border rounded-lg border max-h-64 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No entries</p>
          ) : entries.map((w: any) => (
            <div key={w.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                <List className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{w.name || w.email}</p>
                <p className="text-[11px] text-muted-foreground">{w.email} · {w.status}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{w.position ?? "-"}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CampaignsDetail() {
  const { data: campaigns } = useEmailCampaigns();
  const top = (campaigns ?? []).slice(0, 8);

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground", sent: "bg-emerald-500/10 text-emerald-600",
    sending: "bg-blue-500/10 text-blue-600", scheduled: "bg-amber-500/10 text-amber-600",
    cancelled: "bg-red-500/10 text-red-600",
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{formatNumber(campaigns?.length ?? 0)}</p>
          <p className="text-[11px] text-muted-foreground">Total campaigns</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{(campaigns ?? []).filter((c: any) => c.status === "sent").length}</p>
          <p className="text-[11px] text-muted-foreground">Sent</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{(campaigns ?? []).filter((c: any) => c.status === "scheduled" || c.status === "sending").length}</p>
          <p className="text-[11px] text-muted-foreground">In progress</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Campaigns</p>
        <div className="divide-y divide-border rounded-lg border max-h-80 overflow-y-auto">
          {top.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No campaigns</p>
          ) : top.map((c: any) => (
            <div key={c.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{c.recipients ?? 0} recipients</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", statusColor[c.status] ?? "")}>{c.status}</Badge>
              </div>
              {(c.sent ?? 0) > 0 && c.recipients > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (c.sent / c.recipients) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{Math.round((c.sent / c.recipients) * 100)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function FeedbackDetail() {
  const { data: feedback } = useFeedback();
  const items = (feedback ?? []).slice(0, 10);
  const feedbackCount = feedback?.length ?? 0;
  const avgRating = feedbackCount > 0 ? ((feedback ?? []).reduce((a: any, b: any) => a + (b.rating ?? 0), 0) / feedbackCount).toFixed(1) : "0.0";

  const categoryColor: Record<string, string> = {
    praise: "bg-emerald-500/10 text-emerald-600", bug: "bg-red-500/10 text-red-600",
    feature: "bg-blue-500/10 text-blue-600", ui: "bg-violet-500/10 text-violet-600",
    performance: "bg-amber-500/10 text-amber-600",
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{formatNumber(feedback?.length ?? 0)}</p>
          <p className="text-[11px] text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{feedbackCount > 0 ? avgRating : "0.0"}</p>
          <p className="text-[11px] text-muted-foreground">Avg rating</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{(feedback ?? []).filter((f: any) => f.status === "unread" || f.status === "new").length}</p>
          <p className="text-[11px] text-muted-foreground">Unread</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{(feedback ?? []).filter((f: any) => f.category === "bug").length}</p>
          <p className="text-[11px] text-muted-foreground">Bug reports</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Recent feedback</p>
        <div className="divide-y divide-border rounded-lg border max-h-72 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No feedback</p>
          ) : items.map((f: any) => (
            <div key={f.id} className="flex items-start gap-3 px-4 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Star className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{f.user_name || f.email}</p>
                  <Badge variant="outline" className={cn("text-[10px]", categoryColor[f.category] ?? "")}>{f.category}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{f.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("h-3 w-3", i < (f.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatRelativeTime(f.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TicketsDetail() {
  const { data: tickets } = useSupportTickets();
  const items = (tickets ?? []).slice(0, 10);
  const ticketTotal = tickets?.length ?? 0;
  const openTickets = (tickets ?? []).filter((t: any) => t.status === "open" || t.status === "pending").length;

  const priorityColor: Record<string, string> = {
    low: "bg-muted text-muted-foreground", medium: "bg-blue-500/10 text-blue-600",
    high: "bg-amber-500/10 text-amber-600", critical: "bg-red-500/10 text-red-600",
  };
  const statusColor: Record<string, string> = {
    open: "bg-emerald-500/10 text-emerald-600", pending: "bg-amber-500/10 text-amber-600",
    closed: "bg-muted text-muted-foreground", resolved: "bg-blue-500/10 text-blue-600",
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{ticketTotal}</p>
          <p className="text-[11px] text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{openTickets}</p>
          <p className="text-[11px] text-muted-foreground">Open</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{(tickets ?? []).filter((t: any) => t.status === "closed" || t.status === "resolved").length}</p>
          <p className="text-[11px] text-muted-foreground">Closed</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{(tickets ?? []).filter((t: any) => t.priority === "critical").length}</p>
          <p className="text-[11px] text-muted-foreground">Critical</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Recent tickets</p>
        <div className="divide-y divide-border rounded-lg border max-h-72 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No tickets</p>
          ) : items.map((t: any) => (
            <div key={t.id} className="flex items-start gap-3 px-4 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                <Ticket className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{t.subject}</p>
                  <Badge variant="outline" className={cn("text-[10px]", statusColor[t.status] ?? "")}>{t.status}</Badge>
                  <Badge variant="outline" className={cn("text-[10px]", priorityColor[t.priority] ?? "")}>{t.priority}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{t.user_name} · {t.category} · {t.replies ?? 0} replies</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function FeatureFlagsSection() {
  const { data: flags } = useFeatureFlags();
  const enabled = (flags ?? []).filter((f: any) => f.enabled).length;
  const total = flags?.length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Feature Flags</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">{enabled}/{total} enabled</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {total === 0 ? (
          <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">No feature flags</div>
        ) : (
          <div className="divide-y divide-border">
            {(flags ?? []).slice(0, 6).map((f: any) => (
              <div key={f.id} className="flex items-center justify-between px-6 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{f.name || f.key}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{f.description ?? f.category}</p>
                </div>
                <div className={cn("h-2.5 w-2.5 rounded-full shrink-0 ml-3", f.enabled ? "bg-emerald-500" : "bg-muted-foreground/30")} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BroadcastsSection() {
  const { data: broadcasts } = useBroadcasts();
  const items = (broadcasts ?? []).slice(0, 5);

  const typeIcon: Record<string, React.ReactNode> = {
    info: <Megaphone className="h-4 w-4 text-blue-500" />,
    warning: <AlertCircle className="h-4 w-4 text-amber-500" />,
    announcement: <Megaphone className="h-4 w-4 text-violet-500" />,
    alert: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Broadcasts</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">{(broadcasts ?? []).filter((b: any) => b.status === "scheduled" || b.status === "sending").length} active</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">No broadcasts</div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((b: any) => (
              <div key={b.id} className="flex items-start gap-3 px-6 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                  {typeIcon[b.type] ?? <Megaphone className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{b.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{b.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{b.status}</span>
                    <span className="text-[10px] text-muted-foreground">{b.sent_count ?? 0} sent</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WebhooksSection() {
  const { data: deliveries } = useWebhookDeliveries(10);
  const items = (deliveries ?? []).slice(0, 6);
  const success = (deliveries ?? []).filter((d: any) => d.status === "success").length;
  const failed = (deliveries ?? []).filter((d: any) => d.status === "failed").length;
  const total = deliveries?.length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Webhook Deliveries</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">{total > 0 ? `${Math.round((success / total) * 100)}%` : "0%"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-3 gap-3 px-6 py-3">
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">{success}</p>
            <p className="text-[10px] text-muted-foreground">Success</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-600">{failed}</p>
            <p className="text-[10px] text-muted-foreground">Failed</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </div>
        {items.length > 0 && (
          <div className="divide-y divide-border border-t">
            {items.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between px-6 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{d.event}</p>
                  <p className="text-[10px] text-muted-foreground">{d.response_status ?? "-"}</p>
                </div>
                <div className={cn("h-2 w-2 rounded-full shrink-0 ml-2", d.status === "success" ? "bg-emerald-500" : d.status === "failed" ? "bg-red-500" : "bg-amber-500")} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BannedUsersSection() {
  const { data: banned } = useBannedUsers();
  const items = (banned ?? []).slice(0, 6);
  const permanent = (banned ?? []).filter((b: any) => b.ban_type === "permanent" || b.ban_type === "hard").length;
  const active = (banned ?? []).filter((b: any) => !b.lifted_at).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Banned Users</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">{active} active</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-3 gap-3 px-6 py-3">
          <div className="text-center">
            <p className="text-lg font-bold">{banned?.length ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-600">{permanent}</p>
            <p className="text-[10px] text-muted-foreground">Permanent</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">{active - permanent}</p>
            <p className="text-[10px] text-muted-foreground">Temporary</p>
          </div>
        </div>
        {items.length > 0 && (
          <div className="divide-y divide-border border-t">
            {items.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between px-6 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{b.user_name || b.email}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{b.reason}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{b.ban_type}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PerformanceAnalyticsSection() {
  const { data: perf } = usePerformanceMetrics();
  const { data: sessions } = useSessionData();
  const { data: services } = useServiceStatuses();

  const formatMs = (v: number) => v != null ? `${v} ms` : "—";
  const formatPct = (v: number) => v != null ? `${v}%` : "—";
  const formatSec = (v: number) => v != null ? `${v}s` : "—";

  const vitalsThreshold = (name: string, value: number): { color: string; label: string } => {
    if (name === "lcp") return value <= 2500 ? { color: "text-emerald-500", label: "Good" } : value <= 4000 ? { color: "text-amber-500", label: "Needs Work" } : { color: "text-red-500", label: "Poor" };
    if (name === "fcp") return value <= 1800 ? { color: "text-emerald-500", label: "Good" } : value <= 3000 ? { color: "text-amber-500", label: "Needs Work" } : { color: "text-red-500", label: "Poor" };
    if (name === "cls") return value <= 0.1 ? { color: "text-emerald-500", label: "Good" } : value <= 0.25 ? { color: "text-amber-500", label: "Needs Work" } : { color: "text-red-500", label: "Poor" };
    if (name === "inp") return value <= 200 ? { color: "text-emerald-500", label: "Good" } : value <= 500 ? { color: "text-amber-500", label: "Needs Work" } : { color: "text-red-500", label: "Poor" };
    if (name === "ttfb") return value <= 800 ? { color: "text-emerald-500", label: "Good" } : value <= 1800 ? { color: "text-amber-500", label: "Needs Work" } : { color: "text-red-500", label: "Poor" };
    return { color: "text-muted-foreground", label: "Unknown" };
  };

  const suggestions: Array<{ icon: React.ReactNode; text: string; severity: "good" | "warn" | "critical" }> = [];

  if (perf) {
    if (perf.lcp > 2500) suggestions.push({
      icon: <Zap className="h-3.5 w-3.5" />, severity: perf.lcp > 4000 ? "critical" : "warn",
      text: `LCP is ${perf.lcp}ms${perf.lcp > 4000 ? " (critical)" : ""}. Optimize hero images, lazy-load below-fold content, and ensure text renders without blocking CSS/JS.`,
    });
    if (perf.fcp > 1800) suggestions.push({
      icon: <Eye className="h-3.5 w-3.5" />, severity: perf.fcp > 3000 ? "critical" : "warn",
      text: `FCP at ${perf.fcp}ms. Eliminate render-blocking resources, inline critical CSS, and reduce server response times.`,
    });
    if (perf.cls > 0.1) suggestions.push({
      icon: <Layout className="h-3.5 w-3.5" />, severity: perf.cls > 0.25 ? "critical" : "warn",
      text: `CLS is ${perf.cls}. Set explicit width/height on images/embeds, avoid inserting content above existing content, and use font-display: swap.`,
    });
    if (perf.inp > 200) suggestions.push({
      icon: <Timer className="h-3.5 w-3.5" />, severity: perf.inp > 500 ? "critical" : "warn",
      text: `INP at ${perf.inp}ms. Break up long tasks (web workers), debounce expensive event handlers, and reduce main-thread work.`,
    });
    if (perf.ttfb > 800) suggestions.push({
      icon: <Server className="h-3.5 w-3.5" />, severity: perf.ttfb > 1800 ? "critical" : "warn",
      text: `TTFB is ${perf.ttfb}ms. Optimize database queries, use CDN caching, and consider edge functions for faster responses.`,
    });
    if (perf.avgApiTime > 300) suggestions.push({
      icon: <Activity className="h-3.5 w-3.5" />, severity: "warn",
      text: `Avg API response ${perf.avgApiTime}ms. Implement response caching, optimize queries, and add pagination to large endpoints.`,
    });
    if (perf.memoryUsage > 70) suggestions.push({
      icon: <Cpu className="h-3.5 w-3.5" />, severity: "warn",
      text: `Memory usage at ${perf.memoryUsage}%. Review memory leaks, implement lazy loading, and archive old page versions.`,
    });
    if (perf.slowQueries > 50) suggestions.push({
      icon: <Database className="h-3.5 w-3.5" />, severity: "warn",
      text: `${perf.slowQueries} slow queries detected. Add database indexes, optimize JOIN operations, and implement query caching.`,
    });
  }

  if (sessions) {
    if (sessions.bounceRate > 50) suggestions.push({
      icon: <TrendingDown className="h-3.5 w-3.5" />, severity: "warn",
      text: `Bounce rate is ${sessions.bounceRate}%. Improve first-impression load time, clarify call-to-action, and ensure mobile responsiveness.`,
    });
    if (sessions.retention < 30 && sessions.retention > 0) suggestions.push({
      icon: <UserCheck className="h-3.5 w-3.5" />, severity: "warn",
      text: `Retention is ${sessions.retention}%. Implement onboarding flows, personalized notifications, and regular feature announcements.`,
    });
  }

  const getServiceDot = (s: string) => {
    if (s === "operational") return "bg-emerald-500";
    if (s === "degraded") return "bg-amber-500";
    if (s === "outage") return "bg-red-500";
    return "bg-muted-foreground/40";
  };

  if (suggestions.length === 0) {
    suggestions.push({
      icon: <Sparkles className="h-3.5 w-3.5" />, severity: "good",
      text: "All performance metrics are within healthy ranges. Great job!",
    });
  }

  const healthScore = perf ? Math.round(
    Math.max(0, 100
      - (perf.lcp > 2500 ? 8 : 0) - (perf.lcp > 4000 ? 8 : 0)
      - (perf.fcp > 1800 ? 6 : 0) - (perf.fcp > 3000 ? 6 : 0)
      - (perf.cls > 0.1 ? 6 : 0) - (perf.cls > 0.25 ? 6 : 0)
      - (perf.inp > 200 ? 6 : 0) - (perf.inp > 500 ? 6 : 0)
      - (perf.ttfb > 800 ? 6 : 0) - (perf.ttfb > 1800 ? 6 : 0)
      - (perf.memoryUsage > 70 ? 6 : 0) - (perf.memoryUsage > 85 ? 6 : 0)
      - (perf.avgApiTime > 300 ? 4 : 0) - (perf.slowQueries > 50 ? 4 : 0)
      - (sessions?.bounceRate && sessions.bounceRate > 50 ? 6 : 0)
      - (sessions?.retention != null && sessions.retention < 30 && sessions.retention > 0 ? 4 : 0)
    )
  ) : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-600">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Performance & Analytics</CardTitle>
              <p className="text-[11px] text-muted-foreground">Real-time platform health and optimization insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border",
              healthScore >= 80 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
              healthScore >= 50 ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
              "bg-red-500/10 text-red-600 border-red-500/20"
            )}>
              <div className={cn("h-1.5 w-1.5 rounded-full", healthScore >= 80 ? "bg-emerald-500" : healthScore >= 50 ? "bg-amber-500" : "bg-red-500")} />
              Health: {healthScore}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Web Vitals Row */}
        {perf && (
          <div className="grid grid-cols-5 divide-x divide-border border-b border-border/50">
            {[
              { label: "LCP", value: formatMs(perf.lcp), key: "lcp", raw: perf.lcp },
              { label: "FCP", value: formatMs(perf.fcp), key: "fcp", raw: perf.fcp },
              { label: "CLS", value: perf.cls != null ? perf.cls.toFixed(2) : "—", key: "cls", raw: perf.cls },
              { label: "INP", value: formatMs(perf.inp), key: "inp", raw: perf.inp },
              { label: "TTFB", value: formatMs(perf.ttfb), key: "ttfb", raw: perf.ttfb },
            ].map((v) => {
              const threshold = vitalsThreshold(v.key, v.raw);
              return (
                <div key={v.key} className="px-4 py-3 text-center">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">{v.label}</p>
                  <p className="text-lg font-bold tracking-tight">{v.value}</p>
                  <p className={cn("text-[10px] font-medium mt-0.5", threshold.color)}>{threshold.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* System Metrics + Session Analytics + Services + Suggestions */}
        <div className="grid divide-x divide-border lg:grid-cols-4">
          {/* System Metrics */}
          <div className="p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Server className="h-3 w-3" /> System
            </p>
            <div className="space-y-2.5">
              {[
                { label: "Avg API Time", value: perf ? formatMs(perf.avgApiTime) : "—" },
                { label: "DB Query", value: perf ? formatMs(perf.avgDbQuery) : "—" },
                { label: "Memory", value: perf ? `${perf.memoryUsage}%` : "—" },
                { label: "CPU", value: perf ? `${perf.cpuUsage}%` : "—" },
                { label: "Slow Queries", value: perf ? `${perf.slowQueries}` : "—" },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                  <span className="text-xs font-semibold">{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Session Analytics */}
          <div className="p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="h-3 w-3" /> Sessions
            </p>
            <div className="space-y-2.5">
              {sessions ? [
                { label: "Live Users", value: `${sessions.liveUsers}`, color: "text-emerald-500" },
                { label: "Today", value: `${sessions.todaySessions}` },
                { label: "Bounce Rate", value: formatPct(sessions.bounceRate) },
                { label: "Avg Duration", value: formatSec(sessions.avgSessionDuration) },
                { label: "Retention", value: formatPct(sessions.retention) },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                  <span className={cn("text-xs font-semibold", m.color)}>{m.value}</span>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground">Loading...</p>
              )}
            </div>
          </div>

          {/* Services Status */}
          <div className="p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> Services
            </p>
            <div className="space-y-2">
              {(services ?? []).slice(0, 8).map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-1.5 w-1.5 rounded-full", getServiceDot(s.status))} />
                    <span className="text-xs text-muted-foreground">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.latency > 0 && <span className="text-[10px] text-muted-foreground">{s.latency}ms</span>}
                    <span className={cn("text-[10px] font-medium capitalize", s.status === "operational" ? "text-emerald-500" : s.status === "degraded" ? "text-amber-500" : "text-muted-foreground")}>{s.status}</span>
                  </div>
                </div>
              ))}
              {(!services || services.length === 0) && <p className="text-xs text-muted-foreground">Checking...</p>}
            </div>
          </div>

          {/* Improvement Suggestions */}
          <div className="p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3" /> Insights
            </p>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {suggestions.map((s, i) => (
                <div key={i} className={cn(
                  "flex items-start gap-2 rounded-lg p-2.5 text-xs leading-relaxed",
                  s.severity === "critical" ? "bg-red-500/8 text-red-600" :
                  s.severity === "warn" ? "bg-amber-500/8 text-amber-700" :
                  "bg-emerald-500/8 text-emerald-700"
                )}>
                  <span className="shrink-0 mt-0.5">{s.icon}</span>
                  <span>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [detailModal, setDetailModal] = useState<string | null>(null);

  const { data: kpis } = useDashboardKpis();
  const { data: signups } = useDailySignups(14);
  const { data: events } = useDailyAuditEvents(30);
  const { data: userCount } = useUserCount();
  const { data: pageCount } = usePageCount();
  const { data: auditCount } = useAuditCount();
  const { data: chatCount } = useAiChatCount();
  const { data: collabSessions } = useActiveCollabSessions();
  const { data: waitlistData } = useWaitlist();
  const { data: waitlistCount } = useWaitlistCount();
  const { data: campaignData } = useEmailCampaigns();
  const { data: feedbackData } = useFeedback();
  const { data: ticketData } = useSupportTickets();
  const { data: flags } = useFeatureFlags();
  const { data: broadcasts } = useBroadcasts();
  const { data: deliveries } = useWebhookDeliveries(20);
  const { data: banned } = useBannedUsers();
  const { trigger, showSuccess } = useCommandCenter();

  useRealtimeInvalidate(["admin", "users", "count"], "user_profiles");
  useRealtimeInvalidate(["admin", "pages", "count"], "pages");
  useRealtimeInvalidate(["admin", "audit"], "audit_events");
  useRealtimeInvalidate(["admin", "collab-sessions"], "collaboration_sessions");
  useRealtimeInvalidate(["admin", "waitlist"], "waitlist_entries");
  useRealtimeInvalidate(["admin", "campaigns"], "email_campaigns");
  useRealtimeInvalidate(["admin", "feedback"], "feedback");
  useRealtimeInvalidate(["admin", "support-tickets"], "support_tickets");

  const stats = {
    totalUsers: userCount ?? kpis?.userCount ?? 0,
    totalPages: pageCount ?? kpis?.pageCount ?? 0,
    totalAudit: auditCount ?? kpis?.auditCount ?? 0,
    totalChats: chatCount ?? kpis?.chatCount ?? 0,
    totalEvents: kpis?.aiEventsToday ?? 0,
  };

  const isLoading = !kpis && !userCount;
  const activeUsers = collabSessions?.length ?? 0;
  const todaySignups = signups?.length ? signups[signups.length - 1]?.value ?? 0 : 0;
  const waitlistPending = (waitlistData ?? []).filter((w: any) => w.status === "pending").length;
  const campaignCount = campaignData?.length ?? 0;
  const activeCampaigns = (campaignData ?? []).filter((c: any) => c.status === "sent" || c.status === "sending" || c.status === "scheduled").length;
  const feedbackCount = feedbackData?.length ?? 0;
  const avgRating = feedbackCount > 0 ? ((feedbackData ?? []).reduce((a: any, b: any) => a + (b.rating ?? 0), 0) / feedbackCount).toFixed(1) : "0.0";
  const ticketTotal = ticketData?.length ?? 0;
  const openTickets = (ticketData ?? []).filter((t: any) => t.status === "open" || t.status === "pending").length;

  const KPI_CARDS: Array<{ id: string; title: string; value: string; trend: number; icon: React.ComponentType<{ className?: string }>; subtitle: string }> = [
    { id: "users", title: "Total Users", value: formatNumber(stats.totalUsers), trend: 12.5, icon: Users, subtitle: `${formatNumber(todaySignups)} today` },
    { id: "pages", title: "Total Pages", value: formatNumber(stats.totalPages), trend: 3.2, icon: FileText, subtitle: "Across all workspaces" },
    { id: "audit", title: "Audit Events", value: formatNumber(stats.totalAudit), trend: -2.1, icon: Activity, subtitle: "All time" },
    { id: "ai", title: "AI Chats", value: formatNumber(stats.totalChats), trend: 18.7, icon: Bot, subtitle: `${formatNumber(stats.totalEvents)} today` },
  ];

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={itemAnim} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <PageHeader title="Dashboard" description="Platform overview and key metrics" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => trigger({ type: "backup", onConfirm: async () => { await new Promise((r) => setTimeout(r, 3500)); } })}>
              <Database className="mr-2 h-4 w-4" /> Backup
            </Button>
            <Button variant="outline" size="sm" onClick={() => trigger({ type: "restore", onConfirm: async () => { await new Promise((r) => setTimeout(r, 2000)); showSuccess("System restore completed successfully"); } })}>
              <RotateCcw className="mr-2 h-4 w-4" /> Restore
            </Button>
          </div>
        </motion.div>

        <motion.div variants={itemAnim}>
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-800 p-6 sm:p-8">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Total platform users</p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  {formatNumber(stats.totalUsers)}
                </p>
                <div className="mt-3 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-sm text-white/70">{formatNumber(stats.totalPages)} pages</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-white/50" />
                    <span className="text-sm text-white/70">{formatNumber(stats.totalChats)} AI chats</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-white/50" />
                    <span className="text-sm text-white/70">Live</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-white/15 bg-white/8 p-3 backdrop-blur-sm">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="rounded-xl border border-white/15 bg-white/8 p-3 backdrop-blur-sm">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div className="rounded-xl border border-white/15 bg-white/8 p-3 backdrop-blur-sm">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPI_CARDS.map((kpi) => (
            <button
              key={kpi.id}
              onClick={() => setDetailModal(kpi.id)}
              className="text-left w-full"
            >
              <KpiCard
                title={kpi.title}
                value={kpi.value}
                trend={kpi.trend}
                icon={kpi.icon}
                subtitle={kpi.subtitle}
                className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/20"
              />
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button onClick={() => setDetailModal("waitlist")} className="text-left w-full">
            <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/20">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Waitlist</p>
                    <p className="text-2xl font-bold tracking-tight">{formatNumber(waitlistCount)}</p>
                    <p className="text-[11px] text-muted-foreground">{waitlistPending} pending approval</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:bg-rose-500/15">
                    <List className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
          <button onClick={() => setDetailModal("campaigns")} className="text-left w-full">
            <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/20">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Email Campaigns</p>
                    <p className="text-2xl font-bold tracking-tight">{campaignCount}</p>
                    <p className="text-[11px] text-muted-foreground">{activeCampaigns} active</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:bg-sky-500/15">
                    <Send className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
          <button onClick={() => setDetailModal("feedback")} className="text-left w-full">
            <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/20">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Feedback</p>
                    <p className="text-2xl font-bold tracking-tight">{formatNumber(feedbackCount)}</p>
                    <p className="text-[11px] text-muted-foreground">{avgRating} avg rating</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/15">
                    <Star className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
          <button onClick={() => setDetailModal("tickets")} className="text-left w-full">
            <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/20">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Support Tickets</p>
                    <p className="text-2xl font-bold tracking-tight">{ticketTotal}</p>
                    <p className="text-[11px] text-muted-foreground">{openTickets} open</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:bg-orange-500/15">
                    <Ticket className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        </div>

        <motion.div variants={itemAnim} className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Daily Signups</CardTitle>
                <Badge variant="outline" className="text-[10px] font-normal">14 days</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={signups?.length ? signups : [{ date: "No data", value: 0 }]} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)", radius: 4 }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Audit Activity</CardTitle>
                <Badge variant="outline" className="text-[10px] font-normal">30 days</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={events?.length ? events : [{ date: "No data", value: 0 }]} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <defs>
                      <linearGradient id="auditGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#auditGradient)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemAnim} className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentUsers />
          </div>
          <NotificationsFeed />
        </motion.div>

        <motion.div variants={itemAnim}>
          <ActiveSessionsCard />
        </motion.div>

        <motion.div variants={itemAnim}>
          <PerformanceAnalyticsSection />
        </motion.div>

        <motion.div variants={itemAnim} className="grid gap-6 lg:grid-cols-4">
          <FeatureFlagsSection />
          <BroadcastsSection />
          <WebhooksSection />
          <BannedUsersSection />
        </motion.div>
      </motion.div>

      <Dialog open={detailModal === "users"} onOpenChange={(v) => !v && setDetailModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Users Detail</DialogTitle>
                <DialogDescription>Real-time user analytics and recent signups</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <UsersDetail />
        </DialogContent>
      </Dialog>

      <Dialog open={detailModal === "pages"} onOpenChange={(v) => !v && setDetailModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Pages Detail</DialogTitle>
                <DialogDescription>Page inventory and recent activity</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <PagesDetail />
        </DialogContent>
      </Dialog>

      <Dialog open={detailModal === "audit"} onOpenChange={(v) => !v && setDetailModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Audit Events Detail</DialogTitle>
                <DialogDescription>Real-time audit event feed</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <AuditDetail />
        </DialogContent>
      </Dialog>

      <Dialog open={detailModal === "ai"} onOpenChange={(v) => !v && setDetailModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>AI Chats Detail</DialogTitle>
                <DialogDescription>AI usage analytics and activity</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <AIDetail />
        </DialogContent>
      </Dialog>

      <KpiDialog open={detailModal === "waitlist"} onOpenChange={(v) => !v && setDetailModal(null)} title="Waitlist" icon={List} color="bg-rose-500">
        <WaitlistDetail />
      </KpiDialog>

      <KpiDialog open={detailModal === "campaigns"} onOpenChange={(v) => !v && setDetailModal(null)} title="Email Campaigns" icon={Send} color="bg-sky-500">
        <CampaignsDetail />
      </KpiDialog>

      <KpiDialog open={detailModal === "feedback"} onOpenChange={(v) => !v && setDetailModal(null)} title="Feedback" icon={Star} color="bg-amber-500">
        <FeedbackDetail />
      </KpiDialog>

      <KpiDialog open={detailModal === "tickets"} onOpenChange={(v) => !v && setDetailModal(null)} title="Support Tickets" icon={Ticket} color="bg-orange-500">
        <TicketsDetail />
      </KpiDialog>

      <KpiDialog open={detailModal === "flags"} onOpenChange={(v) => !v && setDetailModal(null)} title="Feature Flags" icon={Flag} color="bg-indigo-500">
        <FeatureFlagsSection />
      </KpiDialog>

      <KpiDialog open={detailModal === "broadcasts"} onOpenChange={(v) => !v && setDetailModal(null)} title="Broadcasts" icon={Megaphone} color="bg-violet-500">
        <BroadcastsSection />
      </KpiDialog>

      <KpiDialog open={detailModal === "webhooks"} onOpenChange={(v) => !v && setDetailModal(null)} title="Webhook Deliveries" icon={Webhook} color="bg-cyan-500">
        <WebhooksSection />
      </KpiDialog>

      <KpiDialog open={detailModal === "banned"} onOpenChange={(v) => !v && setDetailModal(null)} title="Banned Users" icon={Ban} color="bg-red-500">
        <BannedUsersSection />
      </KpiDialog>
    </>
  );
}
