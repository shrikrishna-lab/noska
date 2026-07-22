import { useState, useEffect, useMemo, useCallback } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmailCampaigns, useDeleteEmailCampaign, useCreateEmailCampaign, useUpdateEmailCampaign, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase, getAdminToken } from "@/lib/supabase";
import { sendCampaign, queueCampaign } from "@/lib/email";
import type { EmailCampaign, CampaignStatus } from "@/lib/types";
import { Plus, Copy, Trash2, Loader2, Send, X, Eye, Clock, Ban, ListOrdered, Users, User, Target, Mail, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";

const statusColors: Record<string, "secondary" | "warning" | "default" | "success"> = {
  draft: "secondary", scheduled: "warning", sending: "default", sent: "success",
};

function PreviewModal({ html, subject, onClose }: { html: string; subject: string; onClose: () => void }) {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-full max-w-3xl rounded-xl border bg-background p-6 shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview: {subject}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <div className="flex-1 overflow-auto rounded-lg border bg-white">
            <iframe
              title="Email Preview"
              srcDoc={html}
              className="h-[600px] w-full"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </Portal>
  );
}

function CampaignForm({ campaign, onClose }: { campaign?: EmailCampaign; onClose: () => void }) {
  const [name, setName] = useState(campaign?.name ?? "");
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [htmlContent, setHtmlContent] = useState(
    campaign?.html_content ?? "<h2>Hello {{name}},</h2><p>Check out what's new at Noska!</p>"
  );
  const [showPreview, setShowPreview] = useState(false);
  const create = useCreateEmailCampaign();
  const update = useUpdateEmailCampaign();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !subject.trim()) return;
    setSubmitting(true);
    try {
      if (campaign) {
        await update.mutateAsync({ id: campaign.id, name, subject, html_content: htmlContent });
        toast.success("Campaign updated");
      } else {
        await create.mutateAsync({ name, subject, html_content: htmlContent, status: "draft" });
        toast.success("Campaign created");
      }
      onClose();
    } catch { toast.error("Failed to save campaign"); }
    setSubmitting(false);
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{campaign ? "Edit" : "Create"} Campaign</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Campaign Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Series" /></div>
            <div className="space-y-2"><Label>Subject Line</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Welcome to Noska!" /></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>HTML Content</Label>
              {htmlContent && (
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                  <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                </Button>
              )}
            </div>
            <Textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} rows={8} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Use <code className="rounded bg-muted px-1">{`{{name}}`}</code> and <code className="rounded bg-muted px-1">{`{{email}}`}</code> as placeholders.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim() || !subject.trim() || submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {campaign ? "Update" : "Create"} Campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
    {showPreview && <PreviewModal html={htmlContent} subject={subject} onClose={() => setShowPreview(false)} />}
    </Portal>
  );
}

type RecipientType = "all" | "specific" | "active" | "inactive" | "custom";

const ACTIVE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const INACTIVE_OPTIONS = [
  { value: "7d", label: "Over 7 days" },
  { value: "30d", label: "Over 30 days" },
  { value: "90d", label: "Over 90 days" },
  { value: "never", label: "Never logged in" },
];

