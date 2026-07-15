import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAiChats, useAiChatCount, useAiUsageFromAudit } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function AiUsage() {
  const { data: chats, isLoading: chatsLoading } = useAiChats();
  const { data: totalChats } = useAiChatCount();
  const { data: aiEvents, isLoading: eventsLoading } = useAiUsageFromAudit();

  const totalCost = (aiEvents ?? []).reduce((s, e) => s + (e.ai_cost ?? 0), 0);
  const avgLatency = (aiEvents ?? []).length
    ? Math.round((aiEvents ?? []).reduce((s, e) => s + (e.ai_latency_ms ?? 0), 0) / aiEvents!.length)
    : 0;

  if (chatsLoading || eventsLoading) return <div className="p-6"><PageHeader title="AI Usage" description="Monitor AI platform usage" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="AI Usage" description="Monitor AI platform usage and costs" />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">AI Chats</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalChats ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">AI Events</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{aiEvents?.length ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Avg Latency</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{avgLatency}ms</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Cost</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">${totalCost.toFixed(2)}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">AI Chats</CardTitle></CardHeader>
          <CardContent>
            {chats && chats.length > 0 ? (
              <div className="space-y-2">
                {chats.slice(0, 10).map((chat) => (
                  <div key={chat.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{chat.name || "Untitled Chat"}</p>
                      <p className="text-xs text-muted-foreground">{chat.chat_type || "general"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{chat.created_at ? new Date(chat.created_at).toLocaleDateString() : ""}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No AI chats yet" description="AI conversations will appear here once users start chatting." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">AI Events Activity</CardTitle></CardHeader>
          <CardContent>
            {aiEvents && aiEvents.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={aiEvents.slice(0, 30).map((e) => ({
                    date: e.created_at ? new Date(e.created_at).toLocaleDateString() : "",
                    latency: e.ai_latency_ms ?? 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Area type="monotone" dataKey="latency" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="No AI events recorded" description="Events will appear once the AI features are used." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
