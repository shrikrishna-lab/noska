import { useState } from "react";
import { motion } from "framer-motion";
import { Gauge, RefreshCw, Zap, Cpu, Globe, Activity, Database, Radio, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePerformanceMetrics, usePerformanceHistory } from "@/lib/monitoring/hooks";
import { formatNumber } from "@/lib/utils";

export function MonitoringPerformance() {
  const { data: metrics, isLoading, refetch, isRefetching } = usePerformanceMetrics();
  const [range, setRange] = useState<"1h" | "24h" | "7d">("24h");
  const { data: history } = usePerformanceHistory(range);

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Performance" description="Web vitals, API latency, and resource usage" />
        <LoadingState count={8} />
      </div>
    );
  }

  if (!metrics) return null;

  const vitals = [
    { title: "LCP", value: `${(metrics.lcp / 1000).toFixed(1)}s`, trend: metrics.lcp > 2500 ? -1 : 1, icon: Gauge },
    { title: "FCP", value: `${(metrics.fcp / 1000).toFixed(1)}s`, trend: metrics.fcp > 1800 ? -1 : 1, icon: Gauge },
    { title: "CLS", value: metrics.cls.toFixed(2), trend: metrics.cls > 0.1 ? -1 : 1, icon: Zap },
    { title: "INP", value: `${metrics.inp}ms`, trend: metrics.inp > 200 ? -1 : 1, icon: Activity },
    { title: "TTFB", value: `${metrics.ttfb}ms`, trend: metrics.ttfb > 600 ? -1 : 1, icon: Globe },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Performance"
        description="Web vitals, API latency, and resource usage"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-md border">
              {(["1h", "24h", "7d"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${range === r ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {vitals.map((v) => (
          <KpiCard key={v.title} {...v} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">API & Database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Avg API Response</p>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </div>
              </div>
              <span className="text-lg font-bold">{metrics.avgApiTime}ms</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Avg DB Query</p>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </div>
              </div>
              <span className="text-lg font-bold">{metrics.avgDbQuery}ms</span>
            </div>
            {metrics.slowQueries > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-xs text-yellow-700 dark:text-yellow-300">
                  {metrics.slowQueries} slow queries detected
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Resource Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" /> Memory
                </span>
                <span>{metrics.memoryUsage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${metrics.memoryUsage > 80 ? "bg-red-500" : metrics.memoryUsage > 60 ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${metrics.memoryUsage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" /> CPU
                </span>
                <span>{metrics.cpuUsage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${metrics.cpuUsage > 80 ? "bg-red-500" : metrics.cpuUsage > 60 ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${metrics.cpuUsage}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <Radio className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Realtime Connections</p>
                </div>
              </div>
              <span className="text-lg font-bold">{metrics.realtimeConnections}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bundles & Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Largest Bundle</p>
              <p className="text-sm font-medium">{metrics.largestBundle}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 rounded-lg border bg-muted/20 p-3 text-center">
                <p className="text-lg font-bold text-yellow-600">{metrics.slowPages}</p>
                <p className="text-xs text-muted-foreground">Slow Pages</p>
              </div>
              <div className="flex-1 rounded-lg border bg-muted/20 p-3 text-center">
                <p className="text-lg font-bold text-orange-600">{metrics.slowQueries}</p>
                <p className="text-xs text-muted-foreground">Slow Queries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {history && history.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              API Response Time ({range === "1h" ? "Past Hour" : range === "24h" ? "Past 24 Hours" : "Past 7 Days"})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-48">
              <svg viewBox={`0 0 ${history.length} 100`} className="h-full w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="perfGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path
                  d={`M0,${100 - (history[0].value / 800) * 100} ${history.map((p, i) => `L${i},${100 - (p.value / 800) * 100}`).join(" ")}`}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
                <path
                  d={`M0,${100 - (history[0].value / 800) * 100} ${history.map((p, i) => `L${i},${100 - (p.value / 800) * 100}`).join(" ")} L${history.length - 1},100 L0,100 Z`}
                  fill="url(#perfGrad)"
                />
              </svg>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
