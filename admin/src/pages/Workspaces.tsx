import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaces, useUpdateWorkspace, useDeleteWorkspace, usePages, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Pencil, Trash2, Building2, X } from "lucide-react";
import type { DbWorkspace } from "@/lib/queries";

function WorkspaceDialog({ workspace, onClose, onSave }: { workspace?: DbWorkspace | null; onClose: () => void; onSave: (data: Record<string, unknown>) => void }) {
  const [name, setName] = useState(workspace?.name ?? "");
  const [ownerId, setOwnerId] = useState(workspace?.owner_id ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{workspace ? "Edit Workspace" : "Create Workspace"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Workspace Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="e.g. My Workspace" />
          </div>
          <div>
            <label className="text-sm font-medium">Owner ID</label>
            <input value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono" placeholder="Clerk user ID" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { if (name.trim()) onSave({ name: name.trim(), owner_id: ownerId.trim() || null }); }} disabled={!name.trim()}>
              {workspace ? "Save Changes" : "Create Workspace"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Workspaces() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { data: pages } = usePages();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  useRealtimeInvalidate(["admin", "workspaces"], "workspaces");

  const [editWs, setEditWs] = useState<DbWorkspace | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DbWorkspace | null>(null);

  const handleSave = async (data: Record<string, unknown>) => {
    if (editWs) {
      await updateWorkspace.mutateAsync({ id: editWs.id, data });
    }
    setEditWs(null);
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    await deleteWorkspace.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const getPageCount = (wsId: string) => pages?.filter((p) => p.user_id === wsId).length ?? 0;

  const columns: Column<DbWorkspace>[] = [
    {
      key: "name", label: "Workspace", sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {row.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.id.slice(0, 12)}...</p>
          </div>
        </div>
      ),
    },
    { key: "owner_id", label: "Owner", sortable: true, render: (row) => row.owner_id ? <span className="text-xs font-mono text-muted-foreground">{row.owner_id.slice(0, 16)}...</span> : <span className="text-muted-foreground">—</span> },
    {
      key: "id", label: "Pages", sortable: true, className: "text-right",
      render: (row) => <Badge variant="secondary">{getPageCount(row.id)}</Badge>,
    },
    { key: "created_at", label: "Created", sortable: true, render: (row) => row.created_at ? <span className="text-muted-foreground">{formatRelativeTime(row.created_at)}</span> : "—", hideOnMobile: true },
    {
      key: "id", label: "Actions", className: "w-[100px]",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditWs(row)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(row)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Workspaces" description="Manage all workspaces" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Workspaces" description={`${workspaces?.length ?? 0} workspaces on the platform`}>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Create Workspace</Button>
      </PageHeader>

      {workspaces && workspaces.length > 0 ? (
        <DataTable columns={columns} data={workspaces} searchPlaceholder="Search workspaces..." />
      ) : (
        <EmptyState title="No workspaces" description="Create your first workspace to get started." icon={Building2} />
      )}

      {(showCreate || editWs) && <WorkspaceDialog workspace={editWs} onClose={() => { setEditWs(null); setShowCreate(false); }} onSave={handleSave} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <Card className="w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle>Delete Workspace</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? All associated data may be affected.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDelete(deleteConfirm.id)} disabled={deleteWorkspace.isPending}>
                  {deleteWorkspace.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
