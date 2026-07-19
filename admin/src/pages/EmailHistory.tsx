import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEmailHistory } from "@/lib/queries";
import { useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { History, Search, Eye, Mail, Clock, MousePointerClick, AlertTriangle } from "lucide-react";

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sent: Mail,
  delivered: Mail,
  opened: Eye,
  clicked: MousePointerClick,
  bounced: AlertTriangle,
  complained: AlertTriangle,
  failed: AlertTriangle,
};

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  opened: "bg-indigo-100 text-indigo-700",
  clicked: "bg-purple-100 text-purple-700",
  bounced: "bg-amber-100 text-amber-700",
  complained: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
};

export function EmailHistory() {
  const { data: history, isLoading } = useEmailHistory(200);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  useRealtimeInvalidate(["admin", "email-history"], "email_history");

  const filtered = useMemo(() => {
    if (!history) return [];
    return history.filter((e) => {
      if (search && !e.recipient_email.toLowerCase().includes(search.toLowerCase()) && !(e.subject || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      return true;
    });
  }, [history, search, statusFilter]);

  const stats = useMemo(() => {
    if (!history) return null;
    const total = history.length;
    const delivered = history.filter((e) => e.status === "delivered" || e.status === "sent").length;
    const opened = history.filter((e) => e.status === "opened" || e.status === "clicked").length;
    const clicked = history.filter((e) => e.status === "clicked").length;
    return { total, delivered, opened, clicked };
  }, [history]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Email History" description="Complete history of all sent emails" />

      {stats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-emerald-500">{stats.delivered}</p><p className="text-xs text-muted-foreground">Delivered</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-indigo-500">{stats.opened}</p><p className="text-xs text-muted-foreground">Opened</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-purple-500">{stats.clicked}</p><p className="text-xs text-muted-foreground">Clicked</p></CardContent></Card>
        </div>
      )}

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by recipient or subject..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          className="flex h-9 w-36 rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="bounced">Bounced</option>
          <option value="complained">Spam</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
              <span className="flex-1">Recipient</span>
              <span className="w-40">Subject</span>
              <span className="w-20">Status</span>
              <span className="w-32">Sent</span>
              <span className="w-16 text-center">Opened</span>
              <span className="w-16 text-center">Clicked</span>
            </div>
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <History className="mx-auto h-12 w-12 mb-3 opacity-30" />
                <p>No email history found</p>
              </div>
            ) : (
              filtered.map((e) => {
                const Icon = STATUS_ICONS[e.status] || Mail;
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/20">
                    <span className="flex-1 truncate">{e.recipient_email}</span>
                    <span className="w-40 truncate text-muted-foreground">{e.subject || "—"}</span>
                    <span className="w-20">
                      <Badge className={`text-[10px] ${STATUS_COLORS[e.status] || ""}`}>
                        <Icon className="inline h-3 w-3 mr-1" />
                        {e.status}
                      </Badge>
                    </span>
                    <span className="w-32 text-xs text-muted-foreground">
                      {e.sent_at ? new Date(e.sent_at).toLocaleString() : new Date(e.created_at).toLocaleString()}
                    </span>
                    <span className="w-16 text-center text-xs">{e.opened_at ? "✓" : "—"}</span>
                    <span className="w-16 text-center text-xs">{e.clicked_at ? "✓" : "—"}</span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