function SendModal({ campaign, onClose }: { campaign: EmailCampaign; onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [recipientType, setRecipientType] = useState<RecipientType>("all");
  const [activeRange, setActiveRange] = useState("30d");
  const [inactiveRange, setInactiveRange] = useState("30d");
  const [specificSearch, setSpecificSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ email: string; name?: string } | null>(null);
  const [customEmails, setCustomEmails] = useState("");
  const [allUsers, setAllUsers] = useState<Array<{ email: string; name?: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      if (!supabase) return;
      const token = getAdminToken();
      if (!token) return;
      setLoadingUsers(true);
      const { data } = await supabase
        .rpc("admin_select", {
          p_session_token: token, p_table: "user_profiles",
          p_select: "email, user_name, last_active_at",
        });
      const users = ((data ?? []) as Array<{ email?: string | null; user_name?: string | null; last_active_at?: string | null }>)
        .filter((u) => u.email)
        .map((u) => ({ email: u.email!, name: u.user_name ?? undefined, last_active_at: u.last_active_at ?? undefined }));
      setAllUsers(users);
      setLoadingUsers(false);
    };
    fetchAll();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!specificSearch.trim()) return [];
    const q = specificSearch.toLowerCase();
    return allUsers.filter(
      (u) => u.email.toLowerCase().includes(q) || (u.name && u.name.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [specificSearch, allUsers]);

  const getRecipients = (): Array<{ email: string; name?: string }> => {
    switch (recipientType) {
      case "all":
        return allUsers;
      case "specific":
        return selectedUser ? [selectedUser] : [];
      case "active": {
        const cutoff = new Date();
        const days = parseInt(activeRange);
        cutoff.setDate(cutoff.getDate() - days);
        return allUsers.filter((u) => {
          const ua = (u as { last_active_at?: string }).last_active_at;
          return ua && new Date(ua) >= cutoff;
        });
      }
      case "inactive": {
        if (inactiveRange === "never") {
          return allUsers.filter((u) => !(u as { last_active_at?: string }).last_active_at);
        }
        const cutoff = new Date();
        const days = parseInt(inactiveRange);
        cutoff.setDate(cutoff.getDate() - days);
        return allUsers.filter((u) => {
          const ua = (u as { last_active_at?: string }).last_active_at;
          return !ua || new Date(ua) < cutoff;
        });
      }
      case "custom":
        return customEmails
          .split(/[,;\n]+/)
          .map((e) => e.trim())
          .filter((e) => e.includes("@"))
          .map((e) => ({ email: e }));
      default:
        return [];
    }
  };

  const recipients = getRecipients();

  const handleSendNow = async () => {
    setSending(true);
    setResult(null);
    if (recipients.length === 0) {
      setResult("No recipients match your criteria.");
      toast.error("No recipients");
      setSending(false);
      return;
    }
    try {
      const res = await sendCampaign({
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        recipients,
        subject: campaign.subject || "No subject",
        html: campaign.html_content || "<p>No content</p>",
      });
      if (res.error) {
        setResult(`Failed: ${res.error}`);
        toast.error("Send failed: " + res.error);
      } else {
        setResult(`Sent to ${res.sent ?? 0} recipients (${res.failed ?? 0} failed)`);
        toast.success(`Campaign sent: ${res.sent ?? 0} delivered`);
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Send failed");
      toast.error("Send failed");
    }
    setSending(false);
  };

  const handleQueue = async () => {
    setSending(true);
    setResult(null);
    if (recipients.length === 0) {
      setResult("No recipients match your criteria.");
      toast.error("No recipients");
      setSending(false);
      return;
    }
    try {
      const res = await queueCampaign({
        campaign_id: campaign.id,
        recipients,
        subject: campaign.subject || "No subject",
        html: campaign.html_content || "<p>No content</p>",
      });
      if (res.error) {
        setResult(`Failed: ${res.error}`);
        toast.error("Queue failed: " + res.error);
      } else {
        setResult(`Queued ${res.queued ?? 0} emails for background sending`);
        toast.success(`${res.queued ?? 0} emails queued`);
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Queue failed");
      toast.error("Queue failed");
    }
    setSending(false);
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Send Campaign</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Send <strong>{campaign.name}</strong> to:
        </p>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {([{ key: "all", icon: Users, label: "All Users" },
             { key: "active", icon: Target, label: "Active Users" },
             { key: "inactive", icon: User, label: "Inactive Users" },
             { key: "specific", icon: Search, label: "Specific User" },
             { key: "custom", icon: Mail, label: "Custom List" },
          ] as const).map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant={recipientType === key ? "default" : "outline"}
              size="sm"
              className="justify-start gap-2"
              onClick={() => setRecipientType(key)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {recipientType === "specific" && (
          <div className="mb-4 space-y-2">
            <Label>Search user</Label>
            <Input
              placeholder="Type name or email..."
              value={specificSearch}
              onChange={(e) => { setSpecificSearch(e.target.value); setSelectedUser(null); }}
            />
            {specificSearch && !selectedUser && filteredUsers.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border bg-background">
                {filteredUsers.map((u) => (
                  <button
                    key={u.email}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    onClick={() => { setSelectedUser(u); setSpecificSearch(""); }}
                  >
                    <span className="font-medium">{u.name || u.email}</span>
                    {u.name && <span className="ml-2 text-muted-foreground">{u.email}</span>}
                  </button>
                ))}
              </div>
            )}
            {selectedUser && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedUser.name || selectedUser.email}</span>
                {selectedUser.name && <span className="text-muted-foreground">({selectedUser.email})</span>}
                <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => setSelectedUser(null)}><X className="h-3 w-3" /></Button>
              </div>
            )}
          </div>
        )}

        {recipientType === "active" && (
          <div className="mb-4 space-y-2">
            <Label>Active within</Label>
            <Select value={activeRange} onValueChange={setActiveRange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {recipientType === "inactive" && (
          <div className="mb-4 space-y-2">
            <Label>Inactive for</Label>
            <Select value={inactiveRange} onValueChange={setInactiveRange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INACTIVE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {recipientType === "custom" && (
          <div className="mb-4 space-y-2">
            <Label>Email addresses</Label>
            <Textarea
              placeholder="user1@example.com, user2@example.com"
              value={customEmails}
              onChange={(e) => setCustomEmails(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Separate emails with comma, semicolon, or new line.</p>
          </div>
        )}

        <div className="mb-4 rounded-lg bg-muted p-3 text-sm">
          {loadingUsers ? (
            <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading users...</span>
          ) : (
            <><strong>{recipients.length}</strong> recipient{recipients.length !== 1 ? "s" : ""} selected</>
          )}
        </div>

        {result && (
          <div className="mb-4 rounded-lg bg-muted p-3 text-sm">{result}</div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button variant="outline" className="flex-1" onClick={handleQueue} disabled={sending || recipients.length === 0}>
            {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ListOrdered className="mr-1 h-4 w-4" />}
            Queue
          </Button>
          <Button className="flex-1" onClick={handleSendNow} disabled={sending || recipients.length === 0}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Now
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

function ScheduledCountdown({ scheduledFor }: { scheduledFor: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const tick = () => {
      const diff = new Date(scheduledFor).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Sending now..."); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setRemaining(`in ${d}d ${h}h`);
      else if (h > 0) setRemaining(`in ${h}h ${m}m`);
      else setRemaining(`in ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduledFor]);

  return <span className="text-xs text-muted-foreground tabular-nums">{remaining}</span>;
}

function ScheduleModal({ campaign, onClose }: { campaign: EmailCampaign; onClose: () => void }) {
  const [scheduledFor, setScheduledFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = useUpdateEmailCampaign();

  const handleSchedule = async () => {
    if (!scheduledFor) return;
    setSubmitting(true);
    try {
      await update.mutateAsync({ id: campaign.id, status: "scheduled", scheduled_for: scheduledFor });
      toast.success(`Campaign scheduled for ${new Date(scheduledFor).toLocaleString()}`);
      onClose();
    } catch { toast.error("Failed to schedule campaign"); }
    setSubmitting(false);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Schedule Campaign</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">Set a send time for <strong>{campaign.name}</strong>.</p>
          <div className="space-y-2">
            <Label>Scheduled Date & Time</Label>
            <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button className="flex-1" onClick={handleSchedule} disabled={!scheduledFor || submitting}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Clock className="mr-1 h-4 w-4" />}
              Schedule
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function EmailCampaigns() {
  const { confirm } = useConfirmDialog();
  const { data: campaigns, isLoading } = useEmailCampaigns();
  const deleteCampaign = useDeleteEmailCampaign();
  const updateCampaign = useUpdateEmailCampaign();
  useRealtimeInvalidate(["admin", "campaigns"], "email_campaigns");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmailCampaign | null>(null);
  const [sendingCampaign, setSendingCampaign] = useState<EmailCampaign | null>(null);
  const [schedulingCampaign, setSchedulingCampaign] = useState<EmailCampaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    try {
      await updateCampaign.mutateAsync({ id, status: "draft" });
      toast.success("Campaign returned to draft");
    } catch { toast.error("Failed to cancel campaign"); }
  };

  const columns: Column<EmailCampaign>[] = [
    { key: "name", label: "Campaign", sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "status", label: "Status", sortable: true, render: (row) => <Badge variant={statusColors[row.status] ?? "secondary"}>{row.status}</Badge> },
    { key: "recipients", label: "Recipients", sortable: true, className: "text-right" },
    { key: "sent", label: "Sent", sortable: true, className: "text-right", hideOnMobile: true },
    { key: "open_rate", label: "Open Rate", sortable: true, className: "text-right", render: (row) => `${row.open_rate}%`, hideOnMobile: true },
    { key: "sent_at", label: "Sent", sortable: true, render: (row) => {
      if (row.status === "scheduled" && row.scheduled_for) {
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-muted-foreground">{new Date(row.scheduled_for).toLocaleDateString()}</span>
            <ScheduledCountdown scheduledFor={row.scheduled_for} />
          </div>
        );
      }
      return row.sent_at ? <span className="text-muted-foreground">{formatRelativeTime(row.sent_at)}</span> : <span className="text-muted-foreground">—</span>;
    }, hideOnMobile: true },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status === "draft" && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => setSendingCampaign(row)} title="Send">
                <Send className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => setSchedulingCampaign(row)} title="Schedule">
                <Clock className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {row.status === "scheduled" && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleCancel(row.id)} title="Cancel schedule">
              <Ban className="h-3.5 w-3.5" />
            </Button>
          )}
          {row.status === "sending" && (
            <span className="text-xs text-muted-foreground px-1">in progress…</span>
          )}
          {(row.status === "draft" || row.status === "scheduled") && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(row); setShowForm(true); }} title="Edit">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
          {row.html_content && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewCampaign(row)} title="Preview">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
            await navigator.clipboard.writeText(row.id);
            toast.success("Campaign ID copied");
          }} title="Copy ID">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (!await confirm({ title: "Delete Campaign", description: `Permanently delete campaign "${row.name}"? This cannot be undone.`, variant: "delete", confirmText: "Delete" })) return;
            setDeleting(row.id);
            try { await deleteCampaign.mutateAsync(row.id); toast.success("Campaign deleted"); }
            catch { toast.error("Failed to delete campaign"); }
            setDeleting(null);
          }} disabled={deleting === row.id}>
            {deleting === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Email Campaigns" description="Manage email campaigns" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Email Campaigns" description="Manage email campaigns and newsletters" actions={<Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="mr-1 h-3.5 w-3.5" /> Create Campaign</Button>} />
      {campaigns && campaigns.length > 0 ? (
        <DataTable columns={columns} data={campaigns} searchPlaceholder="Search campaigns..." />
      ) : (
        <EmptyState title="No campaigns" description="Email campaigns will appear here once created." />
      )}
      {showForm && <CampaignForm campaign={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); }} />}
      {sendingCampaign && <SendModal campaign={sendingCampaign} onClose={() => setSendingCampaign(null)} />}
      {schedulingCampaign && <ScheduleModal campaign={schedulingCampaign} onClose={() => setSchedulingCampaign(null)} />}
      {previewCampaign && (
        <PreviewModal
          html={previewCampaign.html_content ?? ""}
          subject={previewCampaign.subject ?? ""}
          onClose={() => setPreviewCampaign(null)}
        />
      )}
    </div>
  );
}
