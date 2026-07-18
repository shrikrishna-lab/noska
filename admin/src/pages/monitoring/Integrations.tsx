import { motion } from "framer-motion";
import { Puzzle, RefreshCw, CheckCircle, XCircle, ExternalLink, Clock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIntegrationStatuses } from "@/lib/monitoring/hooks";

export function MonitoringIntegrations() {
  const { data: integrations, isLoading, refetch, isRefetching } = useIntegrationStatuses();

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
                  {integration.configured ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
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
    </div>
  );
}
