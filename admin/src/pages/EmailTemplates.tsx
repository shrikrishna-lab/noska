import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate, useDeleteEmailTemplate,
  useEmailVersions, useCreateEmailVersion, useRealtimeInvalidate,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { Link } from "react-router-dom";
import { LayoutTemplate, Plus, Copy, Eye, RotateCcw, Archive, Trash2, Search, FileText, CheckCircle2, Edit } from "lucide-react";
import toast from "react-hot-toast";
import type { TemplateCategory, TemplateStatus } from "@/lib/types";

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "waitlist_confirmation", label: "Waitlist Confirmation" },
  { value: "waitlist_approved", label: "Waitlist Approved" },
  { value: "invitation", label: "Invitation" },
  { value: "welcome", label: "Welcome" },
  { value: "verify_email", label: "Verify Email" },
  { value: "password_reset", label: "Password Reset" },
  { value: "workspace_invite", label: "Workspace Invite" },
  { value: "security_alert", label: "Security Alert" },
  { value: "newsletter", label: "Newsletter" },
  { value: "product_update", label: "Product Update" },
  { value: "changelog", label: "Changelog" },
  { value: "beta_launch", label: "Beta Launch" },
  { value: "maintenance", label: "Maintenance" },
  { value: "survey", label: "Survey" },
  { value: "referral_rewards", label: "Referral Rewards" },
  { value: "custom", label: "Custom" },
];

const STATUS_COLORS: Record<TemplateStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  archived: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

function CreateTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const create = useCreateEmailTemplate();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("custom");

  const handleCreate = async () => {
    if (!name) { toast.error("Template name is required"); return; }
    if (!user) return;
    await create.mutateAsync({
      name, subject: subject || "{{subject}}", category,
      html_content: "", plain_text: "", blocks: JSON.stringify([]),
      variables: "{}", status: "draft", version: 1, created_by: user.id,
    });
    toast.success("Template created");
    onOpenChange(false);
    setName(""); setSubject(""); setCategory("custom");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Welcome Email" />
          </div>
          <div className="space-y-2">
            <Label>Default Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Welcome to Noska!" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={create.isPending} className="w-full">
            {create.isPending ? "Creating..." : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ html, subject }: { html?: string; subject?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader><DialogTitle>Preview: {subject || "Email"}</DialogTitle></DialogHeader>
        {html ? (
          <iframe className="w-full h-[70vh] rounded border" srcDoc={html} title="Preview" />
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">No content</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EmailTemplates() {
  const { user } = useAuth();
  const { data: templates, isLoading } = useEmailTemplates();
  const create = useCreateEmailTemplate();
  const update = useUpdateEmailTemplate();
  const del = useDeleteEmailTemplate();
  const createVersion = useCreateEmailVersion();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  useRealtimeInvalidate(["admin", "email-templates"], "email_templates");

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !(t.subject || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      return true;
    });
  }, [templates, search, categoryFilter]);

  const handleDuplicate = async (t: NonNullable<typeof templates>[0]) => {
    if (!user) return;
    const newName = `${t.name} (Copy)`;
    await create.mutateAsync({
      name: newName, subject: t.subject, category: t.category,
      html_content: t.html_content, plain_text: t.plain_text,
      blocks: JSON.stringify(t.blocks), variables: JSON.stringify(t.variables),
      status: "draft", version: 1, created_by: user.id,
    });
    toast.success("Template duplicated");
  };

  const handleCreateVersion = async (t: NonNullable<typeof templates>[0]) => {
    await createVersion.mutateAsync({
      template_id: t.id, version_number: t.version + 1,
      html_content: t.html_content, blocks: JSON.stringify(t.blocks),
      changes_description: `Version ${t.version + 1}`,
      created_by: user?.id,
    });
    await update.mutateAsync({ id: t.id, version: t.version + 1 });
    toast.success(`Version ${t.version + 1} created`);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Email Templates" description="Create and manage email templates">
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" /> New Template</Button>
      </PageHeader>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p>No templates found</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="relative group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-sm truncate">{t.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{CATEGORIES.find(c => c.value === t.category)?.label || t.category}</Badge>
                  </div>
                  <Badge className={`text-[10px] ${STATUS_COLORS[t.status]}`}>{t.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-xs text-muted-foreground truncate mb-1">{t.subject || "No subject"}</p>
                <p className="text-[10px] text-muted-foreground">v{t.version} · {new Date(t.updated_at).toLocaleDateString()}</p>
              </CardContent>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                <Link to={`/email-templates/${t.id}/edit`}>
                  <Button variant="ghost" size="sm"><Edit className="h-3.5 w-3.5" /></Button>
                </Link>
                <PreviewDialog html={t.html_content} subject={t.subject} />
                <Button variant="ghost" size="sm" onClick={() => handleDuplicate(t)}><Copy className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleCreateVersion(t)}><RotateCcw className="h-3.5 w-3.5" /></Button>
                {t.status === "draft" && (
                  <Button variant="ghost" size="sm" onClick={() => update.mutate({ id: t.id, status: "published" })}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {t.status !== "archived" && (
                  <Button variant="ghost" size="sm" onClick={() => update.mutate({ id: t.id, status: "archived" })}>
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this template?")) del.mutate(t.id); }}>
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateTemplateDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
