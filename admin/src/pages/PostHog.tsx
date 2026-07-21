import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useUsers, useUserCount, usePageCount, useAuditEvents, useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMemo } from "react";
import { BarChart3, Activity, Users, FileText } from "lucide-react";

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
    return new Set(events.map((e) => e.user_name)).size;
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

  if (isLoading) return <div className="p-6"><PageHeader title="PostHog" description="Product analytics" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="PostHog" description="Product analytics and user behavior" />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Users</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><p className="text-2xl font-bold">{userCount ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Pages</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><p className="text-2xl font-bold">{pageCount ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Today's Events</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /><p className="text-2xl font-bold">{todayEvents}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Active Users</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-muted-foreground" /><p className="text-2xl font-bold">{uniqueUsers}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Top Actions</CardTitle></CardHeader>
        <CardContent>
          {topActions.length > 0 ? (
            <div className="space-y-2">
              {topActions.map(({ action, count }) => (
                <div key={action} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">{action}</span>
                  <span className="text-sm text-muted-foreground">{count} events</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No events recorded" description="Events will appear once users start interacting with the platform." icon={Activity} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
