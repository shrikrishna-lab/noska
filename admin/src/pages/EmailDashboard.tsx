import { useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEmailCampaigns, useEmailHistoryStats, useEmailHistory } from "@/lib/queries";
import { useRealtimeInvalidate } from "@/lib/queries";
import { BarChart3, Send, Mail, MousePointerClick, AlertTriangle, TrendingUp, Clock, FileText } from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmailDashboard() {
  const { data: stats, isLoading: statsLoading } = useEmailHistoryStats();
  const { data: campaigns } = useEmailCampaigns();
  const { data: history } = useEmailHistory(100);
  useRealtimeInvalidate(["admin", "email-history-stats"], "email_history");
  useRealtimeInvalidate(["admin", "campaigns"], "email_campaigns");

  const activeCampaigns = useMemo(() =>
    campaigns?.filter((c) => c.status === "sending" || c.status === "scheduled") ?? [],
    [campaigns]
  );

  const scheduledCount = useMemo(() =>
    campaigns?.filter((c) => c.status === "scheduled").length ?? 0,
    [campaigns]
  );

  const draftTemplates = 0;

  const recentActivity = useMemo(() =>
    (history ?? []).slice(0, 10),
    [history]
  );

  const deliveryData = useMemo(() => {
    if (!history) return { labels: [], series: [] };
    const byDate: Record<string, { sent: number; delivered: number; opened: number }> = {};
    for (const e of history) {
      const d = new Date(e.created_at).toLocaleDateString();
      if (!byDate[d]) byDate[d] = { sent: 0, delivered: 0, opened: 0 };
      byDate[d].sent++;
      if (e.status === "delivered" || e.status === "sent" || e.status === "opened" || e.status === "clicked") byDate[d].delivered++;
      if (e.status === "opened" || e.status === "clicked") byDate[d].opened++;
    }
    const entries = Object.entries(byDate).slice(-14);
    return {
      labels: entries.map(([d]) => d),
      series: entries.map(([, v]) => v.sent),
    };
  }, [history]);

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Email Dashboard" description="Overview of your email performance" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-20 animate-pulse bg-muted/30" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Email Dashboard" description="Overview of your email performance" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Send} label="Emails Sent Today" value={stats?.sentToday ?? 0} color="bg-indigo-500" />
        <StatCard icon={TrendingUp} label="Delivery Rate" value={stats ? `${stats.deliveryRate}%` : "0%"} color="bg-emerald-500" />
        <StatCard icon={Mail} label="Open Rate" value={stats ? `${stats.openRate}%` : "0%"} color="bg-blue-500" />
        <StatCard icon={MousePointerClick} label="Click Rate" value={stats ? `${stats.clickRate}%` : "0%"} color="bg-purple-500" />
        <StatCard icon={AlertTriangle} label="Bounce Rate" value={stats ? `${stats.bounceRate}%` : "0%"} color="bg-amber-500" />
        <StatCard icon={AlertTriangle} label="Spam Rate" value={stats ? `${stats.spamRate}%` : "0%"} color="bg-red-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Active Campaigns</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeCampaigns.length}</p>
            <p className="text-xs text-muted-foreground">{scheduledCount} scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Draft Templates</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{draftTemplates}</p>
            <p className="text-xs text-muted-foreground">Ready to edit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Total Campaigns</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{campaigns?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Email Volume (14 days)</CardTitle></CardHeader>
          <CardContent>
            {deliveryData.labels.length > 0 ? (
              <div className="h-48 flex items-end gap-1">
                {deliveryData.series.map((v, i) => {
                  const max = Math.max(...deliveryData.series, 1);
                  const h = (v / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">{v}</span>
                      <div
                        className="w-full rounded-t bg-indigo-500/70 hover:bg-indigo-500 transition-colors"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[8px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                        {deliveryData.labels[i].slice(0, 5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No email data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] px-1 capitalize">{e.status}</Badge>
                      <span className="text-sm truncate">{e.recipient_email || e.subject || "—"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
