import { useMemo, useState } from "react";
import { Bell, Megaphone, Radio, Send, Trash2, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Portal } from "@/components/ui/Portal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { adminSelect } from "@/lib/queries";
import {
  useDeleteUserNotification,
  useSendUserNotification,
  useUserNotificationOverview,
} from "@/lib/userNotifications";
import { formatRelativeTime } from "@/lib/utils";

const SEVERITY_BADGE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  info: "secondary",
  success: "success",
  warning: "warning",
  critical: "destructive",
};

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ComposerModal({ onClose }: { onClose: () => void }) {
  const send = useSendUserNotification();
  const confirm = useConfirmDialog();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("broadcast");
  const [severity, setSeverity] = useState("info");
  const [broadcast, setBroadcast] = useState(true);
  const [userIdsText, setUserIdsText] = useState("");
  const [isTest, setIsTest] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lookupUser = async () => {
    const email = lookupEmail.trim().toLowerCase();
    if (!email) return;
    setLookingUp(true);
    try {
      const rows = await adminSelect<{ id: string; user_name: string | null; email: string | null }>(
        "user_profiles",
        "id,user_name,email",
        { eq: ["email", email], limit: 1 },
      );
      if (rows.length === 0) {
        toast.error(`No user found for ${email}`);
      } else {
        setUserIdsText((prev) => {
          const existing = new Set(prev.split(/[\s,]+/).filter(Boolean));
          existing.add(rows[0].id);
          return [...existing].join(", ");
        });
        toast.success(`Added ${rows[0].user_name || email}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lookup failed");
    }
    setLookingUp(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const userIds = userIdsText.split(/[\s,]+/).filter(Boolean);
    if (!broadcast && userIds.length === 0) {
      toast.error("Add at least one target user id");
      return;
    }
    const ok = await confirm.confirm(
      broadcast
        ? {
            title: "Send to ALL users?",
            description: `“${title}” will appear in the Notification Center of every user, live. ${isTest ? "Marked as TEST." : ""}`,
            variant: "warning",
            confirmText: "Send broadcast",
          }
        : {
            title: `Send to ${userIds.length} user${userIds.length === 1 ? "" : "s"}?`,
            description: `“${title}” will be delivered to their Notification Center${isTest ? " as a labelled TEST" : ""}.`,
            variant: "confirm",
            confirmText: "Send",
          },
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      const result = await send.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        category,
        severity,
        broadcast,
        userIds,
        isTest,
      });
      toast.success(
        result.broadcast ? "Broadcast delivered" : `Delivered to ${result.count} user${result.count === 1 ? "" : "s"}`,
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    }
    setSubmitting(false);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Send className="h-4 w-4" /> Send notification
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>✕</Button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New widgets are live" maxLength={200} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Optional supporting text…" rows={3} maxLength={1000} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broadcast">Broadcast</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="task">Tasks</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                    <SelectItem value="automation">Automations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div className="flex items-center gap-2">
                {broadcast ? <Megaphone className="h-4 w-4 text-muted-foreground" /> : <UserRound className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">Broadcast to all users</p>
                  <p className="text-xs text-muted-foreground">Off = target specific users by id or email.</p>
                </div>
              </div>
              <Switch checked={broadcast} onCheckedChange={setBroadcast} />
            </div>

            {!broadcast && (
              <div className="space-y-2 rounded-xl border p-3">
                <div className="flex gap-2">
                  <Input
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder="Find user by email…"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void lookupUser())}
                  />
                  <Button variant="outline" onClick={() => void lookupUser()} disabled={lookingUp || !lookupEmail.trim()}>
                    {lookingUp ? "…" : "Find"}
                  </Button>
                </div>
                <Textarea
                  value={userIdsText}
                  onChange={(e) => setUserIdsText(e.target.value)}
                  placeholder="Target auth user ids (comma separated, max 500)"
                  rows={2}
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Test mode</p>
                <p className="text-xs text-muted-foreground">
                  Labelled “[TEST]” in every client. Broadcasts are blocked in test mode — explicit targets only.
                </p>
              </div>
              <Switch checked={isTest} onCheckedChange={setIsTest} />
            </div>

            <Button
              className="w-full"
              onClick={() => void handleSubmit()}
              disabled={!title.trim() || submitting || (!broadcast && userIdsText.split(/[\s,]+/).filter(Boolean).length === 0)}
            >
              {submitting ? "Sending…" : isTest ? "Send test notification" : "Send notification"}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function UserNotifications() {
  const { data, isLoading, error } = useUserNotificationOverview();
  const deleteNotification = useDeleteUserNotification();
  const confirm = useConfirmDialog();
  const [composing, setComposing] = useState(false);

  const recent = useMemo(() => data?.recent ?? [], [data]);

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm.confirm({
      title: "Delete notification?",
      description: `“${title}” is removed from every recipient's Notification Center, along with its read receipts. This is audited.`,
      variant: "delete",
      confirmText: "Delete",
    });
    if (!ok) return;
    deleteNotification.mutate(id, {
      onSuccess: () => toast.success("Notification deleted"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
    });
  };

  if (isLoading) return <LoadingState />;
  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="User Notifications" description="Deliver, monitor and manage in-app notifications" />
        <EmptyState title="Notification service unavailable" description={error instanceof Error ? error.message : "Could not load overview."} />
      </div>
    );
  }

  const kpis = data.kpis;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Notifications"
        description="Deliver, monitor and manage notifications in your users' Notification Centers"
        actions={
          <Button onClick={() => setComposing(true)}>
            <Send className="mr-2 h-4 w-4" /> Send notification
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Sent (30d)" value={kpis.sent_30d} hint={`${kpis.recipients_30d.toLocaleString()} recipient deliveries`} />
        <Kpi label="Read rate (30d)" value={kpis.read_rate_30d != null ? `${kpis.read_rate_30d}%` : "—"} hint="Receipts vs deliveries" />
        <Kpi label="Broadcasts (30d)" value={kpis.broadcasts_30d} hint="All-users sends" />
        <Kpi label="Test sends (30d)" value={kpis.tests_30d} hint="Labelled, targeted only" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b p-4">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Recent notifications</h3>
            <span className="ml-auto text-xs text-muted-foreground">Live read receipts · newest first</span>
          </div>
          {recent.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Radio}
                title="Nothing sent yet"
                description="Use “Send notification” to deliver your first in-app message — targeted or broadcast."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Notification</th>
                    <th className="px-4 py-2.5 font-medium">Audience</th>
                    <th className="px-4 py-2.5 font-medium">Severity</th>
                    <th className="px-4 py-2.5 font-medium">Read</th>
                    <th className="px-4 py-2.5 font-medium">Sent by</th>
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id} className="border-b transition-colors last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2.5">
                        <p className="flex items-center gap-1.5 font-medium">
                          {row.is_test && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">TEST</span>
                          )}
                          {row.title}
                        </p>
                        {row.body && <p className="max-w-[320px] truncate text-xs text-muted-foreground">{row.body}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {row.broadcast ? <span className="font-medium text-foreground">All users</span> : row.target_label}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={SEVERITY_BADGE[row.severity] ?? "default"}>{row.severity}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.read_count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.created_by_email ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatRelativeTime(row.created_at)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => void handleDelete(row.id, row.title)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {composing && <ComposerModal onClose={() => setComposing(false)} />}
    </div>
  );
}
