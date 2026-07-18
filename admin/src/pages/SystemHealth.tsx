import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, AlertCircle } from "lucide-react";
import { adminApi } from "@/lib/admin-api";

interface Service {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "offline";
  latency: number;
}

function ServiceCard({ service }: { service: Service }) {
  const statusIcon = {
    healthy: <CheckCircle className="h-5 w-5 text-green-500" />,
    degraded: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    offline: <XCircle className="h-5 w-5 text-red-500" />,
  };

  const statusBadgeVariant: Record<string, "success" | "warning" | "destructive"> = {
    healthy: "success", degraded: "warning", offline: "destructive",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          {statusIcon[service.status]}
          <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
        </div>
        <Badge variant={statusBadgeVariant[service.status]}>{service.status}</Badge>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{service.latency != null ? `Latency: ${service.latency}ms` : ""}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function deriveId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function SystemHealth() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.monitor.health();
      const mapped: Service[] = (data.services || []).map((s) => ({
        id: deriveId(s.name),
        name: s.name,
        status: s.status as Service["status"],
        latency: s.latency,
      }));
      setServices(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch system health";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const offlineCount = services.filter((s) => s.status === "offline").length;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="System Health"
        description="Monitor the status of all production services"
        actions={
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {!loading && !error && services.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-green-200">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-green-700">Healthy</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><span className="text-2xl font-bold text-green-600">{healthyCount}</span></CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-amber-700">Degraded</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><span className="text-2xl font-bold text-amber-600">{degradedCount}</span></CardContent>
          </Card>
          <Card className="border-red-200">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-red-700">Offline</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><span className="text-2xl font-bold text-red-600">{offlineCount}</span></CardContent>
          </Card>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <Card className="border-red-200">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-red-600">Failed to check system health</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchHealth}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && services.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 p-6">
            <p className="text-sm text-muted-foreground">No services returned from health check.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && services.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((s) => <ServiceCard key={s.id} service={s} />)}
        </div>
      )}
    </div>
  );
}
