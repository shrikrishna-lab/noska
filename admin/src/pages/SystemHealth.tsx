import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";

type ServiceStatus = "checking" | "healthy" | "warning" | "offline";

interface Service {
  id: string;
  name: string;
  status: ServiceStatus;
  latency?: string;
  message?: string;
}

async function checkUrl(url: string, timeoutMs = 10000): Promise<{ ok: boolean; latency: string }> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timer);
    const latency = `${(performance.now() - start).toFixed(0)}ms`;
    return { ok: res.ok, latency };
  } catch {
    return { ok: false, latency: "—" };
  }
}

const serviceDefs: Array<{ id: string; name: string; url: string }> = [
  { id: "vercel", name: "Vercel (App Hosting)", url: "https://noska.me" },
  { id: "supabase", name: "Supabase (Database)", url: "https://yxgtmzksnyarlivgxujf.supabase.co" },
  { id: "clerk", name: "Clerk (Authentication)", url: "https://clerk.noska.me" },
  { id: "resend", name: "Resend (Email)", url: "https://api.resend.com" },
  { id: "posthog", name: "PostHog (Analytics)", url: "https://app.posthog.com" },
  { id: "sentry", name: "Sentry (Error Tracking)", url: "https://sentry.io" },
  { id: "trigger", name: "Trigger.dev (Background Jobs)", url: "https://api.trigger.dev" },
  { id: "cloudflare", name: "Cloudflare (DNS/CDN)", url: "https://noska.me" },
];

function ServiceCard({ service }: { service: Service }) {
  const statusIcon = {
    healthy: <CheckCircle className="h-5 w-5 text-green-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    offline: <XCircle className="h-5 w-5 text-red-500" />,
    checking: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
  };

  const statusBadgeVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
    healthy: "success", warning: "warning", offline: "destructive", checking: "secondary",
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
          <span>{service.latency && `Latency: ${service.latency}`}</span>
          <span>{service.message}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SystemHealth() {
  const [services, setServices] = useState<Service[]>(
    serviceDefs.map((d) => ({ ...d, status: "checking" }))
  );
  const [checking, setChecking] = useState(false);

  const checkAll = async () => {
    setChecking(true);
    setServices((prev) => prev.map((s) => ({ ...s, status: "checking" as ServiceStatus })));

    const results = await Promise.all(
      serviceDefs.map(async (def) => {
        const { ok, latency } = await checkUrl(def.url);
        return {
          id: def.id,
          name: def.name,
          status: ok ? ("healthy" as ServiceStatus) : ("offline" as ServiceStatus),
          latency,
          message: ok ? undefined : "Unreachable",
        };
      })
    );

    setServices(results);
    setChecking(false);
  };

  useEffect(() => { checkAll(); }, []);

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const warningCount = services.filter((s) => s.status === "warning").length;
  const offlineCount = services.filter((s) => s.status === "offline").length;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="System Health"
        description="Monitor the status of all production services"
        actions={
          <Button variant="outline" size="sm" onClick={checkAll} disabled={checking}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-green-200">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-green-700">Healthy</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><span className="text-2xl font-bold text-green-600">{healthyCount}</span></CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-amber-700">Warning</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><span className="text-2xl font-bold text-amber-600">{warningCount}</span></CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-red-700">Offline</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><span className="text-2xl font-bold text-red-600">{offlineCount}</span></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((s) => <ServiceCard key={s.id} service={s} />)}
      </div>
    </div>
  );
}
