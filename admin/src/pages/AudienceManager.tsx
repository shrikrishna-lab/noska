import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEmailCampaigns, useRealtimeInvalidate } from "@/lib/queries";
import { supabase, SUPABASE_ENABLED, getAdminToken } from "@/lib/supabase";
import { Users, Search, Send } from "lucide-react";

export function AudienceManager() {
  const { data: campaigns } = useEmailCampaigns();
  const [search, setSearch] = useState("");
  useRealtimeInvalidate(["admin", "campaigns"], "email_campaigns");

  function useAdminCount(key: string[], table: string) {
    return useQuery({
      queryKey: key,
      queryFn: async () => {
        if (!SUPABASE_ENABLED || !supabase) return 0;
        const token = getAdminToken();
        if (!token) return 0;
        const { data, error } = await supabase.rpc("admin_count", {
          p_session_token: token,
          p_table: table,
        });
        if (error) throw error;
        return data ?? 0;
      },
    });
  }

  const { data: userCount } = useAdminCount(["admin", "user_count"], "user_profiles");
  const { data: waitlistCount } = useAdminCount(["admin", "waitlist_count"], "waitlist_entries");
  const { data: workspaceCount } = useAdminCount(["admin", "workspace_count"], "workspaces");

  const AUDIENCES = useMemo(() => [
    { id: "everyone", label: "Everyone", count: userCount ?? 0, desc: "All users in the system" },
    { id: "waitlist", label: "Waitlist", count: waitlistCount ?? 0, desc: "Users on the waitlist" },
    { id: "workspaces", label: "Workspaces", count: workspaceCount ?? 0, desc: "Active workspace members" },
  ], [userCount, waitlistCount, workspaceCount]);

  const filtered = useMemo(() =>
    AUDIENCES.filter((a) => a.label.toLowerCase().includes(search.toLowerCase())),
    [search, AUDIENCES]
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
