import { motion } from "framer-motion";
import { Shield, Users, Building2, FileText, Bot, AlertTriangle, Mail, Eye, HardDrive, Database, Radio, Globe, Activity, ExternalLink } from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOverviewMetrics } from "@/lib/monitoring/hooks";
import { formatNumber } from "@/lib/utils";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const STATUS_COLOR: Record<string, string> = {
  healthy: "bg-green-500",
  degraded: "bg-yellow-500",
  critical: "bg-red-500",
  operational: "bg-green-500",
  outage: "bg-red-500",
  unknown: "bg-gray-400",
  connected: "bg-green-500",
  disconnected: "bg-red-500",
  error: "bg-red-500",
};

const STATUS_TEXT: Record<string, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  critical: "Critical",
  operational: "Operational",
  outage: "Outage",
  unknown: "Unknown",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};

export function MonitoringOverview() {
  const { data: metrics, isLoading } = useOverviewMetrics();

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Overview" description="Operations center — system health and key metrics" />
        <LoadingState count={12} />
      </div>
    );
  }

  if (!metrics) return null;

  const kpis = [
    { title: "Users Online", value: formatNumber(metrics.usersOnline), icon: Users },
    { title: "Today's Users", value: formatNumber(metrics.todayUsers), icon: Users },
    { title: "Workspaces", value: formatNumber(metrics.workspaces), icon: Building2 },
    { title: "Pages", value: formatNumber(metrics.pages), icon: FileText },
    { title: "AI Requests", value: formatNumber(metrics.aiRequests), icon: Bot },
    { title: "Errors Today", value: formatNumber(metrics.errorsToday), icon: AlertTriangle },
    { title: "Emails Delivered", value: formatNumber(metrics.emailsDelivered), icon: Mail },
    { title: "Pageviews (24h)", value: formatNumber(metrics.pageviews24h), icon: Eye },
    { title: "Storage Used", value: metrics.storageUsed, icon: HardDrive },
  ];

  const services: Array<{ label: string; status: string; icon: typeof Activity }> = [
    { label: "Supabase", status: metrics.supabaseStatus, icon: Database },
    { label: "Clerk", status: metrics.clerkStatus, icon: Shield },
    { label: "Resend", status: metrics.resendStatus, icon: Mail },
    { label: "Sentry", status: metrics.sentryStatus, icon: AlertTriangle },
    { label: "PostHog", status: metrics.posthogStatus, icon: Activity },
    { label: "Realtime", status: metrics.realtimeStatus, icon: Radio },
    { label: "Database", status: metrics.databaseStatus, icon: Database },
    { label: "System", status: metrics.systemStatus, icon: Globe },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Operations Center"
        description="System health and key metrics at a glance"
        actions={
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <Activity className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="mb-6 flex items-center gap-3 rounded-xl border bg-card p-4">
        <div className={`h-3 w-3 rounded-full ${STATUS_COLOR[metrics.systemStatus]}`} />
        <span className="text-sm font-semibold">System {STATUS_TEXT[metrics.systemStatus]}</span>
        <span className="text-xs text-muted-foreground">v{metrics.currentVersion} · {metrics.environment}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          Auto-refreshing every 30s
        </Badge>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <motion.div key={kpi.title} variants={itemAnim}>
            <KpiCard {...kpi} />
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Critical", value: metrics.errorsCritical, color: "text-red-500" },
                { label: "High", value: metrics.errorsHigh, color: "text-orange-500" },
                { label: "Medium", value: metrics.errorsMedium, color: "text-yellow-500" },
                { label: "Low", value: metrics.errorsLow, color: "text-blue-500" },
              ].map((err) => (
                <div key={err.label} className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className={`text-2xl font-bold ${err.color}`}>{err.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{err.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">External Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {services.map((svc) => (
                <div key={svc.label} className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                  <svc.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">{svc.label}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[svc.status]}`} />
                      <span className="text-[10px] text-muted-foreground">{STATUS_TEXT[svc.status]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Open Sentry", href: "https://sentry.io" },
              { label: "Open PostHog", href: "https://app.posthog.com" },
              { label: "Open Vercel", href: "https://vercel.com" },
              { label: "Open Clerk", href: "https://dashboard.clerk.com" },
              { label: "Open Supabase", href: "https://supabase.com/dashboard" },
              { label: "Open Resend", href: "https://resend.com" },
            ].map((action) => (
              <a key={action.label} href={action.href} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  {action.label}
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
