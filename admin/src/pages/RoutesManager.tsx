import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAdminRoutes, useUpdateAdminRoute, useRealtimeInvalidate } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { Forbidden } from "@/pages/Forbidden";
import { Search, Route as RouteIcon, Globe, ShieldCheck, Eye, EyeOff, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import type { AdminRoute } from "@/lib/types";

const SECTION_LABELS: Record<string, string> = {
  overview: "Overview", content: "Content", marketing: "Marketing", growth: "Growth",
  people: "People", platform: "Platform", operations: "Operations", monitoring: "Monitoring",
  settings: "Settings", auth: "Auth", legal: "Legal",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", developer: "Developer",
  support: "Support", marketing: "Marketing",
};

function RouteRow({ route, onToggle }: { route: AdminRoute; onToggle: (r: AdminRoute) => void }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggle(route);
      toast.success(`${route.label} ${route.enabled ? "disabled" : "enabled"}`);
    } catch {
      toast.error("Failed to update route");
    }
    setToggling(false);
  };

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${route.enabled ? "" : "bg-muted/40 opacity-70"}`}>
      <Switch checked={route.enabled} onCheckedChange={handleToggle} disabled={toggling} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{route.label}</p>
          <Badge variant="outline" className="text-[10px]">{route.area === "admin" ? "Admin" : "Web"}</Badge>
          {route.min_role && (
            <Badge variant="secondary" className="text-[10px]">
              <ShieldCheck className="mr-0.5 h-2.5 w-2.5" /> {ROLE_LABELS[route.min_role] ?? route.min_role}
            </Badge>
          )}
          {route.section && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {SECTION_LABELS[route.section] ?? route.section}
            </Badge>
          )}
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {route.area === "admin" ? "/control" : ""}{route.path === "/" ? "/" : route.path}
        </p>
        {route.description && <p className="text-[11px] text-muted-foreground mt-0.5">{route.description}</p>}
      </div>
      <a
        href={route.area === "admin" ? `/control${route.path === "/" ? "" : route.path}` : `http://127.0.0.1:5173${route.path === "/" ? "" : route.path}`}
        target="_blank"
        rel="noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

export function RoutesManager() {
  const { user } = useAuth();
  const { data: routes, isLoading } = useAdminRoutes();
  const update = useUpdateAdminRoute();
  const [search, setSearch] = useState("");
  const [area, setArea] = useState<"all" | "admin" | "web">("all");
  useRealtimeInvalidate(["admin", "routes"], "admin_routes");

  const filtered = useMemo(() => {
    if (!routes) return [];
    return routes.filter((r) => {
      if (area !== "all" && r.area !== area) return false;
      const q = search.toLowerCase();
      return !q || r.label.toLowerCase().includes(q) || r.path.toLowerCase().includes(q);
    });
  }, [routes, search, area]);

  const stats = useMemo(() => {
    const all = routes ?? [];
    return {
      total: all.length,
      admin: all.filter((r) => r.area === "admin").length,
      web: all.filter((r) => r.area === "web").length,
      disabled: all.filter((r) => !r.enabled).length,
    };
  }, [routes]);

  if (!hasRole(user, "super_admin")) return <Forbidden />;
  if (isLoading) return <div className="p-6"><PageHeader title="Routes Manager" description="View and manage every route" /><LoadingState count={3} /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Routes Manager" description="View and manage every route in the admin panel and the public web app">
        <Badge variant="outline"><RouteIcon className="mr-1 h-3 w-3" /> {stats.total} routes</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total routes</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.admin}</p><p className="text-xs text-muted-foreground">Admin routes</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.web}</p><p className="text-xs text-muted-foreground">Web routes</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-500">{stats.disabled}</p><p className="text-xs text-muted-foreground">Disabled</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search routes by name or path..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          {(["all", "admin", "web"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${area === a ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {a === "all" ? "All" : a === "admin" ? "Admin" : "Web"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            <Globe className="mx-auto h-10 w-10 mb-2 opacity-30" />
            <p>No routes found</p>
          </CardContent></Card>
        ) : (
          filtered.map((r) => (
            <RouteRow key={r.id} route={r} onToggle={(route) => update.mutateAsync({ id: route.id, enabled: !route.enabled })} />
          ))
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        <span>Disabling a route marks it disabled in the registry. Admin routes are blocked for non-super-admin roles; web routes are blocked for all visitors.</span>
        <EyeOff className="ml-2 h-3.5 w-3.5 text-amber-500" />
        <span>This is enforced at the app-shell level.</span>
      </div>
    </div>
  );
}