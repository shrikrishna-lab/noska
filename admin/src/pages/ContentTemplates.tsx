import { useState, useRef } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate, useDeleteEmailTemplate, useRealtimeInvalidate } from "@/lib/queries";
import type { EmailTemplate, TemplateLocale } from "@/lib/types";
import { SUPPORTED_LOCALES } from "@/lib/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Pencil, Trash2, X, Loader2, LayoutTemplate, Download, Upload, Copy, Check, Globe } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { formatRelativeTime } from "@/lib/utils";

const statusColors: Record<string, "default" | "secondary" | "success" | "warning"> = {
  draft: "secondary", published: "success", archived: "default",
};

const columns: Column<EmailTemplate>[] = [
  { key: "name", label: "Name", sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
  { key: "subject", label: "Subject", sortable: true, className: "text-muted-foreground max-w-[200px] truncate hidden md:table-cell" },
  { key: "category", label: "Category", sortable: true, className: "w-[100px]", render: (row) => <Badge variant="secondary">{row.category}</Badge> },
  { key: "status", label: "Status", sortable: true, className: "w-[90px]", render: (row) => <Badge variant={statusColors[row.status] ?? "secondary"}>{row.status}</Badge> },
  { key: "version", label: "Version", sortable: true, className: "text-right w-[80px]" },
  { key: "created_at", label: "Created", sortable: true, className: "w-[100px]", render: (row) => formatRelativeTime(row.created_at) },
];

function TemplateForm({ template, onClose }: { template?: EmailTemplate; onClose: () => void }) {
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [category, setCategory] = useState(template?.category ?? "custom");
  const [locale, setLocale] = useState<TemplateLocale>(template?.locale ?? "en");
  const [htmlContent, setHtmlContent] = useState(template?.html_content ?? "");
  const [plainText, setPlainText] = useState(template?.plain_text ?? "");
  const [status, setStatus] = useState(template?.status ?? "draft");
  const create = useCreateEmailTemplate();
  const update = useUpdateEmailTemplate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !subject.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        name, subject, description: description || undefined, category, locale,
        html_content: htmlContent || undefined, plain_text: plainText || undefined, status,
        version: template ? template.version + 1 : 1,
      };
      if (template) {
        await update.mutateAsync({ id: template.id, ...data });
        toast.success("Template updated");
      } else {
        await create.mutateAsync(data);
        toast.success("Template created");
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
            <h2 className="text-lg font-semibold">{template ? "Edit" : "New"} Template</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Email" /></div>
              <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Welcome to Noska!" /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this template" rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["custom", "welcome", "marketing", "transactional", "notification", "newsletter"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["draft", "published", "archived"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={locale} onValueChange={(v) => setLocale(v as TemplateLocale)}>
                  <SelectTrigger><Globe className="mr-1 h-3 w-3" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LOCALES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>HTML Content</Label><Textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} placeholder="<html>..." rows={6} className="font-mono text-xs" /></div>
            <div className="space-y-2"><Label>Plain Text</Label><Textarea value={plainText} onChange={(e) => setPlainText(e.target.value)} placeholder="Plain text version..." rows={3} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!name.trim() || !subject.trim() || submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {template ? "Update" : "Create"} Template
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function ContentTemplates() {
  const { data: templates, isLoading } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();
  const { confirm } = useConfirmDialog();
  useRealtimeInvalidate(["admin", "templates"], "email_templates", "*");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [importing, setImporting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = async (template: EmailTemplate) => {
    const confirmed = await confirm({
      title: "Delete Template",
      description: `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteTemplate.mutateAsync(template.id);
      toast.success("Template deleted");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete"); }
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      await createTemplate.mutateAsync({
        name: `${template.name} (Copy)`, subject: template.subject,
        description: template.description, category: template.category,
        locale: template.locale || "en",
        html_content: template.html_content, plain_text: template.plain_text,
        status: "draft", version: 1,
      });
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Template duplicated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to duplicate"); }
  };

  const handleExport = () => {
    if (!templates || templates.length === 0) return;
    const exportData = templates.map(({ id, created_at, updated_at, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `templates-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${templates.length} templates exported`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "json") {
        const items = JSON.parse(text);
        const arr = Array.isArray(items) ? items : [items];
        let count = 0;
        for (const item of arr) {
          if (!item.name || !item.subject) continue;
          await createTemplate.mutateAsync({
            name: item.name, subject: item.subject,
            description: item.description || undefined, category: item.category || "custom",
            locale: item.locale || "en",
            html_content: item.html_content || undefined, plain_text: item.plain_text || undefined,
            status: item.status || "draft", version: 1,
          });
          count++;
        }
        toast.success(`${count} templates imported`);
      } else if (ext === "html" || ext === "htm") {
        const name = file.name.replace(/\.(html|htm)$/i, "");
        const subjectMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
        const subject = subjectMatch ? subjectMatch[1].trim() : name;
        await createTemplate.mutateAsync({
          name, subject,
          category: "custom",
          html_content: text,
          status: "draft", version: 1,
        });
        toast.success(`Imported "${name}" from HTML file`);
      } else {
        throw new Error(`Unsupported file format: .${ext}. Use .json or .html files.`);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid file format");
    }
    setImporting(false);
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Templates" description="Email templates for campaigns" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Templates"
        description="Email templates for campaigns"
        actions={
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".json,.html,.htm" className="hidden" onChange={handleImport} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={!templates?.length}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="mr-2 h-4 w-4" />Create Template
            </Button>
          </div>
        }
      />

      {templates && templates.length > 0 ? (
        <DataTable
          columns={[
            ...columns,
            { key: "actions", label: "", sortable: false, render: (row) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDuplicate(row); }} title="Duplicate">
                  {copiedId === row.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditing(row); setShowForm(true); }} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(row); }} title="Delete">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )},
          ]}
          data={templates}
          searchable
          searchPlaceholder="Search templates..."
        />
      ) : (
        <EmptyState title="No templates yet" description="Email templates will appear here once created." icon={LayoutTemplate} />
      )}

      {showForm && <TemplateForm template={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
