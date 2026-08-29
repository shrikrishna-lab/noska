import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useUsers, useUserCount, usePageCount, useAuditEvents, useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMemo } from "react";
import { BarChart3, Activity, Users, FileText, Clock, TrendingUp } from "lucide-react";

export function PostHog() {
  const { data: users } = useUsers();
  const { data: userCount } = useUserCount();
  const { data: pageCount } = usePageCount();
  const { data: events, isLoading } = useAuditEvents(500);
  useRealtimeInvalidate(["admin", "posthog"], "audit_events", "*");

  const todayEvents = useMemo(() => {
    if (!events) return 0;
    const today = new Date().toDateString();
    return events.filter((e) => e.created_at && new Date(e.created_at).toDateString() === today).length;
  }, [events]);

  const uniqueUsers = useMemo(() => {
    if (!events) return 0;
    return new Set(events.filter((e) => e.user_id).map((e) => e.user_id)).size;
  }, [events]);

  const topActions = useMemo(() => {
    if (!events) return [];
    const counts = new Map<string, number>();
    for (const e of events) {
      counts.set(e.action, (counts.get(e.action) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));
  }, [events]);

  const hourlyActivity = useMemo(() => {
    if (!events) return [];
    const hours = new Array(24).fill(0);
    const now = new Date();
    for (const e of events) {
      if (!e.created_at) continue;
      const d = new Date(e.created_at);
      if (now.getTime() - d.getTime() < 86400000) {
        hours[d.getHours()]++;
      }
    }
    return hours.map((count, hour) => ({ hour: `${hour}:00`, count }));
  }, [events]);

  const maxHourly = Math.max(...hourlyActivity.map((h) => h.count), 1);

  if (isLoading) return <div className="p-6"><PageHeader title="Product Analytics" description="User behavior and engagement" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Product Analytics" description="User behavior and engagement metrics" />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Users</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /><p className="text-2xl font-bold">{userCount ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Pages</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-500" /><p className="text-2xl font-bold">{pageCount ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Today's Events</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2"><Activity className="h-4 w-4 text-violet-500" /><p className="text-2xl font-bold">{todayEvents}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Active Users (all time)</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-amber-500" /><p className="text-2xl font-bold">{uniqueUsers}</p></CardContent>
        </Card>
      </div>

      {/* Hourly Activity (24h) */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" />Activity (Last 24h)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {hourlyActivity.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-violet-500 to-violet-400 rounded-t transition-all"
                  style={{ height: `${(h.count / maxHourly) * 100}%`, minHeight: h.count > 0 ? 4 : 0 }}
                  title={`${h.hour}: ${h.count} events`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
            <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Top Actions</CardTitle></CardHeader>
        <CardContent>
          {topActions.length > 0 ? (
            <div className="space-y-2">
              {topActions.map(({ action, count }) => {
                const maxCount = topActions[0]?.count ?? 1;
                return (
                  <div key={action} className="flex items-center gap-3 rounded-lg border p-3">
                    <span className="text-sm font-medium min-w-[140px] truncate">{action}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground font-mono min-w-[60px] text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No events recorded" description="Events will appear once users start interacting with the platform." icon={Activity} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
