import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWaitlist, useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { ArrowLeft, Users, MailCheck, TrendingUp, Clock, Globe, UserCheck, XCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  waiting: { label: "Pending", color: "#6b7280" },
  pending: { label: "Pending", color: "#6b7280" },
  approved: { label: "Approved", color: "#3b82f6" },
  invited: { label: "Invited", color: "#f59e0b" },
  accepted: { label: "Accepted", color: "#22c55e" },
  expired: { label: "Expired", color: "#9ca3af" },
  rejected: { label: "Rejected", color: "#ef4444" },
  banned: { label: "Banned", color: "#dc2626" },
  suspended: { label: "Suspended", color: "#f97316" },
};

const PIE_COLORS = ["#6b7280", "#3b82f6", "#f59e0b", "#22c55e", "#9ca3af", "#ef4444", "#dc2626", "#f97316"];

export default function WaitlistAnalyticsPage() {
  const navigate = useNavigate();
  const { data: entries, isLoading } = useWaitlist();
  useRealtimeInvalidate(["admin", "waitlist"], "waitlist_entries");

  const stats = useMemo(() => {
    if (!entries) return null;
    const total = entries.length;
    const approved = entries.filter((e) => ["approved", "invited", "accepted"].includes(e.status)).length;
    const invited = entries.filter((e) => e.status === "invited").length;
    const accepted = entries.filter((e) => e.status === "accepted").length;
    const pending = entries.filter((e) => e.status === "waiting" || e.status === "pending").length;
    const rejected = entries.filter((e) => e.status === "rejected").length;
    const todaySignups = entries.filter((e) => e.joined_at && new Date(e.joined_at).toDateString() === new Date().toDateString()).length;
    const conversion = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const topReferrers = entries.filter((e) => e.referral_count > 0).sort((a, b) => b.referral_count - a.referral_count).slice(0, 5);
    const avgApprovalTime = (() => {
      const approved = entries.filter((e) => e.joined_at && e.approved_at);
      if (!approved.length) return null;
      const avg = approved.reduce((sum, e) => sum + (new Date(e.approved_at!).getTime() - new Date(e.joined_at!).getTime()), 0) / approved.length;
      const days = Math.floor(avg / 86400000);
      const hours = Math.floor((avg % 86400000) / 3600000);
      return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
    })();
    const countryData = entries.reduce((acc, e) => {
      if (e.country) { acc[e.country] = (acc[e.country] || 0) + 1; }
      return acc;
    }, {} as Record<string, number>);
    return { total, approved, invited, accepted, pending, rejected, todaySignups, conversion, topReferrers, avgApprovalTime, countryData };
  }, [entries]);

  const statusPieData = useMemo(() => {
    if (!entries) return [];
    const counts: Record<string, number> = {};
    for (const e of entries) {
      const key = STATUS_CONFIG[e.status]?.label ?? e.status;
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [entries]);

  const signupsOverTime = useMemo(() => {
    if (!entries) return [];
    const byDate: Record<string, number> = {};
    for (const e of entries) {
      if (!e.joined_at) continue;
      const d = new Date(e.joined_at).toLocaleDateString();
      byDate[d] = (byDate[d] || 0) + 1;
    }
    return Object.entries(byDate).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).slice(-30).map(([date, count]) => ({ date: date.slice(0, 5), count }));
  }, [entries]);

  if (isLoading) return <div className="p-6"><PageHeader title="Waitlist Analytics" description="Metrics and charts" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Waitlist Analytics"
        description="Detailed metrics and insights"
        actions={
          <button onClick={() => navigate("/admin/waitlist")} className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm hover:bg-accent">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Waitlist
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{stats?.total ?? 0}</p><p className="text-xs text-muted-foreground">Total Signups</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="h-5 w-5 text-blue-500" /><div><p className="text-2xl font-bold">{stats?.todaySignups ?? 0}</p><p className="text-xs text-muted-foreground">Today</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><MailCheck className="h-5 w-5 text-amber-500" /><div><p className="text-2xl font-bold">{stats?.invited ?? 0}</p><p className="text-xs text-muted-foreground">Invited</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><UserCheck className="h-5 w-5 text-green-500" /><div><p className="text-2xl font-bold">{stats?.accepted ?? 0}</p><p className="text-xs text-muted-foreground">Accepted</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-orange-500" /><div><p className="text-2xl font-bold">{stats?.pending ?? 0}</p><p className="text-xs text-muted-foreground">Pending</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><XCircle className="h-5 w-5 text-red-500" /><div><p className="text-2xl font-bold">{stats?.rejected ?? 0}</p><p className="text-xs text-muted-foreground">Rejected</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Globe className="h-5 w-5 text-purple-500" /><div><p className="text-2xl font-bold">{stats?.conversion ?? 0}%</p><p className="text-xs text-muted-foreground">Conversion Rate</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-cyan-500" /><div><p className="text-2xl font-bold">{Object.keys(stats?.countryData ?? {}).length}</p><p className="text-xs text-muted-foreground">Countries</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-rose-500" /><div><p className="text-2xl font-bold">{stats?.avgApprovalTime ?? "—"}</p><p className="text-xs text-muted-foreground">Avg Approval Time</p></div></CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Signups Over Time (Last 30 Days)</CardTitle></CardHeader>
          <CardContent>
            {signupsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={signupsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground py-8 text-center">No signup data yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Status Distribution</CardTitle></CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {statusPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Country Distribution</CardTitle></CardHeader>
          <CardContent>
            {stats && Object.keys(stats.countryData).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Object.entries(stats.countryData).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }))} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground py-8 text-center">No country data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Top Referrers</CardTitle></CardHeader>
          <CardContent>
            {stats?.topReferrers && stats.topReferrers.length > 0 ? (
              <div className="space-y-3">
                {stats.topReferrers.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                    </div>
                    <Badge variant="secondary">{r.referral_count} refs</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground py-8 text-center">No referrals yet</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
