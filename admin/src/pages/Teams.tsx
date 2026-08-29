import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTeams, useUpdateTeam, useDeleteTeam, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Pencil, Trash2, Users, X } from "lucide-react";
import type { DbTeam } from "@/lib/queries";

function TeamDialog({ team, onClose, onSave }: { team?: DbTeam | null; onClose: () => void; onSave: (data: Record<string, unknown>) => void }) {
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [leadName, setLeadName] = useState(team?.lead_name ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{team ? "Edit Team" : "Create Team"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Team Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="e.g. Engineering" />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" rows={2} placeholder="What does this team do?" />
          </div>
          <div>
            <label className="text-sm font-medium">Team Lead</label>
            <input value={leadName} onChange={(e) => setLeadName(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Lead name" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { if (name.trim()) onSave({ name: name.trim(), description: description.trim() || null, lead_name: leadName.trim() || null }); }} disabled={!name.trim()}>
              {team ? "Save Changes" : "Create Team"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Teams() {
  const { data: teams, isLoading } = useTeams();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  useRealtimeInvalidate(["admin", "teams"], "teams");

  const [editTeam, setEditTeam] = useState<DbTeam | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DbTeam | null>(null);

  const handleSave = async (data: Record<string, unknown>) => {
    if (editTeam) {
      await updateTeam.mutateAsync({ id: editTeam.id, data });
    }
    setEditTeam(null);
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    await deleteTeam.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const columns: Column<DbTeam>[] = [
    {
      key: "name", label: "Team", sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {row.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            {row.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.description}</p>}
          </div>
        </div>
      ),
    },
    { key: "lead_name", label: "Lead", sortable: true, render: (row) => row.lead_name || <span className="text-muted-foreground">—</span> },
    { key: "member_count", label: "Members", sortable: true, className: "text-right", render: (row) => <Badge variant="secondary">{row.member_count ?? 0}</Badge> },
    { key: "workspace_count", label: "Workspaces", sortable: true, className: "text-right", hideOnMobile: true, render: (row) => <span className="text-muted-foreground">{row.workspace_count ?? 0}</span> },
    { key: "created_at", label: "Created", sortable: true, render: (row) => row.created_at ? <span className="text-muted-foreground">{formatRelativeTime(row.created_at)}</span> : "—", hideOnMobile: true },
    {
      key: "id", label: "Actions", className: "w-[100px]",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTeam(row)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(row)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Teams" description="Manage teams across workspaces" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Teams" description="Manage teams across workspaces">
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Create Team</Button>
      </PageHeader>

      {teams && teams.length > 0 ? (
        <DataTable columns={columns} data={teams} searchPlaceholder="Search teams..." />
      ) : (
        <EmptyState title="No teams yet" description="Create your first team to get started." icon={Users} />
      )}

      {(showCreate || editTeam) && <TeamDialog team={editTeam} onClose={() => { setEditTeam(null); setShowCreate(false); }} onSave={handleSave} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <Card className="w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle>Delete Team</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDelete(deleteConfirm.id)} disabled={deleteTeam.isPending}>
                  {deleteTeam.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
