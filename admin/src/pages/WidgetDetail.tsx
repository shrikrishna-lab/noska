import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FlaskConical,
  Loader2,
  Play,
  ShieldAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { useWidgetAnalytics, useWidgetAudit, useWidgetErrors, useWidgetOverview, useUpdateWidget } from "@/lib/widgets";
import type { WidgetCatalogRow } from "@/lib/widgets";
import { formatRelativeTime } from "@/lib/utils";
import { WidgetSimulator } from "@/components/widgets/WidgetSimulator";

const STATUS_BADGE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  enabled: "success",
  beta: "warning",
  disabled: "destructive",
};

function Stat({ label, value, hint, danger }: { label: string; value: string | number; hint?: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${danger ? "text-destructive" : ""}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RolloutTab({ widget, onUpdate, saving }: { widget: WidgetCatalogRow; onUpdate: (d: Record<string, unknown>) => void; saving: boolean }) {
  const [status, setStatus] = useState<"enabled" | "beta" | "disabled">(widget.status);
  const [rollout, setRollout] = useState(String(widget.rollout_percent));
  const confirm = useConfirmDialog();

  const requestStatus = async (next: string) => {
    if (next === widget.status) return;
    const ok = await confirm.confirm({
      title: next === "disabled" ? `Disable “${widget.name}”?` : `Change status to “${next}”?`,
      description:
        next === "disabled"
          ? "The widget disappears immediately from every user's dashboard. Existing layouts are preserved and restored if re-enabled."
          : `“${widget.name}” will be ${next === "beta" ? "marked beta" : "enabled"} for users within rollout limits.`,
      variant: next === "disabled" ? "warning" : "confirm",
      confirmText: next === "disabled" ? "Disable" : "Confirm",
    });
    if (ok) onUpdate({ status: next });
    else setStatus(widget.status);
  };

  const requestRollout = async () => {
    const next = Math.max(0, Math.min(100, parseInt(rollout) || 0));
    if (next === widget.rollout_percent) return;
    const major = Math.abs(next - widget.rollout_percent) > 25 || next === 100;
    if (major) {
      const ok = await confirm.confirm({
        title: "Major rollout change",
        description: `Rollout for “${widget.name}” changes from ${widget.rollout_percent}% to ${next}%. This affects a large share of users.`,
        variant: "warning",
        confirmText: "Apply rollout",
      });
      if (!ok) {
        setRollout(String(widget.rollout_percent));
        return;
      }
    }
    onUpdate({ rollout_percent: next });
  };

  const forceDisable = async () => {
    const ok = await confirm.confirm({
      title: `Force disable “${widget.name}”?`,
      description: "Every user loses access to this widget immediately. This action is audited.",
      variant: "delete",
      confirmText: "Force disable",
    });
    if (ok) onUpdate({ status: "disabled", rollout_percent: 0 });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v as "enabled" | "beta" | "disabled"); void requestStatus(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="beta">Beta</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Rollout percentage</Label>
            <div className="flex gap-2">
              <Input type="number" min={0} max={100} value={rollout} onChange={(e) => setRollout(e.target.value)} />
              <Button onClick={() => void requestRollout()} disabled={saving || parseInt(rollout) === widget.rollout_percent}>Apply</Button>
            </div>
            <p className="text-xs text-muted-foreground">Percentage of users who can see this widget (stable per-user hash).</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Enabled by default</p>
              <p className="text-xs text-muted-foreground">Auto-added to dashboards for users without a saved layout.</p>
            </div>
            <Switch
              checked={widget.default_enabled}
              onCheckedChange={(v) => onUpdate({ default_enabled: v })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Default size</Label>
            <Select value={widget.default_size} onValueChange={(v) => onUpdate({ default_size: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["small", "medium", "large", "wide"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Version</Label>
            <div className="flex gap-2">
              <VersionInput initial={widget.version} onSave={(v) => onUpdate({ version: v })} saving={saving} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="md:col-span-2">
        <Card className="border-destructive/40">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-semibold">Force disable</p>
                <p className="text-xs text-muted-foreground">
                  Emergency kill switch — immediately hides the widget for all users. Use for crashes, data correctness or privacy incidents.
                </p>
              </div>
            </div>
            <Button variant="destructive" disabled={saving || widget.status === "disabled"} onClick={() => void forceDisable()}>
              Force disable
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VersionInput({ initial, onSave, saving }: { initial: string; onSave: (v: string) => void; saving: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        variant="outline"
        disabled={saving || !value.trim() || value === initial}
        onClick={() => onSave(value.trim())}
      >
        Save
      </Button>
    </>
  );
}

export function WidgetDetail() {
  const { widgetId } = useParams<{ widgetId: string }>();
  const navigate = useNavigate();
  const overview = useWidgetOverview();
  const widget = useMemo(
    () => overview.data?.catalog.find((c) => c.id === widgetId) ?? null,
    [overview.data, widgetId],
  );
  const analytics = useWidgetAnalytics(widgetId ?? null, 14);
  const errors = useWidgetErrors(widgetId ?? null);
  const audit = useWidgetAudit(widgetId ?? null);
  const updateWidget = useUpdateWidget(widgetId ?? null);

  if (overview.isLoading) return <LoadingState />;
  if (!widget) {
    return (
      <div className="space-y-6">
        <Link to="/widgets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All widgets
        </Link>
        <EmptyState title="Widget not found" description="It may have been removed from the catalog." />
      </div>
    );
  }

  const update = (data: Record<string, unknown>) => {
    updateWidget.mutate(data, {
      onSuccess: () => toast.success("Widget updated"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
    });
  };
  const saving = updateWidget.isPending;

  const a = analytics.data;
  const totals = a?.totals;
  const interactRate = totals && totals.renders > 0 ? ((totals.interactions / totals.renders) * 100).toFixed(1) : "0.0";
  const errRate = totals && totals.renders > 0 ? ((totals.errors / totals.renders) * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      <Link to="/widgets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All widgets
      </Link>
      <PageHeader
        title={widget.name}
        description={widget.description ?? ""}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE[widget.status] ?? "default"}>{widget.status}</Badge>
            <Badge variant="outline">v{widget.version}</Badge>
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="errors">Errors {((errors.data?.length ?? 0) > 0) && <span className="ml-1 rounded-full bg-destructive/10 px-1.5 text-[10px] font-bold text-destructive">{errors.data?.length}</span>}</TabsTrigger>
          <TabsTrigger value="rollout">Rollout &amp; config</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Renders (14d)" value={(totals?.renders ?? 0).toLocaleString()} />
            <Stat label="Users (14d)" value={(totals?.unique_users ?? 0).toLocaleString()} />
            <Stat label="Interaction rate" value={`${interactRate}%`} hint={`${(totals?.interactions ?? 0).toLocaleString()} actions`} />
            <Stat label="Avg load" value={totals?.avg_load_ms != null ? `${totals.avg_load_ms}ms` : "—"} />
            <Stat label="p95 load" value={totals?.p95_load_ms != null ? `${Math.round(Number(totals.p95_load_ms))}ms` : "—"} />
            <Stat label="Error rate" value={`${errRate}%`} danger={parseFloat(errRate) > 1} hint={`${(totals?.errors ?? 0).toLocaleString()} errors`} />
          </div>
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Platform availability</h3>
              <div className="flex flex-wrap gap-2">
                {(widget.platforms ?? []).map((p) => (
                  <Badge key={p} variant="secondary">{p}</Badge>
                ))}
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">Category</dt><dd className="font-medium">{widget.category}</dd></div>
                <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">Default size</dt><dd className="font-medium">{widget.default_size}</dd></div>
                <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">Allowed sizes</dt><dd className="font-medium">{(widget.allowed_sizes ?? []).join(", ")}</dd></div>
                <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">Required integration</dt><dd className="font-medium">{widget.required_integration ?? "none"}</dd></div>
                <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">Min app version</dt><dd className="font-medium">{widget.min_app_version ?? "—"}</dd></div>
                <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">Last updated</dt><dd className="font-medium">{formatRelativeTime(widget.updated_at)}</dd></div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics.isLoading || !a ? (
            <LoadingState />
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">Daily activity (14 days)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={a.daily}>
                        <defs>
                          <linearGradient id="rendersFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="renders" stroke="#3b82f6" fill="url(#rendersFill)" strokeWidth={2} />
                        <Area type="monotone" dataKey="interactions" stroke="#10b981" fill="transparent" strokeWidth={2} />
                        <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="transparent" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="mb-3 text-sm font-semibold">Adoption by platform</h3>
                    {a.platforms.length === 0 ? (
                      <EmptyState title="No platform data yet" />
                    ) : (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={a.platforms}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                            <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="users" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="mb-3 text-sm font-semibold">Adoption &amp; engagement</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-2"><dt className="text-muted-foreground">Users with this widget on their dashboard</dt><dd className="font-bold">{a.adoption.users_with_layout.toLocaleString()}</dd></div>
                      <div className="flex justify-between border-b pb-2"><dt className="text-muted-foreground">Unique active users (14d)</dt><dd className="font-bold">{(totals?.unique_users ?? 0).toLocaleString()}</dd></div>
                      <div className="flex justify-between border-b pb-2"><dt className="text-muted-foreground">Interaction rate</dt><dd className="font-bold">{interactRate}%</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Rollout</dt><dd className="font-bold">{widget.rollout_percent}%</dd></div>
                    </dl>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="errors" className="space-y-3">
          {errors.isLoading ? (
            <LoadingState />
          ) : (errors.data?.length ?? 0) === 0 ? (
            <Card><CardContent className="p-8"><EmptyState title="No errors in the last 30 days" description="Render failures reported by clients will be grouped here." /></CardContent></Card>
          ) : (
            <>
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={widget.status === "disabled" || saving}
                  onClick={() => update({ status: "disabled" })}
                >
                  Disable widget
                </Button>
              </div>
              {errors.data!.map((e, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <p className="min-w-0 flex-1 break-words font-mono text-xs">{e.error_message ?? "(no message)"}</p>
                      <Badge variant="destructive">{e.frequency}×</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {e.affected_users} user{e.affected_users === 1 ? "" : "s"} affected · first seen {formatRelativeTime(e.first_seen)} · last seen {formatRelativeTime(e.last_seen)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="rollout">
          <RolloutTab widget={widget} onUpdate={update} saving={saving} />
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {audit.isLoading ? (
            <LoadingState />
          ) : (audit.data?.length ?? 0) === 0 ? (
            <Card><CardContent className="p-8"><EmptyState title="No changes recorded yet" description="Admin actions on this widget are audited here." /></CardContent></Card>
          ) : (
            audit.data!.map((row) => (
              <Card key={row.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <p>
                      <span className="font-semibold">{row.admin_email ?? "admin"}</span>{" "}
                      <span className="text-muted-foreground">updated</span>{" "}
                      <span className="font-mono text-xs">{describeChange(row)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline">{row.action}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="simulator">
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">Safe preview &amp; test states</p>
              <p className="text-xs text-muted-foreground">
                Renders are mocked — no production user data is read, and test events never reach real users.
              </p>
            </div>
          </div>
          <WidgetSimulator widget={widget} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function describeChange(row: { previous: Record<string, unknown> | null; next: Record<string, unknown> | null }): string {
  const interesting = ["status", "rollout_percent", "default_enabled", "default_size", "version"];
  const changes: string[] = [];
  for (const key of interesting) {
    const prev = row.previous?.[key];
    const next = row.next?.[key];
    if (prev !== next && next !== undefined) changes.push(`${key}: ${String(prev)} → ${String(next)}`);
  }
  return changes.length > 0 ? changes.join(", ") : "catalog row updated";
}
