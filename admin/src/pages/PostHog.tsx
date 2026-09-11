import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { IntegrationErrorNotice } from "@/components/ui/IntegrationErrorNotice";
import { RefreshCw, Users, Activity, Clock, TrendingUp, Globe, Monitor } from "lucide-react";
import { posthog } from "@/lib/monitoring/api";
import { formatNumber } from "@/lib/utils";

interface PostHogData {
  liveUsers: number;
  todaySessions: number;
  pageviews24h: number;
  avgSessionDuration: number;
  bounceRate: number;
  returningUsers: number;
  topPages: Array<{ path: string; views: number }>;
  topCountries: Array<{ country: string; count: number }>;
  topBrowsers: Array<{ browser: string; count: number }>;
}

export function PostHog() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["monitoring", "posthog-page"],
    queryFn: async (): Promise<PostHogData> => {
      // liveUsers is the connectivity probe — if PostHog is unreachable or
      // unconfigured, the page shows a real error state instead of zeros.
      const live = await posthog.liveUsers();
      const out: PostHogData = {
        liveUsers: live.liveUsers,
        todaySessions: 0, pageviews24h: 0, avgSessionDuration: 0, bounceRate: 0, returningUsers: 0,
        topPages: [], topCountries: [], topBrowsers: [],
      };
      const [sessions] = await Promise.allSettled([
        posthog.sessionAnalytics(),
      ]);
      if (sessions.status === "fulfilled") {
        const s = sessions.value;
        out.todaySessions = s.todaySessions;
        out.avgSessionDuration = s.avgSessionDuration;
        out.bounceRate = s.bounceRate;
        out.returningUsers = s.returningUsers;
        out.topPages = s.topPages ?? [];
        out.topCountries = s.topCountries ?? [];
        out.topBrowsers = s.topBrowsers ?? [];
        out.pageviews24h = (s.topPages ?? []).reduce((sum, p) => sum + p.views, 0);
      }
      return out;
    },
    refetchInterval: 30000,
    staleTime: 15000,
    retry: 1,
  });

  if (isLoading) return <div className="p-6"><PageHeader title="Product Analytics" description="User behavior and engagement" /><LoadingState count={4} /></div>;

  if (isError) {
    return (
      <div className="p-6">
        <PageHeader
          title="Product Analytics"
          description="User behavior and engagement metrics"
          actions={
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />
        <IntegrationErrorNotice
          service="PostHog"
          error={error}
          notConfiguredHint="Set POSTHOG_PERSONAL_TOKEN (with the query:read scope) and POSTHOG_PROJECT_ID on the monitoring-posthog edge function to see real product analytics here."
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      </div>
    );
  }

  const stats = [
    { title: "Live Users", value: formatNumber(data?.liveUsers ?? 0), icon: Users, color: "text-blue-500" },
    { title: "Sessions Today", value: formatNumber(data?.todaySessions ?? 0), icon: Activity, color: "text-violet-500" },
    { title: "Pageviews (top pages)", value: formatNumber(data?.pageviews24h ?? 0), icon: TrendingUp, color: "text-emerald-500" },
    { title: "Avg Session Duration", value: data ? `${Math.floor(data.avgSessionDuration / 60)}m ${data.avgSessionDuration % 60}s` : "—", icon: Clock, color: "text-amber-500" },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Product Analytics"
        description="User behavior and engagement metrics"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {stats.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /><p className="text-2xl font-bold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm font-medium">Top Pages</CardTitle></CardHeader>
        <CardContent>
          {data && data.topPages.length > 0 ? (
            <div className="space-y-2">
              {data.topPages.map(({ path, views }) => {
                const maxViews = data.topPages[0]?.views ?? 1;
                return (
                  <div key={path} className="flex items-center gap-3 rounded-lg border p-3">
                    <span className="text-sm font-medium min-w-[140px] truncate font-mono">{path}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full" style={{ width: `${(views / maxViews) * 100}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground font-mono min-w-[60px] text-right">{formatNumber(views)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No pageviews recorded" description="Traffic will appear once PostHog receives events from the app." icon={Activity} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Globe className="h-4 w-4" />Top Countries</CardTitle></CardHeader>
          <CardContent>
            {data && data.topCountries.length > 0 ? (
              <div className="space-y-2">
                {data.topCountries.slice(0, 8).map(({ country, count }) => (
                  <div key={country} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span>{country}</span>
                    <span className="font-mono text-muted-foreground">{formatNumber(count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No country data yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Monitor className="h-4 w-4" />Top Browsers</CardTitle></CardHeader>
          <CardContent>
            {data && data.topBrowsers.length > 0 ? (
              <div className="space-y-2">
                {data.topBrowsers.slice(0, 8).map(({ browser, count }) => (
                  <div key={browser} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span>{browser}</span>
                    <span className="font-mono text-muted-foreground">{formatNumber(count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No browser data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
