import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Portal } from "@/components/ui/Portal";
import {
  useUserCount, useWaitlistCount, useWaitlist, useAdminUsers, useWorkspaces, useSubscriptions,
  useEmailCampaigns, useRealtimeInvalidate, useCreateEmailSegment, useCreateEmailCampaign,
} from "@/lib/queries";
import { adminSelect } from "@/lib/queries";
import { sendCampaign } from "@/lib/email";
import { useAuth } from "@/lib/auth";
import { Users, Search, Send, Plus, X, Loader2, Mail, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { TargetedEmailDialog, type TargetMode } from "@/components/email/TargetedEmailDialog";
import type { AdminUserRow } from "@/lib/queries";

const AUDIENCE_META = [
  { id: "everyone", label: "Everyone", icon: Users, desc: "All users in the system" },
  { id: "waitlist", label: "Waitlist", icon: Users, desc: "Users on the waitlist" },
  { id: "approved", label: "Approved Users", icon: Users, desc: "Users who have been approved" },
  { id: "active", label: "Active Users", icon: Users, desc: "Active workspace members" },
  { id: "admins", label: "Admins", icon: Users, desc: "Administrator accounts" },
  { id: "workspace_owners", label: "Workspace Owners", icon: Users, desc: "Users who own a workspace" },
  { id: "premium", label: "Premium Users", icon: Users, desc: "Users on paid plans" },
];

interface Audience {
  id: string; label: string; icon: typeof Users; desc: string; count: number;
}

function CreateSegmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const create = useCreateEmailSegment();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!name) { toast.error("Segment name is required"); return; }
    if (!user) return;
    await create.mutateAsync({
      name, description, filters: JSON.stringify([]),
      subscriber_count: 0, created_by: user.id,
    });
    toast.success("Segment created");
    onOpenChange(false);
    setName(""); setDescription("");
  };

  return (
    <Portal>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => onOpenChange(false)}>
          <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Segment</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Segment Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., EU Users" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this segment..." />
              </div>
              <Button onClick={handleCreate} disabled={create.isPending || !name.trim()} className="w-full">
                {create.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                Create Segment
              </Button>
            </div>
          </div>
        </div>
      )}
    </Portal>
  );
}

