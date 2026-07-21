import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { useAuditEvents, useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMemo } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { AlertTriangle, BarChart3 } from "lucide-react";

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
  const { data: events, isLoading } = useAuditEvents(100);
  useRealtimeInvalidate(["admin", "sentry"], "audit_events", "*");

  const errorEvents = useMemo(() =>
    (events ?? []).filter((e) =>
      e.action?.toLowerCase().includes("error") ||
      e.action?.toLowerCase().includes("fail") ||
      e.detail?.toLowerCase().includes("error") ||
      e.detail?.toLowerCase().includes("exception") ||
      e.detail?.toLowerCase().includes("crash")
    ), [events]);

  const errorCount = errorEvents.length;
  const totalEvents = events?.length ?? 0;
  const errorRate = totalEvents > 0 ? ((errorCount / totalEvents) * 100).toFixed(1) : "0.0";

  if (isLoading) return <div className="p-6"><PageHeader title="Sentry" description="Error monitoring" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Sentry" description="Error monitoring and crash reporting" />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Error Events</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-500">{errorCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Events</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalEvents}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Error Rate</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{errorRate}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Last 24h</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{errorCount}</p></CardContent>
        </Card>
      </div>

      {errorEvents.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Error Events</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} data={errorEvents} searchable searchPlaceholder="Search errors..." />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Error Events</CardTitle></CardHeader>
          <CardContent>
            <EmptyState title="No errors recorded" description="Your application is running smoothly with no error events." icon={AlertTriangle} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
