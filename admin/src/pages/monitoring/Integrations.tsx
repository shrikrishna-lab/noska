import { motion } from "framer-motion";
import { Puzzle, RefreshCw, ExternalLink, Clock, AlertTriangle, Link2, Unplug } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { useConnectorStats, useIntegrationStatuses } from "@/lib/monitoring/hooks";

export function MonitoringIntegrations() {
  const { data: integrations, isLoading, refetch, isRefetching } = useIntegrationStatuses();
  const { data: connectorStats } = useConnectorStats();

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Integrations" description="Connected services and API configurations" />
        <LoadingState count={6} />
      </div>
    );
  }

  if (!integrations) return null;

  return (
    <div className="p-6">
      <PageHeader
        title="Integrations"
        description="Connected services and API configurations"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration, i) => (
          <motion.div
            key={integration.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/30">
                    <BrandIcon name={integration.name} className="h-5 w-5" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                        integration.configured ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                  </div>
                  <CardTitle className="text-sm font-medium">{integration.name}</CardTitle>
                </div>
                <Badge variant={integration.configured ? "secondary" : "destructive"}>
                  {integration.configured ? "Configured" : "Not Configured"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/30 px-3 py-2">
                    <span className="text-muted-foreground">Environment</span>
                    <p className="font-medium">{integration.environment}</p>
                  </div>
                  <div className="rounded-md bg-muted/30 px-3 py-2">
                    <span className="text-muted-foreground">Last Sync</span>
                    <p className="font-medium">
                      {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
                {integration.lastError && (
                  <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {integration.lastError}
                  </div>
                )}
                <a
                  href={integration.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Open dashboard <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-muted-foreground">
        App Connectors ({connectorStats?.stats.length ?? 0})
      </h2>
      {!connectorStats ? (
        <LoadingState count={4} />
      ) : !connectorStats.available ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
            Live connector stats need the admin_select allowlist migration
            (20260912000000_add_connector_tables_to_admin_select.sql) applied to the database.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {connectorStats.stats.map((connector, i) => (
            <motion.div
              key={connector.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card>
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/30">
                      <BrandIcon name={connector.name} className="h-5 w-5" />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                          connector.activeConnections > 0 ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{connector.name}</CardTitle>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{connector.category}</p>
                    </div>
                  </div>
                  <Badge variant={connector.activeConnections > 0 ? "secondary" : "outline"}>
                    {connector.activeConnections > 0 ? "In Use" : "No Connections"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Active</span>
                        <p className="font-medium">{connector.activeConnections}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2">
                      <Unplug className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Total (incl. revoked)</span>
                        <p className="font-medium">{connector.totalConnections}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Last connected:{" "}
                      {connector.lastConnectedAt ? new Date(connector.lastConnectedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
