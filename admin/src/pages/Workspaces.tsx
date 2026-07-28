import { useState, useMemo } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useWorkspaces, useUsers, usePages, useRealtimeInvalidate, useUpdateWorkspace, useDeleteWorkspace, type DbWorkspace } from "@/lib/queries";
import type { AdminUserRow } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { Eye, Edit3, Trash2, Loader2, X, Check, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

interface WorkspaceRow extends DbWorkspace {
  owner_name: string;
  documents: number;
}

export function Workspaces() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { data: users } = useUsers();
  const { data: pages } = usePages();
  const updateMutation = useUpdateWorkspace();
  const deleteMutation = useDeleteWorkspace();
  const { confirm } = useConfirmDialog();
  useRealtimeInvalidate(["admin", "workspaces"], "workspaces");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const rows = useMemo(() => {
    if (!workspaces) return [];
    const userMap = new Map((users ?? []).map((u) => [u.id, u.user_name]));
    return workspaces.map((w) => ({
      ...w,
      owner_name: w.owner_id ? (userMap.get(w.owner_id) ?? "Unknown") : "—",
      documents: pages?.filter((p) => p.user_id === w.owner_id).length ?? 0,
    }));
  }, [workspaces, users, pages]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return rows.find((r) => r.id === selectedId) ?? null;
  }, [selectedId, rows]);

  const handleStartEdit = (row: WorkspaceRow) => {
    setEditingId(row.id);
    setEditName(row.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateMutation.mutateAsync({ id: editingId, data: { name: editName.trim() } });
      toast.success("Workspace renamed");
      setEditingId(null);
    } catch {
      toast.error("Failed to rename workspace");
    }
  };

  const handleDelete = async (row: WorkspaceRow) => {
    if (!await confirm({ title: "Delete Workspace", description: `Delete "${row.name}"? This cannot be undone.`, variant: "delete", confirmText: "Delete" })) return;
    try {
      await deleteMutation.mutateAsync(row.id);
      toast.success("Workspace deleted");
      if (selectedId === row.id) setSelectedId(null);
    } catch {
      toast.error("Failed to delete workspace");
    }
  };

  const columns: Column<WorkspaceRow>[] = [
    {
      key: "name", label: "Workspace", sortable: true, className: "w-[200px]",
      render: (row) => editingId === row.id ? (
        <div className="flex items-center gap-2">
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 w-48 text-sm" autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingId(null); }} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}><Check className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
        </div>
      ) : <span className="font-medium">{row.name}</span>,
    },
    { key: "owner_name", label: "Owner", sortable: true, className: "w-[150px]", render: (row) => <span className="text-muted-foreground">{row.owner_name}</span> },
    { key: "documents", label: "Pages", sortable: true, className: "text-right w-[80px]" },
    { key: "created_at", label: "Created", sortable: true, className: "w-[110px]", render: (row) => <span className="text-muted-foreground">{formatRelativeTime(row.created_at)}</span>, hideOnMobile: true },
    {
      key: "id", label: "", sortable: false, className: "w-[110px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => { handleStartEdit(row); }}>
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSelectedId(row.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Workspaces" description="Manage all workspaces on the platform" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Workspaces" description={`${rows.length} total workspaces`} />

      {rows.length === 0 ? (
        <EmptyState icon={BookOpen} title="No workspaces found" description="Workspaces will appear here once created by users." />
      ) : (
        <DataTable columns={columns} data={rows} searchPlaceholder="Search workspaces..." />
      )}

      {selected && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedId(null)}>
            <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}><X className="h-4 w-4" /></Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Workspace ID</Label>
                    <p className="text-sm font-mono text-muted-foreground">{selected.id}</p>
                  </div>
                  <div>
                    <Label>Owner</Label>
                    <p className="text-sm font-medium">{selected.owner_name}</p>
                  </div>
                  <div>
                    <Label>Pages</Label>
                    <p className="text-sm font-medium">{selected.documents}</p>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <p className="text-sm text-muted-foreground">{new Date(selected.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Updated</Label>
                    <p className="text-sm text-muted-foreground">{new Date(selected.updated_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedId(null); handleStartEdit(selected); }}>
                    <Edit3 className="h-4 w-4 mr-2" /> Rename
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => { setSelectedId(null); handleDelete(selected); }}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}