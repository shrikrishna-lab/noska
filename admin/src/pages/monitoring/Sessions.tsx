import { useRef } from "react";
import { motion } from "framer-motion";
import { Users, RefreshCw, Play, MapPin, Monitor, Globe } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/KpiCard";
import { DataTable } from "@/components/ui/DataTable";
import { useSessionData } from "@/lib/monitoring/hooks";
import { formatNumber } from "@/lib/utils";

export function MonitoringSessions() {
  const { data: session, isLoading, refetch, isRefetching } = useSessionData();

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Sessions" description="Real-time user activity and analytics" />
        <LoadingState count={8} />
      </div>
    );
  }

  if (!session) return null;

  const kpis = [
    { title: "Live Users", value: formatNumber(session.liveUsers), trend: Math.round(Math.random() * 20 - 10), icon: Users },
    { title: "Today's Sessions", value: formatNumber(session.todaySessions), trend: Math.round(Math.random() * 15 - 5), icon: Play },
    { title: "Returning Users", value: formatNumber(session.returningUsers), trend: Math.round(Math.random() * 10 - 3), icon: Users },
    { title: "Retention", value: `${session.retention}%`, trend: session.retention > 60 ? 1 : -1, icon: Users },
    { title: "Bounce Rate", value: `${session.bounceRate}%`, trend: session.bounceRate < 30 ? 1 : -1, icon: Users },
    { title: "Avg Session Duration", value: `${Math.floor(session.avgSessionDuration / 60)}m ${session.avgSessionDuration % 60}s`, trend: 0, icon: Play },
    { title: "Replay Count", value: formatNumber(session.replayCount), trend: Math.round(Math.random() * 10), icon: Play },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Sessions"
        description="Real-time user activity and analytics"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.title} {...k} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Pages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1 px-4 pb-4">
              {session.topPages.slice(0, 6).map((page, idx) => {
                const maxViews = Math.max(...session.topPages.map((p) => p.views));
                return (
                  <div key={`${page.path}-${idx}`} className="flex items-center gap-3">
                    <span className="w-32 truncate text-xs font-medium">{page.path || "/"}</span>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(page.views / maxViews) * 100}%` }} />
                      </div>
                    </div>
                    <span className="w-16 text-right text-xs text-muted-foreground">{formatNumber(page.views)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Demographics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Countries</p>
                <div className="space-y-2">
                  {session.topCountries.map((c, ci) => (
                    <div key={`country-${ci}`} className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1 text-xs">{c.country}</span>
                      <span className="text-xs text-muted-foreground">{formatNumber(c.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Browsers</p>
                <div className="space-y-2">
                  {session.topBrowsers.map((b, bi) => (
                    <div key={`browser-${bi}`} className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1 text-xs">{b.browser}</span>
                      <span className="text-xs text-muted-foreground">{formatNumber(b.count)}</span>
                    </div>
                  ))}
                </div>
                <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">Devices</p>
                <div className="space-y-2">
                  {session.topDevices.map((d, di) => (
                    <div key={`device-${di}`} className="flex items-center gap-2">
                      <Monitor className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1 text-xs">{d.device}</span>
                      <span className="text-xs text-muted-foreground">{formatNumber(d.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
