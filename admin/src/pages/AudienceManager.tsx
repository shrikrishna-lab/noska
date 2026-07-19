import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEmailCampaigns } from "@/lib/queries";
import { useRealtimeInvalidate } from "@/lib/queries";
import { Users, Search, Filter, ArrowRight, Clock, Send, CheckCircle2, AlertTriangle } from "lucide-react";

const AUDIENCES = [
  { id: "everyone", label: "Everyone", count: 1240, desc: "All users in the system" },
  { id: "waitlist", label: "Waitlist", count: 342, desc: "Users on the waitlist" },
  { id: "approved", label: "Approved Users", count: 856, desc: "Users who have been approved" },
  { id: "active", label: "Active Users", count: 623, desc: "Active workspace members" },
  { id: "admins", label: "Admins", count: 12, desc: "Administrator accounts" },
  { id: "workspace_owners", label: "Workspace Owners", count: 98, desc: "Users who own a workspace" },
  { id: "premium", label: "Premium Users", count: 156, desc: "Users on paid plans" },
];

export function AudienceManager() {
  const { data: campaigns } = useEmailCampaigns();
  const [search, setSearch] = useState("");
  useRealtimeInvalidate(["admin", "campaigns"], "email_campaigns");

  const filtered = useMemo(() =>
    AUDIENCES.filter((a) => a.label.toLowerCase().includes(search.toLowerCase())),
    [search]
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
