import { useState } from "react";
import { Gauge, RefreshCw, Zap, Globe, Activity, Database, Eye, Radio, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePerformanceMetrics, usePerformanceHistory } from "@/lib/monitoring/hooks";
import { formatNumber } from "@/lib/utils";

export function MonitoringPerformance() {
  const { data: metrics, isLoading, refetch, isRefetching } = usePerformanceMetrics();
  const [range, setRange] = useState<"1h" | "24h" | "7d">("24h");
  const { data: history } = usePerformanceHistory(range);

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Performance" description="Core Web Vitals and app activity (p75, last 24h)" />
        <LoadingState count={8} />
      </div>
    );
  }

  if (!metrics) return null;

  const vitals = [
    { title: "LCP", value: `${(metrics.lcp / 1000).toFixed(1)}s`, icon: Gauge },
    { title: "FCP", value: `${(metrics.fcp / 1000).toFixed(1)}s`, icon: Gauge },
    { title: "CLS", value: metrics.cls.toFixed(2), icon: Zap },
    { title: "INP", value: `${metrics.inp}ms`, icon: Activity },
    { title: "TTFB", value: `${metrics.ttfb}ms`, icon: Globe },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Performance"
        description={`Core Web Vitals from PostHog (p75, ${formatNumber(metrics.vitalsSamples)} samples, last 24h)`}
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
            <CardTitle className="text-sm font-medium">Traffic (PostHog, 24h)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Pageviews</p>
                  <p className="text-xs text-muted-foreground">Top pages total, last 24 hours</p>
                </div>
              </div>
              <span className="text-lg font-bold">{formatNumber(metrics.pageviews24h)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <Radio className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Active Sessions</p>
                  <p className="text-xs text-muted-foreground">Collaboration activity, last 5 min</p>
                </div>
              </div>
              <span className="text-lg font-bold">{metrics.realtimeConnections}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Editor Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Page Versions Saved</p>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </div>
              </div>
              <span className="text-lg font-bold">{formatNumber(metrics.pageVersions24h)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Largest Page Snapshot</p>
                  <p className="text-xs text-muted-foreground">Recent stored versions</p>
                </div>
              </div>
              <span className="text-lg font-bold">{metrics.largestSnapshot}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Activity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {history && history.length > 1 ? (
              <div className="relative h-40">
                <svg viewBox={`0 0 ${history.length} 100`} className="h-full w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="perfGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M0,${100 - (history[0].value / Math.max(...history.map((p) => p.value))) * 100} ${history.map((p, i) => `L${i},${100 - (p.value / Math.max(...history.map((q) => q.value))) * 100}`).join(" ")}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  <path
                    d={`M0,${100 - (history[0].value / Math.max(...history.map((p) => p.value))) * 100} ${history.map((p, i) => `L${i},${100 - (p.value / Math.max(...history.map((q) => q.value))) * 100}`).join(" ")} L${history.length - 1},100 L0,100 Z`}
                    fill="url(#perfGrad)"
                  />
                </svg>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No activity recorded in this range yet.</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Page version saves — {range === "1h" ? "past hour" : range === "24h" ? "past 24 hours" : "past 7 days"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
