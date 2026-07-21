import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useEmailTemplate, useUpdateEmailTemplate, useEmailVersions, useCreateEmailVersion, useEmailBranding,
  useRealtimeInvalidate,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmailPreview } from "@/components/email/EmailPreview";
import { getBlockDefinition, blocksToHtml, BLOCK_DEFINITIONS, SYSTEM_VARIABLES } from "@/lib/emailBlocks";
import { sendEmail } from "@/lib/email";
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, Eye, Send, History, RotateCcw, ArrowUp, ArrowDown,
  Copy, CheckCircle2, Archive,
} from "lucide-react";
import toast from "react-hot-toast";
import type { EmailBlock, EmailBlockType, TemplateCategory } from "@/lib/types";

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  // ... same as EmailTemplates.tsx
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

function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: EmailBlock;
  onChange: (updated: EmailBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const def = getBlockDefinition(block.type);
  if (!def) return null;

  const updateContent = (key: string, value: unknown) => {
    onChange({ ...block, content: { ...block.content, [key]: value } });
  };

  return (
    <Card className="relative group border-l-4" style={{ borderLeftColor: "#6366f1" }}>
      <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-50" />
          <span className="text-sm font-medium">{def.icon} {def.label}</span>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" disabled={isFirst} onClick={onMoveUp}><ArrowUp className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" disabled={isLast} onClick={onMoveDown}><ArrowDown className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-3 w-3 text-red-400" /></Button>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-3 space-y-2">
        {def.fields.map((field) => {
          const val = block.content[field.key] ?? field.defaultValue ?? "";
          return (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs">{field.label}</Label>
              {field.type === "text" && (
                <Input value={val as string} onChange={(e) => updateContent(field.key, e.target.value)} className="h-8 text-sm" />
              )}
              {field.type === "textarea" && (
                <Textarea value={val as string} onChange={(e) => updateContent(field.key, e.target.value)} className="text-sm min-h-[60px]" />
              )}
              {field.type === "color" && (
                <div className="flex gap-2">
                  <Input type="color" value={val as string} onChange={(e) => updateContent(field.key, e.target.value)} className="w-10 h-8 p-0.5" />
                  <Input value={val as string} onChange={(e) => updateContent(field.key, e.target.value)} className="h-8 text-sm flex-1" />
                </div>
              )}
              {field.type === "url" && (
                <Input value={val as string} onChange={(e) => updateContent(field.key, e.target.value)} placeholder="https://..." className="h-8 text-sm" />
              )}
              {field.type === "number" && (
                <Input type="number" value={val as number} onChange={(e) => updateContent(field.key, parseInt(e.target.value) || 0)} className="h-8 text-sm w-24" />
              )}
              {field.type === "boolean" && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!val} onChange={(e) => updateContent(field.key, e.target.checked)} className="rounded" />
                  Enabled
                </label>
              )}
              {field.type === "select" && field.options && (
                <Select value={val as string} onValueChange={(v) => updateContent(field.key, v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {field.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AddBlockPanel({ onAdd }: { onAdd: (type: EmailBlockType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(!open)}>
        <Plus className="mr-1 h-4 w-4" /> Add Block
      </Button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-1 max-h-60 overflow-y-auto rounded-lg border p-2">
          {BLOCK_DEFINITIONS.map((def) => (
            <button
              key={def.type}
              onClick={() => { onAdd(def.type); setOpen(false); }}
              className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted/50 text-left"
            >
              <span>{def.icon}</span>
              <span>{def.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VariableInserter({ onInsert }: { onInsert: (variable: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Copy className="mr-1 h-3 w-3" /> Insert Variable
      </Button>
      {open && (
        <Card className="absolute z-50 mt-1 w-64">
          <CardContent className="p-2 space-y-0.5 max-h-48 overflow-y-auto">
            {SYSTEM_VARIABLES.map((v) => (
              <button
                key={v.key}
                onClick={() => { onInsert(v.key); setOpen(false); }}
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted/50"
              >
                <code className="text-indigo-500">{v.key}</code>
                <span className="ml-2 text-muted-foreground">{v.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VersionHistory({ templateId, onRestore }: { templateId: string; onRestore: (html: string, blocks: EmailBlock[]) => void }) {
  const { data: versions } = useEmailVersions(templateId);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <History className="mr-1 h-3 w-3" /> Versions ({versions?.length ?? 0})
      </Button>
      {open && versions && (
        <Card className="mt-2">
          <CardContent className="p-2 space-y-1 max-h-60 overflow-y-auto">
            {versions.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">No version history yet.</p>
            )}
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-muted/30">
                <span>v{v.version_number} — {v.changes_description || "No description"}</span>
                <span className="text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { onRestore(v.html_content || "", v.blocks as EmailBlock[] || []); setOpen(false); toast.success(`Restored v${v.version_number}`); }}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function EmailTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: template, isLoading } = useEmailTemplate(id);
  const update = useUpdateEmailTemplate();
  const createVersion = useCreateEmailVersion();
  const { data: branding } = useEmailBranding();
  useRealtimeInvalidate(["admin", "email-templates", id], "email_templates");

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("custom");
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject || "");
      setCategory(template.category);
      setBlocks(Array.isArray(template.blocks) ? template.blocks : []);
    }
  }, [template]);

  const html = useMemo(() => blocksToHtml(blocks, branding ?? undefined), [blocks, branding]);

  const handleSave = useCallback(async () => {
    if (!id || !template || !user) return;
    setSaving(true);
    await createVersion.mutateAsync({
      template_id: id, version_number: template.version,
      html_content: template.html_content || "", blocks: JSON.stringify(template.blocks || []),
      changes_description: `Version ${template.version}`,
      created_by: user?.id,
    });
    await update.mutateAsync({
      id,
      name, subject, category,
      html_content: html,
      blocks: JSON.stringify(blocks),
      version: (template.version || 1) + 1,
    });
    setDirty(false);
    setSaving(false);
    toast.success("Template saved");
  }, [id, template, user, name, subject, category, html, blocks, createVersion, update]);

  const handleTestSend = useCallback(async () => {
    if (!testEmail) { toast.error("Enter a test email address"); return; }
    setSendingTest(true);
    const result = await sendEmail({ to: testEmail, subject: subject || "Test Email", html });
    if (result.error) toast.error(result.error);
    else toast.success("Test email sent!");
    setSendingTest(false);
  }, [testEmail, subject, html]);

  const addBlock = useCallback((type: EmailBlockType) => {
    const def = getBlockDefinition(type);
    if (!def) return;
    const newBlock: EmailBlock = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36),
      type,
      content: { ...def.defaultContent },
      sort_order: blocks.length,
    };
    setBlocks([...blocks, newBlock]);
    setDirty(true);
  }, [blocks]);

  const updateBlock = useCallback((index: number, updated: EmailBlock) => {
    const next = [...blocks];
    next[index] = updated;
    setBlocks(next);
    setDirty(true);
  }, [blocks]);

  const removeBlock = useCallback((index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
    setDirty(true);
  }, [blocks]);

  const moveBlock = useCallback((index: number, direction: "up" | "down") => {
    const next = [...blocks];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
    setDirty(true);
  }, [blocks]);

  const insertVariable = useCallback((variable: string, targetField?: string) => {
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? 0;
      textarea.value = textarea.value.substring(0, start) + variable + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
      textarea.focus();
    }
  }, []);

  if (isLoading) return <LoadingState />;
  if (!template) return <div className="p-6 text-center text-muted-foreground">Template not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Template" description={template.name}>
        <div className="flex gap-2">
          <VersionHistory templateId={id!} onRestore={(htmlContent, restoredBlocks) => {
            setBlocks(restoredBlocks);
            setDirty(true);
          }} />
          <Button variant="outline" size="sm" onClick={() => navigate("/email-templates")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
            <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Editor */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Template Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Template Name</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subject Line</Label>
                <div className="flex gap-2">
                  <Input value={subject} onChange={(e) => { setSubject(e.target.value); setDirty(true); }} placeholder="Enter subject line" />
                  <VariableInserter onInsert={(v) => setSubject(subject + v)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={(v) => { setCategory(v as TemplateCategory); setDirty(true); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Blocks ({blocks.length})</CardTitle>
              <AddBlockPanel onAdd={addBlock} />
            </CardHeader>
            <CardContent className="space-y-2">
              {blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No blocks yet. Click "Add Block" to start building your email.
                </p>
              ) : (
                blocks.map((block, i) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    onChange={(updated) => updateBlock(i, updated)}
                    onDelete={() => removeBlock(i)}
                    onMoveUp={() => moveBlock(i, "up")}
                    onMoveDown={() => moveBlock(i, "down")}
                    isFirst={i === 0}
                    isLast={i === blocks.length - 1}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Test Send */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Test Email</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleTestSend} disabled={sendingTest}>
                  <Send className="mr-1 h-3 w-3" />
                  {sendingTest ? "Sending..." : "Send Test"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
            <CardContent>
              <EmailPreview html={html} plainText={template.plain_text} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
