import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceSettings, usePages, usePageCount } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

interface WorkspaceDisplay {
  id: string; name: string; key: string; created_at: string | null; documents: number;
}

const columns: Column<WorkspaceDisplay>[] = [
  { key: "name", label: "Workspace", sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
  { key: "key", label: "Key", sortable: true, render: (row) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{row.key}</code> },
  { key: "documents", label: "Documents", sortable: true, className: "text-right" },
  { key: "created_at", label: "Created", sortable: true, render: (row) => row.created_at ? <span className="text-muted-foreground">{formatRelativeTime(row.created_at)}</span> : "—", hideOnMobile: true },
];

export function Workspaces() {
  const { data: settings, isLoading: loadSettings } = useWorkspaceSettings();
  const { data: pages } = usePages();
  const { data: totalPages } = usePageCount();

  if (loadSettings) return <div className="p-6"><PageHeader title="Workspaces" description="Manage all workspaces on the platform" /><LoadingState count={4} /></div>;

  const workspaces: WorkspaceDisplay[] = (settings ?? []).map((s) => ({
    id: s.id, name: String((s.value as Record<string, string>)?.name || s.key), key: s.key,
    created_at: s.created_at, documents: pages?.filter((p) => p.user_id?.includes(s.key)).length ?? 0,
  }));

  return (
    <div className="p-6">
      <PageHeader title="Workspaces" description={`${totalPages ?? 0} total documents across ${workspaces.length} workspaces`} />
      {workspaces.length > 0 ? (
        <DataTable columns={columns} data={workspaces} searchPlaceholder="Search workspaces..." />
      ) : (
        <EmptyState title="No workspaces found" description="Workspace settings will appear here once created." />
      )}
    </div>
  );
}
