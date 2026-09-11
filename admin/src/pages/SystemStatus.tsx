import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/LoadingState";
import { useDashboardKpis, useAuditEvents, useRealtimeInvalidate } from "@/lib/queries";
import { useServiceStatuses } from "@/lib/monitoring/hooks";
import { storageStats } from "@/lib/monitoring/api";
import { cn } from "@/lib/utils";
import { Activity, Database, FileText, Bot, ShieldCheck, Zap, Clock, RefreshCw, HardDrive } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function SystemStatus() {
  const { data: kpis, isLoading, refetch: refetchKpis } = useDashboardKpis();
  const { data: services } = useServiceStatuses();
  const { data: storage } = useQuery({
    queryKey: ["monitoring", "system-status", "storage"],
    queryFn: () => storageStats(),
    staleTime: 60000,
    retry: 0,
  });
  const { data: events } = useAuditEvents(1000);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  useRealtimeInvalidate(["admin", "system-status"], "audit_events", "*");

  const now = Date.now();
  const last1h = events?.filter((e) => e.created_at && now - new Date(e.created_at).getTime() < 3600000).length ?? 0;
  const last24h = events?.filter((e) => e.created_at && now - new Date(e.created_at).getTime() < 86400000).length ?? 0;
  const activeUsers24h = new Set(
    events?.filter((e) => e.created_at && now - new Date(e.created_at).getTime() < 86400000).map((e) => e.user_id).filter(Boolean)
  ).size;

  const dbRecordCount = (kpis?.userCount ?? 0) + (kpis?.pageCount ?? 0) + (kpis?.auditCount ?? 0) + (kpis?.chatCount ?? 0);

  // Health score is the real average over live service probes. Services that
  // are not configured are excluded rather than counted as healthy.
  const known = (services ?? []).filter((s) => s.status !== "unknown");
  const anyOutage = known.some((s) => s.status === "outage");
  const anyDegraded = known.some((s) => s.status === "degraded");
  const healthScore = known.length > 0
    ? Math.round(known.reduce((sum, s) => sum + (s.status === "operational" ? 100 : s.status === "degraded" ? 75 : 0), 0) / known.length)
    : null;
  const healthLabel = healthScore === null
    ? "Status Unknown"
    : anyOutage ? "Service Outage" : anyDegraded ? "Degraded Performance" : healthScore >= 90 ? "All Systems Operational" : "Issues Detected";

  const components = [
    { name: "Pages", value: kpis?.pageCount ?? 0, unit: " docs", status: "operational", desc: "Workspace documents", icon: FileText, color: "from-emerald-500 to-teal-500" },
    { name: "User Profiles", value: kpis?.userCount ?? 0, unit: " users", status: "operational", desc: "Registered accounts", icon: ShieldCheck, color: "from-blue-500 to-indigo-500" },
    { name: "Audit Events", value: kpis?.auditCount ?? 0, unit: " events", status: "operational", desc: "Tracked actions", icon: Activity, color: "from-violet-500 to-purple-500" },
    { name: "AI Chats", value: kpis?.chatCount ?? 0, unit: " chats", status: "operational", desc: "AI conversations", icon: Bot, color: "from-amber-500 to-orange-500" },
    { name: "Events (1h)", value: last1h, unit: " events", status: last1h > 0 ? "operational" : "idle", desc: "From recent events", icon: Zap, color: "from-pink-500 to-rose-500" },
    { name: "Events (24h)", value: last24h, unit: " events", status: last24h > 0 ? "operational" : "idle", desc: "From recent events", icon: Clock, color: "from-cyan-500 to-blue-500" },
    { name: "Database Size", value: storage ? formatBytes(storage.dbSizeBytes) : "—", unit: "", status: storage ? "operational" : "idle", desc: `${dbRecordCount.toLocaleString()} records`, icon: Database, color: "from-slate-500 to-gray-500" },
    { name: "File Storage", value: storage ? formatBytes(storage.storageBytes) : "—", unit: "", status: storage ? "operational" : "idle", desc: `${storage?.storageObjects ?? 0} objects`, icon: HardDrive, color: "from-teal-500 to-emerald-500" },
  ];

  const handleRefresh = () => {
    refetchKpis();
    setLastRefresh(new Date());
  };

  if (isLoading) return <div className="p-6"><PageHeader title="System Status" description="Platform health and performance metrics" /><LoadingState count={6} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="System Status" description="Platform health and performance metrics">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Last updated: {lastRefresh.toLocaleTimeString()}</span>
          <Button variant="outline" size="sm" onClick={handleRefresh}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
        </div>
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 p-6">
          <div className={cn("flex h-16 w-16 items-center justify-center rounded-full",
            healthScore === null ? "bg-muted" : healthScore >= 90 ? "bg-success/10" : healthScore >= 70 ? "bg-warning/10" : "bg-destructive/10")}>
            <Activity className={cn("h-8 w-8", healthScore === null ? "text-muted-foreground" : healthScore >= 90 ? "text-success" : healthScore >= 70 ? "text-warning" : "text-destructive")} />
          </div>
          <div>
            <p className="text-3xl font-bold">{healthScore === null ? "—" : `${healthScore}%`}</p>
            <p className="text-sm text-muted-foreground">Overall Health Score</p>
          </div>
          <Badge
            variant={healthScore === null ? "secondary" : healthScore >= 90 && !anyDegraded && !anyOutage ? "success" : healthScore >= 70 && !anyOutage ? "warning" : "destructive"}
            className="ml-auto"
          >
            {healthLabel}
          </Badge>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Records</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{dbRecordCount.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Active Users (24h)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeUsers24h}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Events (24h)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{last24h}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">AI Chats</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{kpis?.chatCount ?? 0}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {components.map((comp) => {
          const Icon = comp.icon;
          return (
            <Card key={comp.name}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center", comp.color)}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-sm">{comp.name}</span>
                  </div>
                  <Badge variant={comp.status === "operational" ? "success" : "secondary"} className="text-[9px]">
                    {comp.status === "operational" ? "Operational" : "Idle"}
                  </Badge>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{comp.desc}</span>
                    <span className="font-mono font-medium">
                      {typeof comp.value === "number" ? `${comp.value.toLocaleString()}${comp.unit}` : comp.value}
                    </span>
                  </div>
                  <Progress value={typeof comp.value === "number" && comp.value <= 100 ? comp.value : 100} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
