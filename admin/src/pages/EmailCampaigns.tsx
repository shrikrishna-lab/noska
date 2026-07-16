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
import { useEmailCampaigns, useDeleteEmailCampaign, useCreateEmailCampaign, useUpdateEmailCampaign } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase, getAdminToken } from "@/lib/supabase";
import { sendCampaign, queueCampaign } from "@/lib/email";
import type { EmailCampaign, CampaignStatus } from "@/lib/types";
import { Plus, Copy, Trash2, Loader2, Send, X, Eye, Clock, Ban, ListOrdered } from "lucide-react";
import toast from "react-hot-toast";

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

function SendModal({ campaign, onClose }: { campaign: EmailCampaign; onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const fetchRecipients = async () => {
    if (!supabase) return [];
    const token = getAdminToken();
    if (!token) return [];
    const { data } = await supabase
      .rpc("admin_select", {
        p_session_token: token, p_table: "user_profiles",
        p_select: "email, user_name",
      });
    const users = ((data ?? []) as Array<{ email?: string | null; user_name?: string | null }>)
      .filter((u) => u.email);
    setRecipientCount(users.length);
    return users.map((u) => ({ email: u.email!, name: u.user_name ?? undefined }));
  };

  const handleSendNow = async () => {
    setSending(true);
    setResult(null);
    const recipients = await fetchRecipients();
    if (recipients.length === 0) {
      setResult("No users with email addresses found.");
      toast.error("No recipients available");
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
    const recipients = await fetchRecipients();
    if (recipients.length === 0) {
      setResult("No users with email addresses found.");
      toast.error("No recipients available");
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
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Send Campaign</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Send <strong>{campaign.name}</strong> to
          {recipientCount !== null ? (
            <> <strong>{recipientCount}</strong> user{recipientCount !== 1 ? "s" : ""} with emails</>
          ) : (
            <> all users with email addresses</>
          )}
          ?
        </p>
        {result && (
          <div className="mb-4 rounded-lg bg-muted p-3 text-sm">{result}</div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button variant="outline" className="flex-1" onClick={handleQueue} disabled={sending}>
            {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ListOrdered className="mr-1 h-4 w-4" />}
            Queue
          </Button>
          <Button className="flex-1" onClick={handleSendNow} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Now
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
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
  const { data: campaigns, isLoading } = useEmailCampaigns();
  const deleteCampaign = useDeleteEmailCampaign();
  const updateCampaign = useUpdateEmailCampaign();
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
    { key: "sent_at", label: "Sent", sortable: true, render: (row) => row.sent_at ? <span className="text-muted-foreground">{formatRelativeTime(row.sent_at)}</span> : <span className="text-muted-foreground">—</span>, hideOnMobile: true },
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (!confirm(`Delete campaign "${row.name}"?`)) return;
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
