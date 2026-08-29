import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { useAuditEvents, useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMemo } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { AlertTriangle, ShieldAlert, Clock, TrendingDown } from "lucide-react";

interface ErrorEvent {
  id: string;
  action: string;
  user_name: string;
  detail: string | null;
  created_at: string | null;
}

const columns: Column<ErrorEvent>[] = [
  { key: "action", label: "Action", sortable: true, render: (row) => <Badge variant="destructive" className="font-mono text-xs">{row.action}</Badge> },
  { key: "user_name", label: "User", sortable: true },
  { key: "detail", label: "Detail", sortable: true, className: "max-w-[300px] truncate hidden md:table-cell" },
  { key: "created_at", label: "Time", sortable: true, render: (row) => row.created_at ? formatRelativeTime(row.created_at) : "—" },
];

export function Sentry() {
  const { data: events, isLoading } = useAuditEvents(500);
  useRealtimeInvalidate(["admin", "sentry"], "audit_events", "*");

  const errorEvents = useMemo(() =>
    (events ?? []).filter((e) =>
      e.action?.toLowerCase().includes("error") ||
      e.action?.toLowerCase().includes("fail") ||
      e.detail?.toLowerCase().includes("error") ||
      e.detail?.toLowerCase().includes("exception") ||
      e.detail?.toLowerCase().includes("crash") ||
      e.detail?.toLowerCase().includes("fail")
    ), [events]);

  const totalEvents = events?.length ?? 0;
  const errorCount = errorEvents.length;
  const errorRate = totalEvents > 0 ? ((errorCount / totalEvents) * 100).toFixed(1) : "0.0";

  const last24h = useMemo(() => {
    const cutoff = Date.now() - 86400000;
    return errorEvents.filter((e) => e.created_at && new Date(e.created_at).getTime() > cutoff).length;
  }, [errorEvents]);

  const lastHour = useMemo(() => {
    const cutoff = Date.now() - 3600000;
    return errorEvents.filter((e) => e.created_at && new Date(e.created_at).getTime() > cutoff).length;
  }, [errorEvents]);

  const topErrorActions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of errorEvents) {
      counts.set(e.action, (counts.get(e.action) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [errorEvents]);

  if (isLoading) return <div className="p-6"><PageHeader title="Error Monitoring" description="Application error tracking" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Error Monitoring" description="Track and investigate application errors" />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Errors</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <p className="text-2xl font-bold text-red-500">{errorCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Error Rate</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{errorRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Last 24h</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{last24h}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Last Hour</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{lastHour}</p>
          </CardContent>
        </Card>
      </div>

      {topErrorActions.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm font-medium">Top Error Types</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topErrorActions.map(([action, count]) => (
                <div key={action} className="flex items-center justify-between rounded-lg border p-3">
                  <Badge variant="destructive" className="font-mono text-xs mr-3">{action}</Badge>
                  <span className="text-sm font-medium">{count} occurrences</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {errorEvents.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Error Events</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} data={errorEvents} searchable searchPlaceholder="Search errors..." />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-8 w-8 mx-auto mb-3 text-emerald-500 opacity-50" />
            <p className="text-sm font-medium text-emerald-600">No errors recorded</p>
            <p className="text-xs text-muted-foreground mt-1">Your application is running smoothly.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
