import { useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserLifecycle, useWaitlist, useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  Users, CheckCircle2, XCircle, Mail, UserCheck, ClipboardList,
  FileText, Activity, RefreshCcw, UserX, TrendingUp, MousePointerClick,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserFunnel() {
  const { data: stats, isLoading } = useUserLifecycle();
  const { data: waitlist } = useWaitlist();
  useRealtimeInvalidate(["admin", "user-lifecycle"], "audit_events");
  useRealtimeInvalidate(["admin", "user-lifecycle"], "user_profiles");
  useRealtimeInvalidate(["admin", "user-lifecycle"], "pages");
  useRealtimeInvalidate(["admin", "user-lifecycle"], "waitlist_entries");

  const funnel = useMemo(() => {
    if (!stats) return [];
    const rows = [
      { key: "waitlist", label: "Tried Noska (Waitlist)", value: stats.totalWaitlist, icon: MousePointerClick, color: "#6366f1" },
      { key: "approved", label: "Approved", value: stats.approved, icon: CheckCircle2, color: "#3b82f6" },
      { key: "accounts", label: "Created Account / Logged In", value: stats.accounts, icon: Users, color: "#22c55e" },
      { key: "onboarded", label: "Completed Onboarding", value: stats.onboardingComplete, icon: ClipboardList, color: "#14b8a6" },
      { key: "firstpage", label: "Created First Page", value: stats.firstPageUsers, icon: FileText, color: "#f59e0b" },
    ];
    return rows;
  }, [stats]);

  const dailyActiveTrend = useMemo(() => {
    if (!waitlist) return [];
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 13);
    const byDate: Record<string, number> = {};
    for (const w of waitlist) {
      if (!w.joined_at) continue;
      const d = new Date(w.joined_at);
      if (d.getTime() < cutoff.getTime()) continue;
      const dayKey = d.toDateString();
      byDate[dayKey] = (byDate[dayKey] || 0) + 1;
    }
    return Object.entries(byDate).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).map(([date, count]) => ({ date: date.slice(4, 10), count }));
  }, [waitlist]);

  if (isLoading) return <div className="p-6"><PageHeader title="User Funnel" description="User lifecycle and retention analytics" /><LoadingState count={6} /></div>;

  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="User Funnel"
        description="How users progress from waitlist to active workspace — plus waitlist approvals, rejections, DAU and returning users"
      />

      {/* Waitlist decisions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Waitlist Decisions</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Total Waitlist" value={stats?.totalWaitlist ?? 0} sub="Everyone who signed up" color="bg-indigo-500/10 text-indigo-600" />
          <StatCard icon={CheckCircle2} label="Approved" value={stats?.approved ?? 0} sub={`${stats && stats.totalWaitlist > 0 ? Math.round(((stats.approved) / stats.totalWaitlist) * 100) : 0}% of waitlist`} color="bg-blue-500/10 text-blue-600" />
          <StatCard icon={XCircle} label="Rejected" value={stats?.rejected ?? 0} sub={`${stats && stats.totalWaitlist > 0 ? Math.round((stats.rejected / stats.totalWaitlist) * 100) : 0}% of waitlist`} color="bg-red-500/10 text-red-600" />
          <StatCard icon={Mail} label="Invited" value={stats?.invited ?? 0} sub={`${stats?.accepted ?? 0} accepted invites`} color="bg-amber-500/10 text-amber-600" />
        </div>
      </div>

      {/* Lifecycle funnel */}
      <Card>
        <CardHeader><CardTitle className="text-sm">User Lifecycle Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnel.map((step, i) => {
              const width = Math.max(8, (step.value / maxFunnel) * 100);
              return (
                <div key={step.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <step.icon className="h-4 w-4" style={{ color: step.color }} />
                      <span className="text-sm font-medium">{step.label}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{step.value.toLocaleString()}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: step.color }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {i === 0 ? "Baseline" : `${stats && stats.totalWaitlist > 0 ? Math.round((step.value / stats.totalWaitlist) * 100) : 0}% of waitlist · ${step.value === 0 ? 0 : Math.round((step.value / Math.max(1, funnel[i - 1].value)) * 100)}% of previous step`}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Engagement */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Engagement</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Activity} label="Active Today (DAU)" value={stats?.dau ?? 0} sub="Users with activity today" color="bg-emerald-500/10 text-emerald-600" />
          <StatCard icon={TrendingUp} label="Active (7 days)" value={stats?.active7d ?? 0} sub={`${stats?.active30d ?? 0} active in 30 days`} color="bg-cyan-500/10 text-cyan-600" />
          <StatCard icon={RefreshCcw} label="Returning (30d)" value={stats?.returning30d ?? 0} sub="Active on 2+ days" color="bg-violet-500/10 text-violet-600" />
          <StatCard icon={UserX} label="Not Returning" value={stats?.notReturning ?? 0} sub="Signed up, gone 30+ days" color="bg-rose-500/10 text-rose-600" />
        </div>
      </div>

      {/* Recent waitlist signups trend */}
      {dailyActiveTrend.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Waitlist Signups (Last 14 Days)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-28">
              {dailyActiveTrend.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{d.count}</span>
                  <div className="w-full rounded-t bg-indigo-500/70" style={{ height: `${Math.max(4, (d.count / Math.max(1, ...dailyActiveTrend.map((x) => x.count))) * 100)}%` }} />
                  <span className="text-[9px] text-muted-foreground">{d.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}