import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUserCount, useWaitlistCount, useWaitlist, useAdminUsers, useWorkspaces, useSubscriptions, useEmailCampaigns, useRealtimeInvalidate } from "@/lib/queries";
import { Users, Search, Send } from "lucide-react";

const AUDIENCE_META = [
  { id: "everyone", label: "Everyone", icon: Users, desc: "All users in the system" },
  { id: "waitlist", label: "Waitlist", icon: Users, desc: "Users on the waitlist" },
  { id: "approved", label: "Approved Users", icon: Users, desc: "Users who have been approved" },
  { id: "active", label: "Active Users", icon: Users, desc: "Active workspace members" },
  { id: "admins", label: "Admins", icon: Users, desc: "Administrator accounts" },
  { id: "workspace_owners", label: "Workspace Owners", icon: Users, desc: "Users who own a workspace" },
  { id: "premium", label: "Premium Users", icon: Users, desc: "Users on paid plans" },
];

export function AudienceManager() {
  const { data: userCount } = useUserCount();
  const { data: waitlistCount } = useWaitlistCount();
  const { data: waitlist } = useWaitlist();
  const { data: adminUsers } = useAdminUsers();
  const { data: workspaces } = useWorkspaces();
  const { data: subscriptions } = useSubscriptions();
  const { data: campaigns } = useEmailCampaigns();
  const [search, setSearch] = useState("");

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
        <Button><Users className="mr-1 h-4 w-4" /> Create Segment</Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search audiences..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

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
              <Button variant="outline" size="sm" className="text-xs w-full">
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
    </div>
  );
}