function EmailAudienceDialog({ audience, onClose }: { audience: Audience; onClose: () => void }) {
  const { data: waitlist } = useWaitlist();
  const { data: adminUsers } = useAdminUsers();
  const { data: workspaces } = useWorkspaces();
  const { data: subscriptions } = useSubscriptions();
  const createCampaign = useCreateEmailCampaign();
  const navigate = useNavigate();
  const [name, setName] = useState(`New Campaign — ${audience.label}`);
  const [subject, setSubject] = useState("What's new at Noska");
  const [html, setHtml] = useState("<h2>Hello {{name}},</h2><p>Check out what's new at Noska!</p>");
  const [recipients, setRecipients] = useState<Array<{ email: string; name?: string }>>([]);
  const [resolved, setResolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const resolveRecipients = async (): Promise<Array<{ email: string; name?: string }>> => {
    const profiles = await adminSelect<AdminUserRow & { id: string; last_active_at?: string | null }>(
      "user_profiles", "id, email, user_name, last_active_at"
    );
    const withEmail = (profiles ?? []).filter((p) => p.email);
    const ownerIds = new Set((workspaces ?? []).map((w) => w.owner_id).filter(Boolean));
    const premiumIds = new Set(
      (subscriptions ?? []).filter((s) => s.plan !== "free" && s.status === "active").map((s) => s.user_id).filter(Boolean)
    );

    switch (audience.id) {
      case "waitlist":
        return (waitlist ?? []).filter((w) => w.email).map((w) => ({ email: w.email, name: w.name }));
      case "approved":
        return (waitlist ?? []).filter((w) => w.status === "accepted" && w.email).map((w) => ({ email: w.email, name: w.name }));
      case "active": {
        const cutoff = new Date(Date.now() - 30 * 86400000);
        return withEmail
          .filter((p) => p.last_active_at && new Date(p.last_active_at) >= cutoff)
          .map((p) => ({ email: p.email!, name: p.user_name ?? undefined }));
      }
      case "admins":
        return (adminUsers ?? []).filter((a) => a.email).map((a) => ({ email: a.email!, name: a.name }));
      case "workspace_owners":
        return withEmail.filter((p) => ownerIds.has(p.id)).map((p) => ({ email: p.email!, name: p.user_name ?? undefined }));
      case "premium":
        return withEmail.filter((p) => premiumIds.has(p.id)).map((p) => ({ email: p.email!, name: p.user_name ?? undefined }));
      case "everyone":
      default:
        return withEmail.map((p) => ({ email: p.email!, name: p.user_name ?? undefined }));
    }
  };

  const handleResolve = async () => {
    setLoading(true);
    try {
      const list = await resolveRecipients();
      setRecipients(list);
      setResolved(true);
      if (list.length === 0) toast.error("No recipients in this audience");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load recipients");
    }
    setLoading(false);
  };

  const handleSaveDraft = async () => {
    if (!name.trim() || !subject.trim()) return;
    setSending(true);
    try {
      await createCampaign.mutateAsync({
        name: name.trim(), subject: subject.trim(), html_content: html,
        status: "draft",
      });
      toast.success("Draft campaign created");
      onClose();
      navigate("/email-campaigns");
    } catch { toast.error("Failed to create campaign"); }
    setSending(false);
  };

  const handleSendNow = async () => {
    if (!name.trim() || !subject.trim()) return;
    if (recipients.length === 0) { toast.error("No recipients resolved"); return; }
    setSending(true);
    try {
      const id = await createCampaign.mutateAsync({
        name: name.trim(), subject: subject.trim(), html_content: html,
        status: "sending",
      });
      const res = await sendCampaign({
        campaign_id: id ?? "", campaign_name: name.trim(),
        recipients, subject: subject.trim(), html,
      });
      if (res.error) { toast.error(`Send failed: ${res.error}`); }
      else { toast.success(`Sent to ${res.sent ?? 0} recipients (${res.failed ?? 0} failed)`); onClose(); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    }
    setSending(false);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Send Email to {audience.label}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Campaign Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Subject Line</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>HTML Content</Label>
              <Textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={6} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">Use <code className="rounded bg-muted px-1">{`{{name}}`}</code> and <code className="rounded bg-muted px-1">{`{{email}}`}</code> as placeholders.</p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {loading ? <><Loader2 className="h-3 w-3 animate-spin" /> Resolving recipients...</> : (
                  resolved ? <><strong>{recipients.length}</strong> recipient{recipients.length !== 1 ? "s" : ""} resolved</> : "Recipients not yet resolved"
                )}
              </span>
              <Button variant="outline" size="sm" onClick={handleResolve} disabled={loading}>
                <Users className="mr-1 h-3 w-3" /> Resolve Recipients
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={sending}>Cancel</Button>
              <Button variant="outline" className="flex-1" onClick={handleSaveDraft} disabled={sending || !name.trim() || !subject.trim()}>
                {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Mail className="mr-1 h-4 w-4" />}
                Save Draft
              </Button>
              <Button className="flex-1" onClick={handleSendNow} disabled={sending || !name.trim() || !subject.trim() || recipients.length === 0}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function AudienceManager() {
  const { data: userCount } = useUserCount();
  const { data: waitlistCount } = useWaitlistCount();
  const { data: waitlist } = useWaitlist();
  const { data: adminUsers } = useAdminUsers();
  const { data: workspaces } = useWorkspaces();
  const { data: subscriptions } = useSubscriptions();
  const { data: campaigns } = useEmailCampaigns();
  const [search, setSearch] = useState("");
  const [showCreateSegment, setShowCreateSegment] = useState(false);
  const [emailAudience, setEmailAudience] = useState<Audience | null>(null);
  const [targetedOpen, setTargetedOpen] = useState(false);
  const [locationTarget, setLocationTarget] = useState<TargetMode | null>(null);

  useRealtimeInvalidate(["admin", "users", "count"], "user_profiles");
  useRealtimeInvalidate(["admin", "waitlist"], "waitlist_entries");
  useRealtimeInvalidate(["admin", "waitlist", "count"], "waitlist_entries");
  useRealtimeInvalidate(["admin", "admin-users"], "admin_users");
  useRealtimeInvalidate(["admin", "workspaces"], "workspaces");
  useRealtimeInvalidate(["admin", "subscriptions"], "subscriptions");
  useRealtimeInvalidate(["admin", "campaigns"], "email_campaigns");

  const workspaceOwners = useMemo(() => {
    if (!workspaces) return 0;
    return new Set(workspaces.map((w) => w.owner_id).filter(Boolean)).size;
  }, [workspaces]);

  const approvedCount = useMemo(() => {
    if (!waitlist) return 0;
    return waitlist.filter((w) => w.status === "accepted").length;
  }, [waitlist]);

  const premiumCount = useMemo(() => {
    if (!subscriptions) return 0;
    return subscriptions.filter((s) => s.plan !== "free" && s.status === "active").length;
  }, [subscriptions]);

  const audiences = useMemo(() => {
    const counts: Record<string, number> = {
      everyone: userCount ?? 0,
      waitlist: waitlistCount ?? 0,
      approved: approvedCount,
      active: workspaces?.length ?? 0,
      admins: adminUsers?.length ?? 0,
      workspace_owners: workspaceOwners,
      premium: premiumCount,
    };
    return AUDIENCE_META.map((meta) => ({
      ...meta,
      count: counts[meta.id],
    }));
  }, [userCount, waitlistCount, approvedCount, workspaces, adminUsers, workspaceOwners, premiumCount]);

  const filtered = useMemo(() =>
    audiences.filter((a) => a.label.toLowerCase().includes(search.toLowerCase())),
    [search, audiences]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Audience Manager" description="Manage email audiences and segments">
        <Button variant="outline" onClick={() => setTargetedOpen(true)}><MapPin className="mr-1 h-4 w-4" /> Targeted Email</Button>
        <Button onClick={() => setShowCreateSegment(true)}><Users className="mr-1 h-4 w-4" /> Create Segment</Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search audiences..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-indigo-500" /> Location-Based Audiences</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Target users by city, state, area, or country — populated from each user's saved profile location.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(["city", "state", "area", "country"] as const).map((kind) => (
              <button
                key={kind}
                onClick={() => { setLocationTarget({ kind, value: "" }); setTargetedOpen(true); }}
                className="rounded-lg border p-3 text-left text-sm hover:border-indigo-500/50 transition-colors"
              >
                <p className="font-medium capitalize">{kind}-wise</p>
                <p className="text-[10px] text-muted-foreground">Send to users by {kind}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((audience) => (
          <Card key={audience.id} className="hover:border-indigo-500/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{audience.label}</CardTitle>
                <Badge variant="outline">{audience.count.toLocaleString()}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{audience.desc}</p>
              <Button variant="outline" size="sm" className="text-xs w-full" onClick={() => setEmailAudience(audience)}>
                <Send className="mr-1 h-3 w-3" /> Send Email
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Campaigns to Audiences</CardTitle></CardHeader>
        <CardContent>
          {(campaigns ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns sent yet.</p>
          ) : (
            <div className="space-y-2">
              {(campaigns ?? []).slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge>
                    <span className="text-xs text-muted-foreground">{c.recipients} recipients</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateSegmentDialog open={showCreateSegment} onOpenChange={setShowCreateSegment} />
      {emailAudience && <EmailAudienceDialog audience={emailAudience} onClose={() => setEmailAudience(null)} />}
      <TargetedEmailDialog
        open={targetedOpen}
        onClose={() => setTargetedOpen(false)}
        defaultTarget={locationTarget ?? undefined}
      />
    </div>
  );
}
