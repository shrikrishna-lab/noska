import { useState } from "react";
import { motion } from "framer-motion";
import { ScrollText, RefreshCw, Search, Filter, Terminal, AlertCircle, Info, AlertTriangle, Bug, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLogEntries } from "@/lib/monitoring/hooks";
import type { LogEntry } from "@/lib/monitoring/types";

const LEVEL_ICON: Record<string, typeof AlertCircle> = {
  error: XCircle,
  warn: AlertTriangle,
  info: Info,
  debug: Bug,
};

const LEVEL_BADGE: Record<string, string> = {
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  debug: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

// Only sources that actually exist: audit trail and Resend email delivery.
const SOURCES = ["all", "audit", "email"];
const LEVELS = ["all", "info", "error"];

export function MonitoringLogs() {
  const [level, setLevel] = useState("all");
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const { data: logs, isLoading, refetch, isRefetching } = useLogEntries({ level, source, search: search || undefined });

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Logs" description="Platform audit trail and email delivery logs" />
        <LoadingState count={10} />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="p-6">
        <PageHeader
          title="Logs"
          description="Platform audit trail and email delivery logs"
          actions={
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />
        <EmptyState title="No logs" description="No log entries match your filters." />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Logs"
        description="Platform audit trail and email delivery logs"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${level === l ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-l pl-3">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            {SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${source === s ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 rounded-md border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1">
        {logs.map((entry, i) => {
          const LevelIcon = LEVEL_ICON[entry.level];
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.01, 0.3) }}
              className={`flex items-start gap-3 rounded-lg border bg-card px-4 py-2.5 transition-colors hover:bg-accent/50 ${entry.level === "error" ? "border-red-200 dark:border-red-900" : entry.level === "warn" ? "border-yellow-200 dark:border-yellow-900" : ""}`}
            >
              <LevelIcon className={`mt-0.5 h-4 w-4 shrink-0 ${entry.level === "error" ? "text-red-500" : entry.level === "warn" ? "text-yellow-500" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className={LEVEL_BADGE[entry.level]}>{entry.level}</Badge>
                  <span className="text-xs text-muted-foreground">{entry.source.replace("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="mt-1 text-sm">{entry.message}</p>
                {entry.detail && <p className="mt-0.5 text-xs text-muted-foreground">{entry.detail}</p>}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Showing {logs.length} entries (auto-refreshes every 15s)
      </p>
    </div>
  );
}
