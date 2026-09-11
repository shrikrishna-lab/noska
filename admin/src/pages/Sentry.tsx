import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSentryErrors } from "@/lib/monitoring/hooks";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { SentryError } from "@/lib/monitoring/types";

const LEVEL_BADGE: Record<string, string> = {
  fatal: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  error: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const columns: Column<SentryError>[] = [
  { key: "title", label: "Error", sortable: true },
  { key: "level", label: "Level", sortable: true, render: (row) => <Badge className={LEVEL_BADGE[row.level]}>{row.level}</Badge> },
  { key: "count", label: "Events", sortable: true },
  { key: "users", label: "Users", sortable: true },
  { key: "release", label: "Release", sortable: true, className: "hidden md:table-cell" },
  { key: "lastSeen", label: "Last Seen", sortable: true, render: (row) => <span className="text-xs text-muted-foreground">{new Date(row.lastSeen).toLocaleString()}</span> },
];

export function Sentry() {
  const { data: issues, isLoading, isError, error, refetch, isRefetching } = useSentryErrors();

  if (isLoading) return <div className="p-6"><PageHeader title="Error Monitoring" description="Application error tracking" /><LoadingState count={4} /></div>;

  if (isError) {
    const notConfigured = error instanceof Error && error.message === "SERVICE_NOT_CONFIGURED";
    return (
      <div className="p-6">
        <PageHeader
          title="Error Monitoring"
          description="Application error tracking"
          actions={
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-6 text-center dark:border-yellow-700 dark:bg-yellow-900/20">
          <AlertTriangle className="mx-auto h-8 w-8 text-yellow-600" />
          <h3 className="mt-2 text-sm font-semibold">{notConfigured ? "Sentry is not configured" : "Sentry unavailable"}</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {notConfigured
              ? "Set SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT on the monitoring-sentry edge function to see real error data here."
              : `Could not load errors from Sentry (${(error instanceof Error ? error.message : "unknown error").slice(0, 160)}).`}
          </p>
        </div>
      </div>
    );
  }

  // All figures below come straight from Sentry issues in the last 24h.
  const totalEvents = (issues ?? []).reduce((s, i) => s + i.count, 0);
  const unresolved = (issues ?? []).filter((i) => i.status === "unresolved").length;
  const fatalCount = (issues ?? []).filter((i) => i.level === "fatal" || i.level === "error").reduce((s, i) => s + i.count, 0);
  const topIssues = [...(issues ?? [])].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="p-6">
      <PageHeader
        title="Error Monitoring"
        description="Track and investigate application errors"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Open Issues</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{issues?.length ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Events (24h)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatNumber(totalEvents)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Unresolved</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{unresolved}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Error + Fatal Events</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-500">{formatNumber(fatalCount)}</p></CardContent>
        </Card>
      </div>

      {topIssues.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm font-medium">Top Error Types</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="min-w-0 truncate text-sm">{issue.title}</span>
                  <span className="ml-3 shrink-0 text-sm font-medium">{formatNumber(issue.count)} events</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {issues && issues.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Issues (last 24h)</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={issues}
              onRowClick={(row) => {
                if (row.permalink) window.open(row.permalink, "_blank");
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-emerald-500 opacity-50" />
            <p className="text-sm font-medium text-emerald-600">No errors recorded</p>
            <p className="text-xs text-muted-foreground mt-1">Sentry reported no issues in the last 24 hours.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
