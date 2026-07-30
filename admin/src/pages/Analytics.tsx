import { useDailySignups, useDailyAuditEvents } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

const COLORS = ["hsl(var(--primary))", "hsl(210 40% 60%)", "hsl(142 71% 45%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)"];

export function Analytics() {
  const { data: signups, isLoading: loadSignups } = useDailySignups(30);
  const { data: events, isLoading: loadEvents } = useDailyAuditEvents(30);

  if (loadSignups || loadEvents) return <div className="p-6"><PageHeader title="Analytics" description="Detailed analytics" /><LoadingState count={4} /></div>;

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
        </div>
      )}
    </div>
  );
}
