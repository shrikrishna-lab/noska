import { useState, useMemo } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTeams, useRealtimeInvalidate, useUpdateTeam, useDeleteTeam, type DbTeam } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { Eye, Trash2, Loader2, X, Edit3, Check, Users } from "lucide-react";
import toast from "react-hot-toast";

export function Teams() {
  const { data: teams, isLoading } = useTeams();
  const updateMutation = useUpdateTeam();
  const deleteMutation = useDeleteTeam();
  const { confirm } = useConfirmDialog();
  useRealtimeInvalidate(["admin", "teams"], "teams");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const selected = useMemo(() => {
    if (!selectedId || !teams) return null;
    return teams.find((t) => t.id === selectedId) ?? null;
  }, [selectedId, teams]);

  const handleStartEdit = (team: DbTeam, field: string) => {
    setEditingField({ id: team.id, field });
    setEditValue(String(team[field as keyof DbTeam] ?? ""));
  };

  const handleSaveEdit = async () => {
    if (!editingField || !editValue.trim()) return;
    try {
      await updateMutation.mutateAsync({ id: editingField.id, data: { [editingField.field]: editValue.trim() } });
      toast.success("Team updated");
      setEditingField(null);
    } catch {
      toast.error("Failed to update team");
    }
  };

  const handleDelete = async (team: DbTeam) => {
    if (!await confirm({ title: "Delete Team", description: `Delete "${team.name}"? This cannot be undone.`, variant: "delete", confirmText: "Delete" })) return;
    try {
      await deleteMutation.mutateAsync(team.id);
      toast.success("Team deleted");
      if (selectedId === team.id) setSelectedId(null);
    } catch {
      toast.error("Failed to delete team");
    }
  };

  const inlineEdit = (row: DbTeam, field: string, value: string) => {
    const isEditing = editingField?.id === row.id && editingField?.field === field;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-8 w-40 text-sm" autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingField(null); }} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit} disabled={updateMutation.isPending}><Loader2 className={`h-3.5 w-3.5 ${updateMutation.isPending ? "animate-spin" : ""}`} /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingField(null)}><X className="h-3.5 w-3.5" /></Button>
        </div>
      );
    }
    return (
      <span className="font-medium flex items-center gap-1 group cursor-pointer" onDoubleClick={() => handleStartEdit(row, field)}>
        {value || <span className="text-muted-foreground italic">—</span>}
        <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-50" />
      </span>
    );
  };

  const columns: Column<DbTeam>[] = [
    {
      key: "name", label: "Team", sortable: true, className: "w-[180px]",
      render: (row) => inlineEdit(row, "name", row.name),
    },
    {
      key: "lead_name", label: "Lead", sortable: true, className: "w-[150px]",
      render: (row) => inlineEdit(row, "lead_name", row.lead_name ?? ""),
    },
    { key: "member_count", label: "Members", sortable: true, className: "text-right w-[90px]" },
    { key: "workspace_count", label: "Workspaces", sortable: true, className: "text-right w-[110px]", hideOnMobile: true },
    { key: "created_at", label: "Created", sortable: true, className: "w-[110px]", render: (row) => row.created_at ? <span className="text-muted-foreground">{formatRelativeTime(row.created_at)}</span> : "—", hideOnMobile: true },
    {
      key: "id", label: "", sortable: false, className: "w-[80px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
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

  if (isLoading) return <div className="p-6"><PageHeader title="Teams" description="Manage teams across workspaces" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Teams" description={`${teams?.length ?? 0} teams across the platform`} />

      {teams && teams.length > 0 ? (
        <DataTable columns={columns} data={teams} searchPlaceholder="Search teams..." />
      ) : (
        <EmptyState icon={Users} title="No teams yet" description="Teams will appear here once created by administrators." />
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
                  <div className="col-span-2">
                    <Label>Name</Label>
                    <p className="text-sm font-medium">{selected.name}</p>
                  </div>
                  <div className="col-span-2">
                    <Label>Description</Label>
                    {selected.description ? (
                      <p className="text-sm text-muted-foreground">{selected.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No description</p>
                    )}
                  </div>
                  <div>
                    <Label>Lead</Label>
                    <p className="text-sm font-medium">{selected.lead_name || "—"}</p>
                  </div>
                  <div>
                    <Label>Members</Label>
                    <p className="text-sm font-medium">{selected.member_count}</p>
                  </div>
                  <div>
                    <Label>Workspaces</Label>
                    <p className="text-sm font-medium">{selected.workspace_count}</p>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <p className="text-sm text-muted-foreground">{selected.created_at ? new Date(selected.created_at).toLocaleString() : "—"}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quick Edit</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedId(null); handleStartEdit(selected, "name"); }}>
                      <Edit3 className="h-4 w-4 mr-2" /> Edit Name
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedId(null); handleStartEdit(selected, "description"); }}>
                      <Edit3 className="h-4 w-4 mr-2" /> Edit Description
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedId(null); handleStartEdit(selected, "lead_name"); }}>
                      <Edit3 className="h-4 w-4 mr-2" /> Edit Lead
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => { setSelectedId(null); handleDelete(selected); }}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}