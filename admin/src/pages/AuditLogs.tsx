import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuditEvents, useAuditCount } from "@/lib/queries";
import { formatRelativeTime, downloadCSV } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AuditEventRow } from "@/lib/queries";
import { Download } from "lucide-react";

const columns: Column<AuditEventRow>[] = [
  { key: "user_name", label: "User", sortable: true, render: (row) => <span className="font-medium">{row.user_name}</span> },
  { key: "action", label: "Action", sortable: true, render: (row) => <Badge variant="outline">{row.action}</Badge> },
  { key: "detail", label: "Detail", sortable: true, className: "max-w-xs truncate hidden md:table-cell", render: (row) => row.detail || <span className="text-muted-foreground">—</span> },
  { key: "created_at", label: "Time", sortable: true, render: (row) => <span className="text-muted-foreground">{formatRelativeTime(row.created_at!)}</span> },
];

export function AuditLogs() {
  const { data: events, isLoading } = useAuditEvents(100);
  const { data: total } = useAuditCount();

  if (isLoading) return <div className="p-6"><PageHeader title="Audit Logs" description="Track all administrative actions" /><LoadingState count={8} /></div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Audit Logs"
        description={`${total ?? 0} total events`}
        actions={
          events && events.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => downloadCSV("audit-logs.csv", events)}>
              <Download className="mr-1 h-3.5 w-3.5" /> Export
            </Button>
          ) : undefined
        }
      />
      {events && events.length > 0 ? (
        <DataTable columns={columns} data={events} searchPlaceholder="Search logs..." pageSize={20} />
      ) : (
        <EmptyState title="No audit events" description="Audit events will appear here as users interact with the platform." />
      )}
    </div>
  );
}
