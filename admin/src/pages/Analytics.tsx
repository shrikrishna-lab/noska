import { useDailySignups, useDailyAuditEvents, useRealtimeInvalidate } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

const COLORS = ["hsl(var(--primary))", "hsl(210 40% 60%)", "hsl(142 71% 45%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)"];

export function Analytics() {
  const { data: signups, isLoading: loadSignups } = useDailySignups(30);
  const { data: events, isLoading: loadEvents } = useDailyAuditEvents(30);
  useRealtimeInvalidate(["admin", "daily-signups"], "user_profiles");
  useRealtimeInvalidate(["admin", "daily-audit"], "audit_events");

  if (loadSignups || loadEvents) return <div className="p-6"><PageHeader title="Analytics" description="Detailed analytics" /><LoadingState count={4} /></div>;

  const totalSignups = signups?.reduce((s, d) => s + d.value, 0) ?? 0;
  const totalActivity = events?.reduce((s, d) => s + d.value, 0) ?? 0;
  const pieData = [
    ...(totalSignups > 0 ? [{ name: "Signups", value: totalSignups }] : []),
    ...(totalActivity > 0 ? [{ name: "Activity", value: totalActivity }] : []),
  ];
  const hasData = (signups && signups.length > 0) || (events && events.length > 0);

  return (
    <div className="p-6">
      <PageHeader title="Analytics" description="Detailed analytics and insights" />
      {!hasData ? (
        <EmptyState title="No analytics data yet" description="Analytics will populate as users interact with the platform." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {signups && signups.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Daily Signups (30d)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={signups}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          {events && events.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Daily Activity (30d)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={events}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          {pieData.length > 1 && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm font-medium">Signups vs Activity</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
