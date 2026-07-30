import { useQuery } from "@tanstack/react-query";
import { supabase, getAdminToken, SUPABASE_ENABLED } from "@/lib/supabase";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const eventColors: Record<string, string> = {
  sent: "#3b82f6",
  delivered: "#22c55e",
  opened: "#10b981",
  clicked: "#f59e0b",
  bounced: "#ef4444",
  complained: "#dc2626",
};

export function EmailAnalytics() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["admin", "email-events"],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const token = getAdminToken();
      if (!token) return [];
      const { data } = await supabase.rpc("admin_select", {
        p_session_token: token, p_table: "email_events",
        p_select: "event, recipient, created_at",
        p_order_col: "created_at", p_order_dir: "desc", p_limit: 500,
      });
      return (data ?? []) as Array<{ event: string; recipient: string; created_at: string }>;
    },
  });

  if (isLoading) return <div className="p-6"><PageHeader title="Email Analytics" /><LoadingState count={3} /></div>;

  const eventCounts: Record<string, number> = {};
  if (events) for (const e of events) eventCounts[e.event] = (eventCounts[e.event] ?? 0) + 1;

  const pieData = Object.entries(eventCounts).map(([name, value]) => ({ name, value }));

  const columns: Column<{ event: string; recipient: string; created_at: string }>[] = [
    { key: "event", label: "Event", render: (row) => <Badge variant="default" style={{ backgroundColor: eventColors[row.event] ?? "#6b7280" }}>{row.event}</Badge> },
    { key: "recipient", label: "Recipient" },
    { key: "created_at", label: "Time", render: (row) => <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span> },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Email Analytics" description="Track sent, delivered, opened, clicked, bounced, and complained emails" />

      <div className="grid gap-4 sm:grid-cols-3">
        {Object.entries(eventCounts).map(([event, count]) => (
          <Card key={event}>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm capitalize">{event}</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><span className="text-2xl font-bold">{count}</span></CardContent>
          </Card>
        ))}
      </div>

      {pieData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Event Distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((entry) => <Cell key={entry.name} fill={eventColors[entry.name] ?? "#6b7280"} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Recent Events</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={events?.slice(0, 100) ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
