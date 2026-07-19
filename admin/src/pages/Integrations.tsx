import { useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIntegrations, useSyncIntegration, useDisconnectIntegration, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Integration } from "@/lib/types";
import { Plug, RefreshCw, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";

const statusColors: Record<string, "success" | "destructive" | "warning"> = {
  connected: "success", disconnected: "destructive", error: "warning",
};

export function Integrations() {
  const { confirm } = useConfirmDialog();
  const { data: integrations, isLoading } = useIntegrations();
  const syncMut = useSyncIntegration();
  const disconnectMut = useDisconnectIntegration();
  useRealtimeInvalidate(["admin", "integrations"], "integrations");

  const handleSync = useCallback(async (int: Integration) => {
    try {
      await syncMut.mutateAsync(int.id);
      toast.success(`${int.name} synced successfully`);
    } catch {
      toast.error(`Failed to sync ${int.name}`);
    }
  }, [syncMut]);

  const handleDisconnect = useCallback(async (int: Integration) => {
    if (!await confirm({ title: "Disconnect Integration", description: `Disconnect "${int.name}"? The integration will stop syncing and may lose data.`, confirmText: "Disconnect", destructive: true })) return;
    try {
      await disconnectMut.mutateAsync(int.id);
      toast.success(`${int.name} disconnected`);
    } catch {
      toast.error(`Failed to disconnect ${int.name}`);
    }
  }, [disconnectMut]);

  if (isLoading) return <div className="p-6"><PageHeader title="Integrations" description="Manage third-party integrations" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Integrations" description="Manage third-party integrations" />
      {integrations && integrations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((int: Integration) => {
            const syncing = syncMut.isPending && syncMut.variables === int.id;
            const disconnecting = disconnectMut.isPending && disconnectMut.variables === int.id;
            return (
              <Card key={int.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5">
                        <Plug className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{int.name}</p>
                        <p className="text-xs text-muted-foreground">{int.description}</p>
                      </div>
                    </div>
                    <Badge variant={statusColors[int.status] ?? "secondary"}>{int.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last sync: {int.last_sync_at ? formatRelativeTime(int.last_sync_at) : "Never"}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={syncing || disconnecting} onClick={() => handleSync(int)}>
                        {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={syncing || disconnecting} onClick={() => handleDisconnect(int)}>
                        {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No integrations" description="Integrations will appear here once configured." />
      )}
    </div>
  );
}