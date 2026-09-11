import { motion } from "framer-motion";
import { Rocket, RefreshCw, GitBranch, GitCommit, Clock, RotateCcw, CheckCircle, Loader2, XCircle, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeployments } from "@/lib/monitoring/hooks";

const STATUS_ICON: Record<string, typeof CheckCircle> = {
  ready: CheckCircle,
  building: Loader2,
  error: XCircle,
  canceled: XCircle,
  unknown: HelpCircle,
};

const STATUS_BADGE: Record<string, string> = {
  ready: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  building: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  canceled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  unknown: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export function MonitoringDeployments() {
  const { data: deployments, isLoading, refetch, isRefetching } = useDeployments();

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Deployments" description="Track production and preview deployments" />
        <LoadingState count={5} />
      </div>
    );
  }

  if (!deployments || deployments.length === 0) {
    return (
      <div className="p-6">
        <PageHeader
          title="Deployments"
          description="Track production and preview deployments"
          actions={
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />
        <EmptyState title="No deployments" description="No deployments found." />
      </div>
    );
  }

  const latest = deployments[0];

  return (
    <div className="p-6">
      <PageHeader
        title="Deployments"
        description="Track production and preview deployments"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {latest && (
        <Card className="mb-6 border-l-4 border-l-green-500">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-semibold">Latest deployment {latest.status === "ready" ? "succeeded" : latest.status}</p>
                <p className="text-xs text-muted-foreground">
                  {latest.branch}@{latest.commitSha} · v{latest.version} · {new Date(latest.deployedAt).toLocaleString()}
                </p>
              </div>
            </div>
            {latest.rollbackAvailable && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Rollback available
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Deployment History ({deployments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {deployments.map((dep, i) => {
              const StatusIcon = STATUS_ICON[dep.status];
              return (
                <div key={dep.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30">
                  <StatusIcon className={`h-5 w-5 ${dep.status === "ready" ? "text-green-500" : dep.status === "building" ? "animate-spin text-blue-500" : "text-red-500"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{dep.name}</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{dep.commitSha || dep.version}</code>
                      <Badge className={STATUS_BADGE[dep.status]}>{dep.status}</Badge>
                    </div>
                    {dep.commitMessage && (
                      <p className="mt-0.5 max-w-xl truncate text-xs text-foreground/80">{dep.commitMessage}</p>
                    )}
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" /> {dep.branch}
                      </span>
                      {dep.author && <span>by {dep.author}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(dep.deployedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
