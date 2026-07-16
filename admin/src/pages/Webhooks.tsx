import { useState } from "react";
import { useWebhookEndpoints, useWebhookDeliveries, useCreateWebhookEndpoint, useUpdateWebhookStatus, useDeleteWebhookEndpoint, useRealtimeInvalidate } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Play, Pause, Loader2, ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-200",
  paused: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  disabled: "bg-gray-500/10 text-gray-600 border-gray-200",
};

const DELIVERY_COLORS: Record<string, string> = {
  success: "text-green-600",
  failed: "text-red-600",
  retrying: "text-yellow-600",
  delivering: "text-blue-600",
  pending: "text-gray-500",
};

const EVENT_OPTIONS = [
  "user.created", "user.deleted",
  "page.created", "page.updated", "page.deleted",
  "payment.succeeded", "payment.failed",
  "subscription.created", "subscription.updated", "subscription.canceled",
  "error.high", "error.critical",
  "ai.generated", "ai.errored",
];

export function Webhooks() {
  const { data: endpoints, isLoading } = useWebhookEndpoints();
  const { data: deliveries } = useWebhookDeliveries();
  const createEndpoint = useCreateWebhookEndpoint();
  const updateStatus = useUpdateWebhookStatus();
  const deleteEndpoint = useDeleteWebhookEndpoint();
  useRealtimeInvalidate(["admin", "webhooks"], "webhook_endpoints", "*");
  useRealtimeInvalidate(["admin", "webhook-deliveries"], "webhook_deliveries", "*");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", description: "", events: [] as string[] });

  const handleCreate = async () => {
    if (!form.name || !form.url) {
      toast.error("Name and URL are required");
      return;
    }
    try {
      await createEndpoint.mutateAsync(form);
      toast.success("Webhook endpoint created");
      setShowCreate(false);
      setForm({ name: "", url: "", description: "", events: [] });
    } catch {
      toast.error("Failed to create webhook");
    }
  };

  const toggleEvent = (event: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event],
    }));
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Webhooks"
        description="Manage webhook endpoints and monitor deliveries"
        actions={
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="mr-1 h-4 w-4" /> New Endpoint
          </Button>
        }
      />

      {showCreate && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Create Webhook Endpoint</CardTitle><CardDescription>Configure a new webhook receiver</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Slack Notifications" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input placeholder="https://hooks.example.com/webhook" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input placeholder="Send notifications to Slack" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="flex flex-wrap gap-2">
                {EVENT_OPTIONS.map((event) => (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleEvent(event)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      form.events.includes(event)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {event}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createEndpoint.isPending}>
                {createEndpoint.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Create Endpoint
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="endpoints">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints ({endpoints?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries ({deliveries?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="mt-4 space-y-4">
          {isLoading ? (
            <LoadingState count={3} />
          ) : !endpoints?.length ? (
            <EmptyState title="No webhook endpoints" description="Create your first webhook endpoint to start receiving events." />
          ) : endpoints.map((ep) => (
            <Card key={ep.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{ep.name}</CardTitle>
                      <Badge variant="outline" className={STATUS_COLORS[ep.status]}>{ep.status}</Badge>
                    </div>
                    {ep.description && <CardDescription>{ep.description}</CardDescription>}
                  </div>
                  <div className="flex gap-1">
                    {ep.status === "active" ? (
                      <Button variant="ghost" size="icon" onClick={async () => {
                        await updateStatus.mutateAsync({ id: ep.id, status: "paused" });
                        toast.success("Webhook paused");
                      }}><Pause className="h-4 w-4" /></Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={async () => {
                        await updateStatus.mutateAsync({ id: ep.id, status: "active" });
                        toast.success("Webhook activated");
                      }}><Play className="h-4 w-4" /></Button>
                    )}
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                      if (confirm("Delete this webhook endpoint?")) {
                        await deleteEndpoint.mutateAsync(ep.id);
                        toast.success("Webhook deleted");
                      }
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" /><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{ep.url}</code></div>
                  <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{ep.last_triggered_at ? formatRelativeTime(ep.last_triggered_at) : "Never triggered"}</div>
                  <div className="flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{ep.failure_count} failures</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ep.events.map((ev) => (
                    <Badge key={ev} variant="secondary" className="text-[10px]">{ev}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="deliveries" className="mt-4 space-y-2">
          {!deliveries?.length ? (
            <EmptyState title="No webhook deliveries" description="Deliveries will appear here when webhook endpoints receive events." />
          ) : deliveries.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {d.status === "success" ? <CheckCircle2 className={`h-4 w-4 ${DELIVERY_COLORS[d.status]}`} /> :
                   d.status === "failed" ? <XCircle className={`h-4 w-4 ${DELIVERY_COLORS[d.status]}`} /> :
                   <Loader2 className={`h-4 w-4 animate-spin ${DELIVERY_COLORS[d.status]}`} />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{d.event}</span>
                      <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatRelativeTime(d.created_at)}</span>
                      {d.response_status && <span>HTTP {d.response_status}</span>}
                      {d.duration_ms != null && <span>{d.duration_ms}ms</span>}
                      {d.retry_count > 0 && <span>Retry #{d.retry_count}</span>}
                    </div>
                    {d.error_message && <p className="mt-1 text-xs text-red-500">{d.error_message}</p>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
