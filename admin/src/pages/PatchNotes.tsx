import { useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  usePatchNotes,
  useCreatePatchNote,
  useUpdatePatchNote,
  useDeletePatchNote,
  useRealtimeInvalidate,
} from "@/lib/queries";
import type { PatchNote } from "@/lib/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const linesToArray = (text: string): string[] =>
  text.split("\n").map((l) => l.trim()).filter(Boolean);

const arrayToLines = (items: string[] | null | undefined): string =>
  Array.isArray(items) ? items.join("\n") : "";

interface ListFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}

function ListField({ label, placeholder, value, onChange }: ListFieldProps) {
  const count = linesToArray(value).length;
  return (
    <div className="space-y-2">
      <Label>
        {label} <span className="text-muted-foreground">({count} item{count === 1 ? "" : "s"}, one per line)</span>
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="font-mono text-xs"
      />
    </div>
  );
}

interface PatchFormProps {
  note?: PatchNote;
  onClose: () => void;
}

function PatchForm({ note, onClose }: PatchFormProps) {
  const [version, setVersion] = useState(note?.version ?? "");
  const [title, setTitle] = useState(note?.title ?? "");
  const [summary, setSummary] = useState(note?.summary ?? "");
  const [features, setFeatures] = useState(arrayToLines(note?.features));
  const [improvements, setImprovements] = useState(arrayToLines(note?.improvements));
  const [fixes, setFixes] = useState(arrayToLines(note?.fixes));
  const [knownIssues, setKnownIssues] = useState(arrayToLines(note?.known_issues));
  const [published, setPublished] = useState(note?.published ?? false);
  const createNote = useCreatePatchNote();
  const updateNote = useUpdatePatchNote();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        version: version || undefined,
        title,
        summary: summary || undefined,
        features: linesToArray(features),
        improvements: linesToArray(improvements),
        fixes: linesToArray(fixes),
        known_issues: linesToArray(knownIssues),
        published,
        published_at: published ? (note?.published_at ?? new Date().toISOString()) : null,
      };
      if (note) {
        await updateNote.mutateAsync({ id: note.id, ...data });
        toast.success("Patch note updated");
      } else {
        await createNote.mutateAsync(data);
        toast.success("Patch note created");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
    setSubmitting(false);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div
          className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{note ? "Edit" : "New"} Patch Note</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_140px] gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Voice Input & Voice Typing Overhaul" />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.3" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One or two sentences describing the release" rows={2} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ListField label="New Features" placeholder={"Dictate directly into the AI composer\nNew live waveform"} value={features} onChange={setFeatures} />
              <ListField label="Improvements" placeholder={"Cleaner transcription\nFaster recovery"} value={improvements} onChange={setImprovements} />
              <ListField label="Bug Fixes" placeholder={"Fixed duplicated text while voice typing"} value={fixes} onChange={setFixes} />
              <ListField label="Known Issues" placeholder={"Requires a Chromium-based browser"} value={knownIssues} onChange={setKnownIssues} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="patch-published">Published</Label>
                <p className="text-xs text-muted-foreground">Only published notes appear on the public Updates page.</p>
              </div>
              <Switch checked={published} onCheckedChange={setPublished} id="patch-published" />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={!title.trim() || submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {note ? "Update" : "Publish"} Patch Note
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function PatchNotes() {
  const { data: notes, isLoading } = usePatchNotes();
  const deleteNote = useDeletePatchNote();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PatchNote | null>(null);
  useRealtimeInvalidate(["admin", "patch-notes"], "patch_notes");

  const columns: Column<PatchNote>[] = [
    { key: "title", label: "Title", sortable: true, render: (row) => <span className="font-medium">{row.title}</span> },
    { key: "version", label: "Version", render: (row) => (row.version ? `v${row.version.replace(/^v/, "")}` : "—") },
    {
      key: "sections", label: "Items", render: (row) => {
        const total = (row.features?.length ?? 0) + (row.improvements?.length ?? 0) + (row.fixes?.length ?? 0) + (row.known_issues?.length ?? 0);
        return <span className="text-muted-foreground">{total}</span>;
      },
    },
    {
      key: "published", label: "Status", sortable: true,
      render: (row) => <Badge variant={row.published ? "success" : "secondary"}>{row.published ? "Published" : "Draft"}</Badge>,
    },
    {
      key: "published_at", label: "Published", sortable: true, hideOnMobile: true,
      render: (row) => <span className="text-xs text-muted-foreground">{row.published_at ? new Date(row.published_at).toLocaleDateString() : "—"}</span>,
    },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(row); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (!confirm(`Delete patch note "${row.title}"?`)) return;
            try { await deleteNote.mutateAsync(row.id); toast.success("Deleted"); } catch { toast.error("Failed to delete"); }
          }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (isLoading)
    return <div className="p-6"><PageHeader title="Updates & Patches" description="Detailed patch notes shown on the marketing site" /><LoadingState count={3} /></div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Updates & Patches"
        description="Detailed patch notes shown at /patches — users can read but never edit them"
        actions={<Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="mr-1 h-3.5 w-3.5" /> New Patch Note</Button>}
      />
      {notes && notes.length > 0 ? (
        <DataTable columns={columns} data={notes} searchPlaceholder="Search patch notes..." />
      ) : (
        <EmptyState title="No patch notes" description="Create your first patch note to show detailed release updates on the marketing site." />
      )}
      {showForm && <PatchForm note={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
