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
import { sendCampaign } from "@/lib/email";
import type { EmailCampaign } from "@/lib/types";
import { Plus, Copy, Trash2, Loader2, Send, X, Eye } from "lucide-react";
import toast from "react-hot-toast";

const statusColors: Record<string, "secondary" | "warning" | "default" | "success"> = {
  draft: "secondary", scheduled: "warning", sending: "default", sent: "success",
};

function CampaignForm({ campaign, onClose }: { campaign?: EmailCampaign; onClose: () => void }) {
  const [name, setName] = useState(campaign?.name ?? "");
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [htmlContent, setHtmlContent] = useState(
    campaign?.html_content ?? "<h2>Hello {{name}},</h2><p>Check out what's new at Noska!</p>"
  );
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
            <Label>HTML Content</Label>
            <Textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} rows={8} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Use <code className="rounded bg-muted px-1">{`{{name}}`}</code> and <code className="rounded bg-muted px-1">{`{{email}}`}</code> as placeholders.</p>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!name.trim() || !subject.trim() || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {campaign ? "Update" : "Create"} Campaign
          </Button>
        </div>
      </div>
    </div>
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

  const handleSend = async () => {
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
          <Button className="flex-1" onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Now
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
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmailCampaign | null>(null);
  const [sendingCampaign, setSendingCampaign] = useState<EmailCampaign | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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
          {(row.status === "draft" || row.status === "scheduled") && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => setSendingCampaign(row)} title="Send now">
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(row); setShowForm(true); }} title="Edit">
            <Eye className="h-3.5 w-3.5" />
          </Button>
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
    </div>
  );
}
