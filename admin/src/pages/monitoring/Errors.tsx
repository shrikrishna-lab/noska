import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Globe, Monitor } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { useSentryErrors } from "@/lib/monitoring/hooks";
import { formatNumber } from "@/lib/utils";
import type { SentryError } from "@/lib/monitoring/types";
import type { Column } from "@/components/ui/DataTable";

const LEVEL_BADGE: Record<string, string> = {
  fatal: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  error: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const STATUS_BADGE: Record<string, string> = {
  unresolved: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ignored: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

export function MonitoringErrors() {
  const { data: errors, isLoading, refetch, isRefetching } = useSentryErrors();
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const filtered = levelFilter === "all" ? errors : errors?.filter((e) => e.level === levelFilter);

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Errors" description="Track and triage errors across environments" />
        <LoadingState count={8} />
      </div>
    );
  }

  if (!errors || errors.length === 0) {
    return (
      <div className="p-6">
        <PageHeader
          title="Errors"
          description="Track and triage errors across environments"
          actions={
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />
        <EmptyState title="No errors" description="No errors found in the selected period." />
      </div>
    );
  }

  const levels = ["all", "fatal", "error", "warning", "info"] as const;
  const countsByLevel: Record<string, number> = {};
  errors.forEach((e) => { countsByLevel[e.level] = (countsByLevel[e.level] || 0) + e.count; });

  const columns: Column<SentryError>[] = [
    { key: "title", label: "Error", sortable: true },
    { key: "level", label: "Level", sortable: true, render: (row) => <Badge className={LEVEL_BADGE[row.level]}>{row.level}</Badge> },
    { key: "count", label: "Count", sortable: true },
    { key: "users", label: "Users", sortable: true },
    { key: "environment", label: "Env", sortable: true },
    { key: "lastSeen", label: "Last Seen", sortable: true, render: (row) => <span className="text-xs text-muted-foreground">{new Date(row.lastSeen).toLocaleString()}</span> },
    { key: "status", label: "Status", sortable: true, render: (row) => <Badge className={STATUS_BADGE[row.status]}>{row.status}</Badge> },
    { key: "browser", label: "Browser", render: (row) => <span className="flex items-center gap-1 text-xs"><Globe className="h-3 w-3" /> {row.browser}</span> },
    { key: "device", label: "Device", render: (row) => <span className="flex items-center gap-1 text-xs"><Monitor className="h-3 w-3" /> {row.device}</span> },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Errors"
        description="Track and triage errors across environments"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {levels.map((lv) => {
          const total = lv === "all" ? errors.length : errors.filter((e) => e.level === lv).length;
          const count = lv === "all" ? errors.reduce((s, e) => s + e.count, 0) : (countsByLevel[lv] || 0);
          return (
            <button
              key={lv}
              type="button"
              onClick={() => setLevelFilter(lv)}
              className={`rounded-xl border p-4 text-left transition-colors hover:bg-accent ${levelFilter === lv ? "ring-2 ring-primary" : ""}`}
            >
              <p className="text-xs font-medium uppercase text-muted-foreground">{lv === "all" ? "All" : lv}</p>
              <p className="mt-1 text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">{formatNumber(count)} occurrences</p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filtered ?? []}
            onRowClick={(row) => {
              window.open(`https://sentry.io/organizations/notion-by-me/issues/?query=is:unresolved+${encodeURIComponent(row.title)}`, "_blank");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
