import { motion } from "framer-motion";
import { Server, RefreshCw, Activity, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useServiceStatuses } from "@/lib/monitoring/hooks";

const STATUS_COLOR: Record<string, string> = {
  operational: "bg-green-500",
  degraded: "bg-yellow-500",
  outage: "bg-red-500",
  unknown: "bg-gray-400",
};

const STATUS_TEXT: Record<string, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Outage",
  unknown: "Unknown",
};

export function MonitoringInfrastructure() {
  const { data: services, isLoading, refetch, isRefetching } = useServiceStatuses();

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Infrastructure" description="Service health, latency, and uptime monitoring" />
        <LoadingState count={6} />
      </div>
    );
  }

  if (!services) return null;

  return (
    <div className="p-6">
      <PageHeader
        title="Infrastructure"
        description="Service health, latency, and uptime monitoring"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {services.map((svc, i) => (
          <motion.div
            key={svc.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={`border-l-4 ${svc.status === "operational" ? "border-l-green-500" : svc.status === "degraded" ? "border-l-yellow-500" : "border-l-red-500"}`}>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${STATUS_COLOR[svc.status]}`} />
                  <CardTitle className="text-sm font-medium">{svc.name}</CardTitle>
                </div>
                <Badge variant={svc.status === "operational" ? "secondary" : "destructive"}>
                  {STATUS_TEXT[svc.status]}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Latency</p>
                      <p className="text-sm font-medium">{svc.latency}ms</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Health</p>
                      <p className="text-sm font-medium">{svc.health}%</p>
                    </div>
                  </div>
                </div>
                {svc.version && (
                  <p className="mt-2 text-xs text-muted-foreground">Version: {svc.version}</p>
                )}
                {svc.lastIncident && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-3 w-3" />
                    Last incident: {svc.lastIncident}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">External Dashboards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Vercel Status", href: "https://www.vercel-status.com" },
              { label: "Supabase Status", href: "https://status.supabase.com" },
              { label: "Clerk Status", href: "https://www.clerkstatus.com" },
              { label: "Resend Status", href: "https://resend.com/status" },
            ].map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  {link.label} <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
