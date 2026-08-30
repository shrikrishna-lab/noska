import { useState, useMemo, useRef } from "react";
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
import {
  LayoutTemplate, Plus, Copy, Eye, RotateCcw, Archive, Trash2, Search, FileText,
  CheckCircle2, Edit, Upload, Loader2, Globe, Languages, Download,
} from "lucide-react";
import toast from "react-hot-toast";
import type { TemplateCategory, TemplateStatus, TemplateLocale, EmailBlock } from "@/lib/types";
import { SUPPORTED_LOCALES } from "@/lib/types";
import { getBlockDefinition } from "@/lib/emailBlocks";

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

function getLocaleLabel(locale: string): string {
  return SUPPORTED_LOCALES.find((l) => l.value === locale)?.label ?? locale;
}

function buildStarterBlocks(templateType: string): EmailBlock[] {
  const makeBlock = (type: string, overrides: Record<string, unknown> = {}): EmailBlock => {
    const def = getBlockDefinition(type as any);
    return {
      id: crypto.randomUUID?.() ?? Math.random().toString(36),
      type: type as any,
      content: { ...(def?.defaultContent ?? {}), ...overrides },
      sort_order: 0,
    };
  };
  switch (templateType) {
    case "welcome":
      return [
        makeBlock("logo", { alignment: "center" }),
        makeBlock("hero", { image_url: "https://placehold.co/600x300/6366f1/ffffff?text=Welcome" }),
        makeBlock("heading", { text: "Welcome aboard!", level: "h1", align: "center" }),
        makeBlock("paragraph", { text: "We're thrilled to have you with us. Here's what you can expect next." }),
        makeBlock("button", { text: "Get Started", url: "https://noska.me" }),
        makeBlock("divider", {}),
        makeBlock("signature", {}),
        makeBlock("footer", {}),
      ];
    case "waitlist_confirmation":
      return [
        makeBlock("logo", { alignment: "center" }),
        makeBlock("heading", { text: "You're on the list!", level: "h1", align: "center" }),
        makeBlock("paragraph", { text: "Thanks for joining the waitlist. We'll keep you posted on our progress and let you know as soon as we launch." }),
        makeBlock("referral_card", {}),
        makeBlock("divider", {}),
        makeBlock("social_links", {}),
        makeBlock("footer", {}),
      ];
    case "waitlist_approved":
      return [
        makeBlock("logo", { alignment: "center" }),
        makeBlock("heading", { text: "You're in! 🎉", level: "h1", align: "center" }),
        makeBlock("paragraph", { text: "Great news — you've been approved for early access! Click the button below to create your account and get started." }),
        makeBlock("button", { text: "Create Account", url: "{{invite.link}}" }),
        makeBlock("divider", {}),
        makeBlock("signature", {}),
        makeBlock("footer", {}),
      ];
    case "password_reset":
      return [
        makeBlock("logo", { alignment: "center" }),
        makeBlock("heading", { text: "Reset your password", align: "center" }),
        makeBlock("paragraph", { text: "We received a request to reset your password. Click the button below to set a new one." }),
        makeBlock("button", { text: "Reset Password", url: "{{reset.link}}" }),
        makeBlock("divider", {}),
        makeBlock("paragraph", { text: "If you didn't request this, you can safely ignore this email.", font_size: 13 }),
        makeBlock("footer", {}),
      ];
    case "newsletter":
      return [
        makeBlock("logo", { alignment: "center" }),
        makeBlock("heading", { text: "Monthly Update", align: "center" }),
        makeBlock("paragraph", { text: "Here's what's new this month at Noska." }),
        makeBlock("feature_grid", { columns: "2", items: [
          { icon: "🚀", title: "New Feature", desc: "Check out our latest release" },
          { icon: "🐛", title: "Bug Fixes", desc: "Squashed some pesky bugs" },
          { icon: "⚡", title: "Performance", desc: "Faster than ever" },
          { icon: "💡", title: "Tips & Tricks", desc: "Get the most out of Noska" },
        ] }),
        makeBlock("divider", {}),
        makeBlock("social_links", {}),
        makeBlock("footer", {}),
      ];
    default:
      return [
        makeBlock("logo", { alignment: "center" }),
        makeBlock("heading", { text: "Hello!", align: "center" }),
        makeBlock("paragraph", { text: "Your email content goes here." }),
        makeBlock("button", { text: "Learn More", url: "https://noska.me" }),
        makeBlock("footer", {}),
      ];
  }
}

function CreateTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const create = useCreateEmailTemplate();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("custom");
  const [locale, setLocale] = useState<TemplateLocale>("en");
  const [plainText, setPlainText] = useState("");
  const [starterType, setStarterType] = useState("none");

  const handleCreate = async () => {
    if (!name) { toast.error("Template name is required"); return; }
    if (!user) return;
    const blocks = starterType !== "none" ? buildStarterBlocks(starterType) : [];
    await create.mutateAsync({
      name, subject: subject || "{{subject}}", description: description || undefined,
      category, locale,
      html_content: "", plain_text: plainText || "",
      blocks: JSON.stringify(blocks), variables: "{}",
      translations: JSON.stringify({}),
      status: "draft", version: 1, created_by: user.id,
    });
    toast.success("Template created");
    onOpenChange(false);
    setName(""); setSubject(""); setDescription(""); setCategory("custom");
    setLocale("en"); setPlainText(""); setStarterType("none");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Welcome Email" />
          </div>
          <div className="space-y-2">
            <Label>Default Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Welcome to Noska!" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this template" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as TemplateLocale)}>
                <SelectTrigger><Globe className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LOCALES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Starter Content</Label>
            <Select value={starterType} onValueChange={setStarterType}>
              <SelectTrigger><SelectValue placeholder="Start from scratch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Start from scratch</SelectItem>
                <SelectItem value="welcome">Welcome Email</SelectItem>
                <SelectItem value="waitlist_confirmation">Waitlist Confirmation</SelectItem>
                <SelectItem value="waitlist_approved">Waitlist Approved</SelectItem>
                <SelectItem value="password_reset">Password Reset</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Plain Text (optional)</Label>
            <Textarea value={plainText} onChange={(e) => setPlainText(e.target.value)} placeholder="Plain text fallback for email clients..." rows={2} />
          </div>
          <Button onClick={handleCreate} disabled={create.isPending} className="w-full">
            {create.isPending ? "Creating..." : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PasteHtmlDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const create = useCreateEmailTemplate();
  const [html, setHtml] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("custom");
  const [locale, setLocale] = useState<TemplateLocale>("en");

  const handleCreate = async () => {
    const trimmed = html.trim();
    if (!trimmed) { toast.error("Paste HTML code first"); return; }
    if (!user) return;
    const finalName = name || (trimmed.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "Imported Template");
    const finalSubject = subject || finalName;
    await create.mutateAsync({
      name: finalName, subject: finalSubject, category, locale,
      html_content: trimmed, plain_text: "",
      blocks: "[]", variables: "{}",
      translations: JSON.stringify({}),
      status: "draft", version: 1, created_by: user.id,
    });
    toast.success("Template created from HTML");
    onOpenChange(false);
    setHtml(""); setName(""); setSubject(""); setCategory("custom"); setLocale("en");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Paste HTML</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>HTML Code</Label>
            <Textarea value={html} onChange={(e) => {
              setHtml(e.target.value);
              if (!name) {
                const m = e.target.value.match(/<title[^>]*>([^<]*)<\/title>/i);
                if (m) setName(m[1].trim());
              }
              if (!subject) {
                const m = e.target.value.match(/<title[^>]*>([^<]*)<\/title>/i);
                if (m) setSubject(m[1].trim());
              }
            }} placeholder="Paste your HTML email code here..." rows={14} className="font-mono text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Auto-detected from HTML" />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Auto-detected from &lt;title&gt;" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as TemplateLocale)}>
                <SelectTrigger><Globe className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LOCALES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
  const [localeFilter, setLocaleFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showPasteHtml, setShowPasteHtml] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useRealtimeInvalidate(["admin", "email-templates"], "email_templates");

  const handleImportFiles = async (files: File[]) => {
    if (!user) return;
    setImporting(true);
    let total = 0;
    for (const file of files) {
      try {
        const text = await file.text();
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "json") {
          const items = JSON.parse(text);
          const arr = Array.isArray(items) ? items : [items];
          for (const item of arr) {
            if (!item.name) continue;
            await create.mutateAsync({
              name: item.name, subject: item.subject || "{{subject}}",
              description: item.description || undefined,
              category: item.category || "custom",
              locale: item.locale || "en",
              html_content: item.html_content || "", plain_text: item.plain_text || "",
              blocks: item.blocks ? JSON.stringify(item.blocks) : "[]",
              variables: "{}",
              translations: item.translations ? JSON.stringify(item.translations) : "{}",
              status: item.status || "draft", version: 1, created_by: user.id,
            });
            total++;
          }
        } else if (ext === "html" || ext === "htm") {
          const name = file.name.replace(/\.(html|htm)$/i, "");
          const subjectMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
          const subject = subjectMatch ? subjectMatch[1].trim() : name;
          if (!text.toLowerCase().includes("<html") && !text.toLowerCase().includes("<!doctype")) {
            toast.error(`"${name}" doesn't look like a valid HTML file — missing <html> or DOCTYPE`);
            continue;
          }
          await create.mutateAsync({
            name, subject, category: "custom", locale: "en",
            html_content: text, plain_text: "",
            blocks: "[]", variables: "{}",
            translations: JSON.stringify({}),
            status: "draft", version: 1, created_by: user.id,
          });
          total++;
        }
      } catch (e) {
        toast.error(`Failed to import "${file.name}": ${e instanceof Error ? e.message : "Invalid format"}`);
      }
    }
    if (total > 0) toast.success(`${total} template${total > 1 ? "s" : ""} imported`);
    setImporting(false);
  };

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !(t.subject || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (localeFilter !== "all" && t.locale !== localeFilter) return false;
      return true;
    });
  }, [templates, search, categoryFilter, localeFilter]);

  const handleDuplicate = async (t: NonNullable<typeof templates>[0]) => {
    if (!user) return;
    const newName = `${t.name} (Copy)`;
    const fmtVariables = (v: unknown): string => {
      if (typeof v === "string") return v;
      if (Array.isArray(v)) return v.length === 0 ? "{}" : `{${v.map(x => typeof x === "string" ? x : JSON.stringify(x)).join(",")}}`;
      return "{}";
    };
    await create.mutateAsync({
      name: newName, subject: t.subject, category: t.category, locale: t.locale,
      description: t.description, html_content: t.html_content, plain_text: t.plain_text,
      blocks: typeof t.blocks === "string" ? t.blocks : JSON.stringify(t.blocks ?? []),
      variables: fmtVariables(t.variables),
      translations: typeof t.translations === "string" ? t.translations : JSON.stringify(t.translations ?? {}),
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

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Email Templates" description="Create and manage email templates">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="mr-1 h-4 w-4" /> {importing ? "Importing..." : "Import"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".json,.html,.htm" multiple className="hidden"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (files.length) handleImportFiles(files);
              e.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => setShowPasteHtml(true)}>
            <FileText className="mr-1 h-4 w-4" /> Paste HTML
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!templates?.length}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <Button onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" /> New Template</Button>
        </div>
      </PageHeader>

      <div className="flex gap-3 items-center flex-wrap">
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
        <Select value={localeFilter} onValueChange={setLocaleFilter}>
          <SelectTrigger className="w-40"><Languages className="mr-1 h-3.5 w-3.5" /><SelectValue placeholder="All Languages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {SUPPORTED_LOCALES.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
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
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{CATEGORIES.find(c => c.value === t.category)?.label || t.category}</Badge>
                      {t.locale && t.locale !== "en" && (
                        <Badge variant="secondary" className="text-[10px]"><Globe className="mr-0.5 h-2.5 w-2.5" />{getLocaleLabel(t.locale)}</Badge>
                      )}
                    </div>
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
      <PasteHtmlDialog open={showPasteHtml} onOpenChange={setShowPasteHtml} />
    </div>
  );
}