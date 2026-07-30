import { motion } from "framer-motion";
import { useState } from "react";
import { Users, FileText, Bot, Activity, Database, HardDrive, BarChart3, UserCheck, Radio, Wifi, Globe, Bell } from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { useDashboardKpis, useDailySignups, useDailyAuditEvents, useUserCount, usePageCount, useAuditCount, useAiChatCount, useActiveCollabSessions, useRealtimeInvalidate, useRealtimeAuditFeed } from "@/lib/queries";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const STATUS_DOT: Record<string, string> = {
  viewing: "bg-blue-500",
  editing: "bg-green-500",
  idle: "bg-yellow-500",
};

export function Dashboard() {
  const { data: kpis } = useDashboardKpis();
  const { data: signups } = useDailySignups(14);
  const { data: events } = useDailyAuditEvents(30);
  const { data: userCount } = useUserCount();
  const { data: pageCount } = usePageCount();
  const { data: auditCount } = useAuditCount();
  const { data: chatCount } = useAiChatCount();
  const { data: collabSessions } = useActiveCollabSessions();

  const stats = {
    totalUsers: userCount ?? kpis?.userCount ?? 0,
    totalPages: pageCount ?? kpis?.pageCount ?? 0,
    totalAudit: auditCount ?? kpis?.auditCount ?? 0,
    totalChats: chatCount ?? kpis?.chatCount ?? 0,
    totalEvents: kpis?.aiEventsToday ?? 0,
  };

  const isLoading = !kpis && !userCount;
  const activeUsers = collabSessions?.length ?? 0;
  const liveEvents = useRealtimeAuditFeed(8);
  useRealtimeInvalidate(["admin", "collab-sessions"], "collaboration_sessions", "*");
  useRealtimeInvalidate(["admin", "audit"], "audit_events", "INSERT");

  const KPI_CARDS = [
    { title: "Total Users", value: formatNumber(stats.totalUsers), trend: 0, icon: Users },
    { title: "Total Pages", value: formatNumber(stats.totalPages), trend: 0, icon: FileText },
    { title: "Audit Events", value: formatNumber(stats.totalAudit), trend: 0, icon: Activity },
    { title: "AI Chats", value: formatNumber(stats.totalChats), trend: 0, icon: Bot },
    { title: "User Profiles", value: formatNumber(stats.totalUsers), trend: 0, icon: UserCheck },
    { title: "AI Events Today", value: formatNumber(stats.totalEvents || 0), trend: 0, icon: Bot },
    { title: "Live Now", value: `${activeUsers} online`, trend: 0, icon: Radio },
    { title: "Storage", value: `${Math.round(stats.totalPages * 0.02)}MB`, trend: 0, icon: HardDrive },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Dashboard" description="Platform overview and key metrics" /><LoadingState count={8} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Dashboard" description="Platform overview and key metrics" />

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((kpi) => (
          <motion.div key={kpi.title} variants={itemAnim}>
            <KpiCard {...kpi} />
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Daily Signups (14 days)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signups?.length ? signups : [{ date: "No data", value: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Audit Events (30 days)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={events?.length ? events : [{ date: "No data", value: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {collabSessions && collabSessions.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-500" />
              <CardTitle className="text-sm font-medium">Active Realtime Sessions</CardTitle>
              <Badge variant="secondary" className="ml-auto text-xs">{collabSessions.length} active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(collabSessions as any[]).map((s: { id: string; user_name: string; user_color: string; status: string; current_block_id: string | null; last_activity: string; page_id: string }) => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <Avatar className="h-7 w-7" style={{ backgroundColor: s.user_color || "#7c3aed" }}>
                    <AvatarFallback className="text-[10px] text-white">{(s.user_name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{s.user_name}</span>
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s.status] ?? "bg-gray-400"}`} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {s.current_block_id ? `Editing block · ` : ""}
                      {formatRelativeTime(s.last_activity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">Live Activity Feed</CardTitle>
              {liveEvents.length > 0 && <Badge variant="secondary" className="ml-auto text-xs animate-pulse">{liveEvents.length} new</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {liveEvents.length > 0 ? (
              <div className="space-y-2">
                {liveEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    <span className="font-medium">{ev.user_name}</span>
                    <span className="text-muted-foreground">{ev.action}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{formatRelativeTime(ev.created_at || "")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
                Waiting for live events...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
