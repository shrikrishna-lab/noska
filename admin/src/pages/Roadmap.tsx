import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useRoadmap, useRoadmapVoteCounts, useCreateRoadmapItem, useUpdateRoadmapItem, useDeleteRoadmapItem, useRealtimeInvalidate } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Pencil, Trash2, LayoutGrid, X, ThumbsUp } from "lucide-react";
import type { RoadmapItem } from "@/lib/types";

const statusColors: Record<string, "secondary" | "warning" | "default" | "success"> = {
  backlog: "secondary", in_progress: "warning", review: "default", shipped: "success",
};
const priorityColors: Record<string, "secondary" | "default" | "warning" | "destructive"> = {
  low: "secondary", medium: "default", high: "warning", critical: "destructive",
};

function RoadmapDialog({ item, onClose, onSave }: { item?: RoadmapItem | null; onClose: () => void; onSave: (data: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [status, setStatus] = useState<string>(item?.status ?? "backlog");
  const [priority, setPriority] = useState<string>(item?.priority ?? "medium");
  const [owner, setOwner] = useState(item?.owner ?? "");
  const [eta, setEta] = useState(item?.eta ?? "");
  const [progress, setProgress] = useState(item?.progress ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{item ? "Edit Roadmap Item" : "Add Roadmap Item"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Feature name" />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" rows={3} placeholder="What is this feature?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="backlog">Backlog</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="shipped">Shipped</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Owner</label>
              <input value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Team or person" />
            </div>
            <div>
              <label className="text-sm font-medium">ETA</label>
              <input value={eta} onChange={(e) => setEta(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="e.g. Q3 2026" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Progress ({progress}%)</label>
            <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="mt-1 w-full" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { if (title.trim()) onSave({ title: title.trim(), description: description.trim() || null, status, priority, owner: owner.trim() || null, eta: eta.trim() || null, progress }); }} disabled={!title.trim()}>
              {item ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Roadmap() {
  const { data: items, isLoading } = useRoadmap();
  const { data: voteCounts } = useRoadmapVoteCounts();
  const createItem = useCreateRoadmapItem();
  const updateItem = useUpdateRoadmapItem();
  const deleteItem = useDeleteRoadmapItem();
  useRealtimeInvalidate(["admin", "roadmap"], "roadmap_items");

  const [editItem, setEditItem] = useState<RoadmapItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<RoadmapItem | null>(null);

  const handleSave = async (data: Record<string, unknown>) => {
    if (editItem) {
      await updateItem.mutateAsync({ id: editItem.id, ...data });
    } else {
      await createItem.mutateAsync(data);
    }
    setEditItem(null);
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    await deleteItem.mutateAsync(id);
    setDeleteConfirm(null);
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Roadmap" description="Product roadmap" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Roadmap" description="Product roadmap and feature tracking">
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
      </PageHeader>

      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item: RoadmapItem) => (
            <Card key={item.id} className="hover:bg-muted/30 transition">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant={statusColors[item.status] ?? "secondary"}>{item.status.replace("_", " ")}</Badge>
                      <Badge variant={priorityColors[item.priority] ?? "default"}>{item.priority}</Badge>
                      {(voteCounts?.[item.id] ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><ThumbsUp className="h-3 w-3" />{voteCounts?.[item.id]}</span>
                      )}
                    </div>
                    {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {item.owner && <span>Owner: {item.owner}</span>}
                      {item.eta && <span>ETA: {item.eta}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-sm font-medium">{item.progress}%</span>
                    <Progress value={item.progress} className={cn("h-2 w-24", item.progress === 100 && "bg-success/20 [&>div]:bg-success")} />
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No roadmap items" description="Add your first roadmap item to get started." icon={LayoutGrid} />
      )}

      {(showCreate || editItem) && <RoadmapDialog item={editItem} onClose={() => { setEditItem(null); setShowCreate(false); }} onSave={handleSave} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <Card className="w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle>Delete Roadmap Item</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Delete <strong>{deleteConfirm.title}</strong>?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDelete(deleteConfirm.id)} disabled={deleteItem.isPending}>
                  {deleteItem.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
