import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { usePages, usePageCount, useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/utils";

interface PageDisplay {
  id: string;
  title: string;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  trashed: boolean;
}

const columns: Column<PageDisplay>[] = [
  { key: "title", label: "Title", sortable: true, render: (row) => <span className="font-medium">{row.title || "Untitled"}</span> },
  { key: "user_id", label: "User ID", sortable: true, className: "text-muted-foreground text-xs max-w-[120px] truncate hidden md:table-cell" },
  { key: "created_at", label: "Created", sortable: true, render: (row) => row.created_at ? formatRelativeTime(row.created_at) : "—" },
  { key: "updated_at", label: "Updated", sortable: true, render: (row) => row.updated_at ? formatRelativeTime(row.updated_at) : "—" },
  { key: "trashed", label: "Status", sortable: true, render: (row) => row.trashed ? <Badge variant="destructive">Trashed</Badge> : <Badge variant="success">Active</Badge> },
];

export function ContentPages() {
  const { data: pages, isLoading } = usePages();
  const { data: total } = usePageCount();
  useRealtimeInvalidate(["admin", "content-pages"], "pages", "*");

  if (isLoading) return <div className="p-6"><PageHeader title="Pages" description="All platform documents" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Pages" description={`${total ?? 0} total documents across all workspaces`} />
      {pages && pages.length > 0 ? (
        <DataTable columns={columns} data={pages} searchable searchPlaceholder="Search by title..." />
      ) : (
        <EmptyState title="No pages found" description="Pages will appear here once users create documents." />
      )}
    </div>
  );
}
