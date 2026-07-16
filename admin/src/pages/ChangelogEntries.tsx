import { useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useChangelogEntries, useCreateChangelogEntry, useUpdateChangelogEntry, useDeleteChangelogEntry } from "@/lib/queries";
import type { ChangelogEntry } from "@/lib/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const tagColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  security: "success", editor: "default", databases: "warning", core: "secondary", ai: "secondary", study: "destructive",
};

interface ChangelogFormProps {
  entry?: ChangelogEntry;
  onClose: () => void;
}

function ChangelogForm({ entry, onClose }: ChangelogFormProps) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [tag, setTag] = useState(entry?.tag ?? "Core");
  const [version, setVersion] = useState(entry?.version ?? "");
  const [published, setPublished] = useState(entry?.published ?? false);
  const createEntry = useCreateChangelogEntry();
  const updateEntry = useUpdateChangelogEntry();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        title, description: description || undefined, tag, version: version || undefined,
        published, published_at: published ? (entry?.published_at ?? new Date().toISOString()) : null,
      };
      if (entry) {
        await updateEntry.mutateAsync({ id: entry.id, ...data });
        toast.success("Changelog entry updated");
      } else {
        await createEntry.mutateAsync(data);
        toast.success("Changelog entry created");
      }
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    setSubmitting(false);
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{entry ? "Edit" : "New"} Changelog Entry</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What shipped?" /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Full description of the change" rows={4} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tag</Label>
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Core", "AI", "Editor", "Security", "Databases", "Study", "API", "UI"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Version</Label><Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. v2.1.0" /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={published} onCheckedChange={setPublished} id="published" />
            <Label htmlFor="published">Published</Label>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!title.trim() || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {entry ? "Update" : "Create"} Entry
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

export function ChangelogEntries() {
  const { data: entries, isLoading } = useChangelogEntries();
  const deleteEntry = useDeleteChangelogEntry();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChangelogEntry | null>(null);

  const columns: Column<ChangelogEntry>[] = [
    { key: "title", label: "Title", sortable: true, render: (row) => <span className="font-medium">{row.title}</span> },
    {
      key: "tag", label: "Tag", sortable: true,
      render: (row) => <Badge variant={tagColors[row.tag?.toLowerCase()] ?? "secondary"}>{row.tag}</Badge>,
    },
    { key: "version", label: "Version", render: (row) => row.version ?? "—" },
    {
      key: "published", label: "Status", sortable: true,
      render: (row) => <Badge variant={row.published ? "success" : "secondary"}>{row.published ? "Published" : "Draft"}</Badge>,
    },
    { key: "created_at", label: "Created", sortable: true, render: (row) => <span className="text-muted-foreground text-xs">{new Date(row.created_at).toLocaleDateString()}</span>, hideOnMobile: true },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(row); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (!confirm(`Delete "${row.title}"?`)) return;
            try { await deleteEntry.mutateAsync(row.id); toast.success("Deleted"); } catch { toast.error("Failed to delete"); }
          }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Changelog" description="Manage changelog entries shown on the marketing site" /><LoadingState count={3} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Changelog" description="Manage changelog entries shown on the marketing site" actions={<Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="mr-1 h-3.5 w-3.5" /> New Entry</Button>} />
      {entries && entries.length > 0 ? (
        <DataTable columns={columns} data={entries} searchPlaceholder="Search changelog..." />
      ) : (
        <EmptyState title="No changelog entries" description="Create your first changelog entry to show on the marketing site." />
      )}
      {showForm && <ChangelogForm entry={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
