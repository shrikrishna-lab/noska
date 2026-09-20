// Admin → Billing → Usage & AI Credits (§34): per user / workspace / feature / period.
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingState";
import { useUsageRecords, downloadCSV } from "@/lib/billing-queries";
import toast from "react-hot-toast";

export function BillingUsage() {
  const usage = useUsageRecords();
  const [q, setQ] = useState("");
  const [feature, setFeature] = useState("all");

  const features = useMemo(() => ["all", ...Array.from(new Set((usage.data ?? []).map((u) => u.feature_key)))], [usage.data]);
  const totals = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of usage.data ?? []) m.set(u.feature_key, (m.get(u.feature_key) ?? 0) + Number(u.usage_value ?? 0));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [usage.data]);

  const rows = (usage.data ?? []).filter((u) => {
    if (feature !== "all" && u.feature_key !== feature) return false;
    if (q && !`${u.user_id} ${u.feature_key} ${u.workspace_id ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  if (usage.isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Usage & AI Credits" description="Consumption by user, workspace, feature and billing period." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {totals.slice(0, 8).map(([k, v]) => (
          <Card key={k}><CardHeader className="pb-1"><CardTitle className="font-mono text-xs text-muted-foreground">{k}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold">{Math.round(v).toLocaleString("en-IN")}</div></CardContent></Card>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search user / workspace…" value={q} onChange={(e) => setQ(e.target.value)} />
        {features.map((f) => (
          <Button key={f} size="sm" variant={feature === f ? "default" : "outline"} onClick={() => setFeature(f)}>{f}</Button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => { downloadCSV("usage.csv", rows as unknown as Array<Record<string, unknown>>); toast.success("Exported"); }}>
          Export CSV
        </Button>
      </div>
      <DataTable
        columns={[
          { key: "user_id", label: "User", render: (r) => <span className="font-mono text-xs">{r.user_id.slice(0, 14)}…</span> },
          { key: "feature_key", label: "Feature", render: (r) => <span className="font-mono">{r.feature_key}</span> },
          { key: "usage_value", label: "Used", sortable: true, className: "text-right", render: (r) => Number(r.usage_value).toLocaleString("en-IN") },
          { key: "period_start", label: "Period", render: (r) => `${new Date(r.period_start).toLocaleDateString("en-IN")} → ${new Date(r.period_end).toLocaleDateString("en-IN")}`, hideOnMobile: true },
        ]}
        data={rows.slice(0, 200)}
        rowKey={(r) => r.id}
        emptyMessage="No usage records."
      />
    </div>
  );
}
