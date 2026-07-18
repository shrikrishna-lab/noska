import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { useTeams, type DbTeam, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

const columns: Column<DbTeam>[] = [
  { key: "name", label: "Team", sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
  { key: "lead_name", label: "Lead", sortable: true, render: (row) => row.lead_name || <span className="text-muted-foreground">—</span> },
  { key: "member_count", label: "Members", sortable: true, className: "text-right" },
  { key: "workspace_count", label: "Workspaces", sortable: true, className: "text-right", hideOnMobile: true },
  { key: "created_at", label: "Created", sortable: true, render: (row) => row.created_at ? <span className="text-muted-foreground">{formatRelativeTime(row.created_at)}</span> : "—", hideOnMobile: true },
];

export function Teams() {
  const { data: teams, isLoading } = useTeams();
  useRealtimeInvalidate(["admin", "teams"], "teams");

  if (isLoading) return <div className="p-6"><PageHeader title="Teams" description="Manage teams across workspaces" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Teams" description="Manage teams across workspaces" />
      {teams && teams.length > 0 ? (
        <DataTable columns={columns} data={teams} searchPlaceholder="Search teams..." />
      ) : (
        <EmptyState title="No teams yet" description="Teams will appear here once created by administrators." />
      )}
    </div>
  );
}
