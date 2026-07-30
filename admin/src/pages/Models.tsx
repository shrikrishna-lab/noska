import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Progress } from "@/components/ui/progress";
import { useAiUsageFromAudit, useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

interface ModelDisplay {
  model: string; provider: string; requests: number; avgLatencyMs: number; cost: number;
}

const columns: Column<ModelDisplay>[] = [
  { key: "model", label: "Model", sortable: true, render: (row) => <span className="font-medium">{row.model || "Unknown"}</span> },
  { key: "provider", label: "Provider", sortable: true },
  { key: "requests", label: "Requests", sortable: true, className: "text-right" },
  { key: "avgLatencyMs", label: "Avg Latency", sortable: true, className: "text-right", render: (row) => `${row.avgLatencyMs}ms` },
  { key: "cost", label: "Est. Cost", sortable: true, className: "text-right", render: (row) => `$${row.cost.toFixed(2)}` },
];

export function Models() {
  const { data: aiEvents, isLoading } = useAiUsageFromAudit();
  useRealtimeInvalidate(["admin", "models"], "audit_events");

  if (isLoading) return <div className="p-6"><PageHeader title="Models" description="AI model usage and performance" /><LoadingState count={3} /></div>;

  const modelMap = new Map<string, { provider: string; requests: number; latencies: number[]; costs: number[] }>();
  for (const e of aiEvents ?? []) {
    if (!e.ai_model) continue;
    const key = e.ai_model;
    if (!modelMap.has(key)) modelMap.set(key, { provider: e.ai_provider ?? "unknown", requests: 0, latencies: [], costs: [] });
    const m = modelMap.get(key)!;
    m.requests++;
    if (e.ai_latency_ms) m.latencies.push(e.ai_latency_ms);
    if (e.ai_cost) m.costs.push(e.ai_cost);
  }

  const models: ModelDisplay[] = Array.from(modelMap.entries()).map(([model, data]) => ({
    model, provider: data.provider,
    requests: data.requests,
    avgLatencyMs: data.latencies.length ? Math.round(data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length) : 0,
    cost: data.costs.reduce((a, b) => a + b, 0),
  }));

  return (
    <div className="p-6">
      <PageHeader title="Models" description="AI model usage and performance metrics" />
      {models.length > 0 ? (
        <DataTable columns={columns} data={models} searchable={false} />
      ) : (
        <EmptyState title="No model data" description="Model usage will appear once AI features are used." />
      )}
    </div>
  );
}
