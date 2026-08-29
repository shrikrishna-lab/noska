import { useState, useMemo } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePages, usePageCount, usePermanentDeletePage, useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/utils";
import { Eye, Trash2, FileText, X } from "lucide-react";

function PagePreview({ page, onClose }: { page: any; onClose: () => void }) {
  const blocks = page.blocks as any[] | null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card z-10">
          <div>
            <CardTitle>{page.title || "Untitled Page"}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Created {page.created_at ? formatRelativeTime(page.created_at) : "—"} · Updated {page.updated_at ? formatRelativeTime(page.updated_at) : "—"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>User: {page.user_id?.slice(0, 20) || "—"}</span>
            <Badge variant={page.trashed ? "destructive" : "success"}>{page.trashed ? "Trashed" : "Active"}</Badge>
          </div>
          {blocks && blocks.length > 0 ? (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
              {blocks.map((block: any, idx: number) => (
                <div key={idx} className="text-sm">
                  <Badge variant="outline" className="mr-2 text-[9px]">{block.type || "block"}</Badge>
                  {block.content && typeof block.content === "string" && (
                    <span className="text-muted-foreground">{block.content.slice(0, 200)}{block.content.length > 200 ? "..." : ""}</span>
                  )}
                  {block.text && typeof block.text === "string" && (
                    <span className="text-muted-foreground">{block.text.slice(0, 200)}{block.text.length > 200 ? "..." : ""}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No block content available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ContentPages() {
  const { data: pages, isLoading } = usePages();
  const { data: total } = usePageCount();
  const deletePage = usePermanentDeletePage();
  useRealtimeInvalidate(["admin", "content-pages"], "pages", "*");

  const [previewPage, setPreviewPage] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const handleDelete = async (id: string) => {
    await deletePage.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const columns: Column<any>[] = [
    {
      key: "title", label: "Title", sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{row.title || "Untitled"}</span>
        </div>
      ),
    },
    { key: "user_id", label: "User ID", sortable: true, className: "hidden md:table-cell", render: (row) => <span className="text-xs font-mono text-muted-foreground">{row.user_id?.slice(0, 16) || "—"}</span> },
    { key: "created_at", label: "Created", sortable: true, render: (row) => row.created_at ? formatRelativeTime(row.created_at) : "—" },
    { key: "updated_at", label: "Updated", sortable: true, render: (row) => row.updated_at ? formatRelativeTime(row.updated_at) : "—", hideOnMobile: true },
    {
      key: "trashed", label: "Status", sortable: true,
      render: (row) => row.trashed ? <Badge variant="destructive">Trashed</Badge> : <Badge variant="success">Active</Badge>,
    },
    {
      key: "id", label: "Actions", className: "w-[80px]",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewPage(row)}><Eye className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(row)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Pages" description="All platform documents" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Pages" description={`${total ?? 0} total documents across all workspaces`} />

      {pages && pages.length > 0 ? (
        <DataTable columns={columns} data={pages} searchable searchPlaceholder="Search by title..." />
      ) : (
        <EmptyState title="No pages found" description="Pages will appear here once users create documents." icon={FileText} />
      )}

      {previewPage && <PagePreview page={previewPage} onClose={() => setPreviewPage(null)} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <Card className="w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle>Permanently Delete Page</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Permanently delete <strong>{deleteConfirm.title || "Untitled"}</strong>? This cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDelete(deleteConfirm.id)} disabled={deletePage.isPending}>
                  {deletePage.isPending ? "Deleting..." : "Delete Permanently"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
