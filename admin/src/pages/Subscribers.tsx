import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useNewsletterSubscribers,
  useUpdateEmailCampaign,
  useRealtimeInvalidate,
} from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { Users, Search, Mail, Download, UserPlus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export function Subscribers() {
  const { data: subscribers, isLoading } = useNewsletterSubscribers();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  useRealtimeInvalidate(["admin", "newsletter-subscribers"], "newsletter_subscribers");

  const filtered = useMemo(() => {
    if (!subscribers) return [];
    return subscribers.filter((s) => {
      if (search && !s.email.toLowerCase().includes(search.toLowerCase()) && !(s.name || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [subscribers, search, statusFilter]);

  const stats = useMemo(() => {
    if (!subscribers) return { total: 0, active: 0, unsubscribed: 0, bounced: 0 };
    return {
      total: subscribers.length,
      active: subscribers.filter((s) => s.status === "active").length,
      unsubscribed: subscribers.filter((s) => s.status === "unsubscribed").length,
      bounced: subscribers.filter((s) => s.status === "bounced").length,
    };
  }, [subscribers]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Subscribers" description={`${stats.active} active subscribers`}>
        <Button variant="outline"><Download className="mr-1 h-4 w-4" /> Export</Button>
        <Button><UserPlus className="mr-1 h-4 w-4" /> Add Subscriber</Button>
      </PageHeader>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-emerald-500">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-500">{stats.unsubscribed}</p><p className="text-xs text-muted-foreground">Unsubscribed</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-red-500">{stats.bounced}</p><p className="text-xs text-muted-foreground">Bounced</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by email or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          className="flex h-9 w-36 rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p>No subscribers found</p>
            </div>
          ) : (
            <div className="divide-y">
              <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                <span className="flex-1">Email</span>
                <span className="w-28">Name</span>
                <span className="w-20">Status</span>
                <span className="w-24">Source</span>
                <span className="w-28">Subscribed</span>
              </div>
              {filtered.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/20">
                  <span className="flex-1 truncate">{s.email}</span>
                  <span className="w-28 truncate text-muted-foreground">{s.name || "—"}</span>
                  <span className="w-20">
                    <Badge variant="outline" className="text-[10px] capitalize">{s.status}</Badge>
                  </span>
                  <span className="w-24 text-muted-foreground text-xs capitalize">{s.source}</span>
                  <span className="w-28 text-xs text-muted-foreground">{new Date(s.subscribed_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
