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
import { useLegalPages, useCreateLegalPage, useUpdateLegalPage, useDeleteLegalPage, useRealtimeInvalidate } from "@/lib/queries";
import type { LegalPage } from "@/lib/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface LegalFormProps {
  page?: LegalPage;
  onClose: () => void;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function LegalForm({ page, onClose }: LegalFormProps) {
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [published, setPublished] = useState(page?.published ?? true);
  const create = useCreateLegalPage();
  const update = useUpdateLegalPage();
  const [submitting, setSubmitting] = useState(false);

  const generateSlug = () => { if (!slug.trim() && title.trim()) setSlug(slugify(title)); };

  const handleSubmit = async () => {
    if (!title.trim() || !slug.trim()) return;
    setSubmitting(true);
    try {
      const data = { title, slug, content: content || undefined, published };
      if (page) {
        await update.mutateAsync({ id: page.id, ...data });
        toast.success("Legal page updated");
      } else {
        await create.mutateAsync(data);
        toast.success("Legal page created");
      }
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    setSubmitting(false);
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{page ? "Edit" : "New"} Legal Page</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={generateSlug} placeholder="Privacy Policy" /></div>
          <div className="space-y-2"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="privacy" /></div>
          <div className="space-y-2"><Label>Content (Markdown)</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Full legal page content in markdown..." rows={10} /></div>
          <div className="flex items-center gap-3">
            <Switch checked={published} onCheckedChange={setPublished} id="published" />
            <Label htmlFor="published">Published</Label>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!title.trim() || !slug.trim() || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {page ? "Update" : "Create"} Page
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

export function LegalPages() {
  const { data: pages, isLoading } = useLegalPages();
  const deletePage = useDeleteLegalPage();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LegalPage | null>(null);
  useRealtimeInvalidate(["admin", "legal-pages"], "legal_pages");

  const columns: Column<LegalPage>[] = [
    { key: "title", label: "Title", sortable: true, render: (row) => <span className="font-medium">{row.title}</span> },
    { key: "slug", label: "Slug", render: (row) => <code className="text-xs text-muted-foreground">/{row.slug}</code> },
    {
      key: "published", label: "Status", sortable: true,
      render: (row) => <Badge variant={row.published ? "success" : "secondary"}>{row.published ? "Published" : "Draft"}</Badge>,
    },
    { key: "updated_at", label: "Updated", sortable: true, render: (row) => <span className="text-muted-foreground text-xs">{new Date(row.updated_at).toLocaleDateString()}</span>, hideOnMobile: true },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <a href={`/${row.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-accent">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(row); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (!confirm(`Delete "${row.title}"?`)) return;
            try { await deletePage.mutateAsync(row.id); toast.success("Deleted"); } catch { toast.error("Failed to delete"); }
          }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Legal Pages" description="Manage privacy, terms, and other legal pages" /><LoadingState count={3} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Legal Pages" description="Manage privacy, terms, and other legal pages" actions={<Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="mr-1 h-3.5 w-3.5" /> New Page</Button>} />
      {pages && pages.length > 0 ? (
        <DataTable columns={columns} data={pages} searchable={false} />
      ) : (
        <EmptyState title="No legal pages" description="Create legal pages like Privacy Policy and Terms of Service." />
      )}
      {showForm && <LegalForm page={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
