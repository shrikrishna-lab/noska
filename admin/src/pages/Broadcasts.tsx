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
import { useBroadcasts, useCreateBroadcast, useUpdateBroadcast, useDeleteBroadcast } from "@/lib/queries";
import { sendBroadcast } from "@/lib/email";
import type { BroadcastCampaign } from "@/lib/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Pencil, Trash2, X, Loader2, Send, Play, Ban } from "lucide-react";
import toast from "react-hot-toast";

const typeBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "warning" | "success"> = {
  info: "default", warning: "warning", announcement: "secondary", alert: "destructive",
};
const statusBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  draft: "secondary", scheduled: "default", sending: "warning", sent: "success", cancelled: "destructive",
};

interface BroadcastFormProps {
  broadcast?: BroadcastCampaign;
  onClose: () => void;
}

function slugify(text: string) { return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function BroadcastForm({ broadcast, onClose }: BroadcastFormProps) {
  const [title, setTitle] = useState(broadcast?.title ?? "");
  const [message, setMessage] = useState(broadcast?.message ?? "");
  const [type, setType] = useState(broadcast?.type ?? "info");
  const [targetType, setTargetType] = useState(broadcast?.target_type ?? "all");
  const [targetCount, setTargetCount] = useState(broadcast?.target_count?.toString() ?? "");
  const [sendImmediately, setSendImmediately] = useState(broadcast?.send_immediately ?? false);
  const [scheduledAt, setScheduledAt] = useState(broadcast?.scheduled_at?.slice(0, 16) ?? "");
  const [scheduleStart, setScheduleStart] = useState(broadcast?.schedule_start?.slice(0, 16) ?? "");
  const [scheduleEnd, setScheduleEnd] = useState(broadcast?.schedule_end?.slice(0, 16) ?? "");
  const [randomDelay, setRandomDelay] = useState(broadcast?.random_delay_minutes ?? false);
  const [status, setStatus] = useState(broadcast?.status ?? "draft");
  const create = useCreateBroadcast();
  const update = useUpdateBroadcast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const data: Record<string, unknown> = {
        title, message, type, target_type: targetType,
        target_count: targetType === "random" ? parseInt(targetCount) || null : null,
        send_immediately: sendImmediately,
        scheduled_at: scheduledAt || null,
        schedule_start: scheduleStart || null,
        schedule_end: scheduleEnd || null,
        random_delay_minutes: randomDelay,
        status,
      };
      if (broadcast) {
        await update.mutateAsync({ id: broadcast.id, ...data });
        toast.success("Broadcast updated");
      } else {
        await create.mutateAsync(data);
        toast.success("Broadcast created");
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
          <h2 className="text-lg font-semibold">{broadcast ? "Edit" : "New"} Broadcast</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Broadcast title" /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Message</Label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Broadcast message content..." rows={4} /></div>

          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-3">Targeting</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target</Label>
                <Select value={targetType} onValueChange={(v) => setTargetType(v as typeof targetType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="random">Random Users</SelectItem>
                    <SelectItem value="per_user">Per User (random time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {targetType === "random" && (
                <div className="space-y-2"><Label>User Count</Label><Input type="number" value={targetCount} onChange={(e) => setTargetCount(e.target.value)} placeholder="e.g. 100" /></div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-3">Schedule</p>
            <div className="flex items-center gap-3 mb-3">
              <Switch checked={sendImmediately} onCheckedChange={(v) => { setSendImmediately(v); if (v) { setScheduledAt(""); setScheduleStart(""); setScheduleEnd(""); } }} id="send-immediately" />
              <Label htmlFor="send-immediately">Send immediately</Label>
            </div>
            {!sendImmediately && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Scheduled At</Label><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></div>
                {(targetType === "per_user") && (
                  <>
                    <div className="space-y-2"><Label>Window Start</Label><Input type="datetime-local" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Window End</Label><Input type="datetime-local" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} /></div>
                    <div className="flex items-center gap-3 pt-2">
                      <Switch checked={randomDelay} onCheckedChange={setRandomDelay} id="random-delay" />
                      <Label htmlFor="random-delay">Random delay within window</Label>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {broadcast && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="sending">Sending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={!title.trim() || !message.trim() || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {broadcast ? "Update" : "Create"} Broadcast
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

export function Broadcasts() {
  const { data: broadcasts, isLoading } = useBroadcasts();
  const deleteBroadcast = useDeleteBroadcast();
  const updateBroadcast = useUpdateBroadcast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BroadcastCampaign | null>(null);

  const handleSend = async (b: BroadcastCampaign) => {
    try {
      const res = await sendBroadcast({
        broadcast_id: b.id,
        title: b.title,
        message: b.message,
        type: b.type,
        target_type: b.target_type,
        target_users: null,
      });
      if (res.error) { toast.error("Send failed: " + res.error); return; }
      await updateBroadcast.mutateAsync({ id: b.id, status: "sending", send_immediately: true, scheduled_at: null });
      toast.success(`Broadcast sent to ${res.sent ?? 0} users`);
    } catch { toast.error("Failed to send"); }
  };

  const handleCancel = async (b: BroadcastCampaign) => {
    try {
      await updateBroadcast.mutateAsync({ id: b.id, status: "cancelled" });
      toast.success("Broadcast cancelled");
    } catch { toast.error("Failed to cancel"); }
  };

  const columns: Column<BroadcastCampaign>[] = [
    { key: "title", label: "Title", sortable: true, render: (row) => <span className="font-medium">{row.title}</span> },
    {
      key: "type", label: "Type",
      render: (row) => <Badge variant={typeBadgeVariants[row.type] ?? "default"}>{row.type}</Badge>,
    },
    { key: "target_type", label: "Target", render: (row) => <span className="text-xs text-muted-foreground capitalize">{row.target_type?.replace("_", " ")}</span> },
    {
      key: "status", label: "Status", sortable: true,
      render: (row) => <Badge variant={statusBadgeVariants[row.status] ?? "secondary"}>{row.status}</Badge>,
    },
    { key: "sent_count", label: "Sent", render: (row) => `${row.sent_count ?? 0}/${row.total_count ?? "—"}` },
    { key: "created_at", label: "Created", hideOnMobile: true, render: (row) => <span className="text-muted-foreground text-xs">{new Date(row.created_at).toLocaleDateString()}</span> },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status === "draft" && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleSend(row)} title="Send now"><Play className="h-3.5 w-3.5" /></Button>
          )}
          {(row.status === "scheduled" || row.status === "sending") && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleCancel(row)} title="Cancel"><Ban className="h-3.5 w-3.5" /></Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(row); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (!confirm(`Delete broadcast "${row.title}"?`)) return;
            try { await deleteBroadcast.mutateAsync(row.id); toast.success("Deleted"); } catch { toast.error("Failed to delete"); }
          }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Broadcasts" description="Send notifications to users with scheduling and targeting" /><LoadingState count={3} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Broadcasts" description="Send notifications to users with scheduling and targeting" actions={<Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="mr-1 h-3.5 w-3.5" /> New Broadcast</Button>} />
      {broadcasts && broadcasts.length > 0 ? (
        <DataTable columns={columns} data={broadcasts} searchPlaceholder="Search broadcasts..." />
      ) : (
        <EmptyState title="No broadcasts" description="Create your first notification broadcast." />
      )}
      {showForm && <BroadcastForm broadcast={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
