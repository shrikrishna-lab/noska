import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWidgetOverview, type WidgetCatalogRow, type WidgetPerWidget7d } from "@/lib/widgets";
import { formatRelativeTime } from "@/lib/utils";

const STATUS_BADGE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  enabled: "success",
  beta: "warning",
  disabled: "destructive",
};

// Animated preview tile — a live miniature of each widget family so admins
// can see the vibe of a widget without opening its detail page.
const CATEGORY_PREVIEW: Record<string, { gradient: string; glyph: string }> = {
  productivity: { gradient: "from-violet-500 to-indigo-500", glyph: "✓" },
  ai: { gradient: "from-fuchsia-500 to-purple-600", glyph: "✦" },
  workspace: { gradient: "from-sky-500 to-blue-600", glyph: "▦" },
  project: { gradient: "from-emerald-500 to-teal-600", glyph: "◉" },
  notifications: { gradient: "from-amber-500 to-orange-600", glyph: "!" },
  integrations: { gradient: "from-cyan-500 to-sky-600", glyph: "⇄" },
  system: { gradient: "from-zinc-500 to-slate-600", glyph: "⚙" },
  gamified: { gradient: "from-orange-500 via-rose-500 to-violet-500", glyph: "🔥" },
};

function WidgetPreviewTile({ category }: { category: string }) {
  const meta = CATEGORY_PREVIEW[category] ?? { gradient: "from-zinc-500 to-slate-600", glyph: "▦" };
  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{ x: ["-120%", "140%"] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.4 }}
      />
      <div className="absolute inset-0 grid place-items-center text-base font-bold text-white drop-shadow">
        {meta.glyph}
      </div>
      <motion.span
        className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-white/90"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  productivity: "Productivity",
  ai: "AI",
  workspace: "Workspace",
  project: "Projects",
  notifications: "Notifications",
  integrations: "Integrations",
  system: "System",
  gamified: "Gamified",
};

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function Widgets() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useWidgetOverview();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const perWidget = useMemo(
    () => new Map<string, WidgetPerWidget7d>((data?.per_widget_7d ?? []).map((w: WidgetPerWidget7d) => [w.widget_id, w])),
    [data],
  );

  const filtered = useMemo(() => {
    const rows = data?.catalog ?? [];
    const q = query.trim().toLowerCase();
    return rows.filter((row: WidgetCatalogRow) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (q && !`${row.name} ${row.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, query, statusFilter, categoryFilter]);

  const topWidgets = useMemo(
    () => [...(data?.per_widget_7d ?? [])].sort((a: WidgetPerWidget7d, b: WidgetPerWidget7d) => b.renders - a.renders).slice(0, 5),
    [data],
  );

  if (isLoading) return <LoadingState />;
  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Widgets" description="Widget platform management" />
        <EmptyState
          icon={LayoutGrid}
          title="Widget platform unavailable"
          description={error instanceof Error ? error.message : "Could not load the widget catalog."}
        />
      </div>
    );
  }

  const events = data.events_7d;
  const errorRate = events.renders > 0 ? ((events.errors / events.renders) * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Widgets"
        description="Availability, rollout, health and analytics for the Noska widget platform"
      />

      {/* Platform KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total widgets" value={data.totals.total} hint={`${data.totals.enabled} enabled · ${data.totals.beta} beta · ${data.totals.disabled} disabled`} />
        <Kpi label="Renders (7d)" value={events.renders.toLocaleString()} hint={`${events.unique_users.toLocaleString()} unique users`} />
        <Kpi label="Error rate (7d)" value={`${errorRate}%`} hint={`${events.errors.toLocaleString()} errors`} />
        <Kpi label="Avg load (7d)" value={events.avg_load_ms != null ? `${events.avg_load_ms}ms` : "—"} hint={events.p95_load_ms != null ? `p95 ${events.p95_load_ms}ms` : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Catalog */}
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center gap-2 border-b p-4">
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search widgets…" className="pl-8" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <div className="p-8">
                <EmptyState icon={LayoutGrid} title="No widgets match" description="Adjust the search or filters." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Widget</th>
                      <th className="px-4 py-2.5 font-medium">Category</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Rollout</th>
                      <th className="px-4 py-2.5 font-medium">Renders 7d</th>
                      <th className="px-4 py-2.5 font-medium">Errors 7d</th>
                      <th className="px-4 py-2.5 font-medium">Users 7d</th>
                      <th className="px-4 py-2.5 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row: WidgetCatalogRow) => {
                      const stats = perWidget.get(row.id);
                      return (
                        <tr
                          key={row.id}
                          onClick={() => navigate(`/widgets/${row.id}`)}
                          className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50"
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <WidgetPreviewTile category={row.category} />
                              <div className="min-w-0">
                                <p className="font-medium">{row.name}</p>
                                <p className="max-w-[260px] truncate text-xs text-muted-foreground">{row.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{CATEGORY_LABELS[row.category] ?? row.category}</td>
                          <td className="px-4 py-2.5"><Badge variant={STATUS_BADGE[row.status] ?? "default"}>{row.status}</Badge></td>
                          <td className="px-4 py-2.5 text-muted-foreground">{row.rollout_percent}%</td>
                          <td className="px-4 py-2.5">{(stats?.renders ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5">
                            <span className={(stats?.errors ?? 0) > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
                              {(stats?.errors ?? 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{(stats?.users ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatRelativeTime(row.updated_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top widgets sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Most used (7d)</h3>
              </div>
              {topWidgets.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No telemetry yet — widgets report as clients render them.</p>
              ) : (
                <ol className="space-y-2">
                  {topWidgets.map((w, i) => {
                    const row = data.catalog.find((c) => c.id === w.widget_id);
                    return (
                      <li key={w.widget_id}>
                        <button
                          onClick={() => navigate(`/widgets/${w.widget_id}`)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50"
                        >
                          <span className="w-4 text-xs font-bold text-muted-foreground">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate font-medium">{row?.name ?? w.widget_id}</span>
                          <span className="text-xs text-muted-foreground">{w.renders.toLocaleString()}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-2 text-sm font-semibold">Platform totals</h3>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Interactions (7d)</dt><dd className="font-medium">{events.interactions.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Enabled by default</dt><dd className="font-medium">{data.catalog.filter((c) => c.default_enabled).length}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Partial rollouts</dt><dd className="font-medium">{data.catalog.filter((c) => c.status !== "disabled" && c.rollout_percent < 100).length}</dd></div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
