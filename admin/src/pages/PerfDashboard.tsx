import { useState, useEffect } from "react";
import { onPerfUpdate, getSnapshot } from "@/lib/perf/perfInsights";
import type { PerfSnapshot } from "@/lib/perf/perfInsights";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function PerfDashboard() {
  const [snap, setSnap] = useState<PerfSnapshot>(getSnapshot);

  useEffect(() => onPerfUpdate(setSnap), []);

  const avgRender = snap.renders.length > 0
    ? snap.renders.reduce((s, r) => s + r.actualDuration, 0) / snap.renders.length
    : 0;

  const totalRpcMs = snap.rpcs.reduce((s, r) => s + r.totalMs, 0);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Performance Insights" description="Real-time rendering, RPC, and chunk analysis" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Slow Renders (16ms+)" value={snap.renders.length} />
        <KpiCard title="Avg Render Time" value={`${avgRender.toFixed(1)}ms`} />
        <KpiCard title="Slow RPCs Tracked" value={snap.rpcs.length} />
        <KpiCard title="Total RPC Time" value={`${totalRpcMs.toFixed(0)}ms`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Most Expensive Renders</h3>
          {snap.componentRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slow renders yet. Interact with the app to collect data.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium pb-1 border-b">
                <span className="flex-1">Component</span>
                <span className="w-16 text-right">Total</span>
                <span className="w-16 text-right">Avg</span>
                <span className="w-12 text-right">Count</span>
              </div>
              {snap.componentRanking.slice(0, 10).map((c) => (
                <div key={c.id} className="flex items-center gap-4 text-sm">
                  <span className="flex-1 truncate">{c.id}</span>
                  <span className="w-16 text-right font-mono text-xs">{c.totalMs.toFixed(0)}ms</span>
                  <span className="w-16 text-right font-mono text-xs text-muted-foreground">{c.avgMs.toFixed(1)}ms</span>
                  <span className="w-12 text-right font-mono text-xs text-muted-foreground">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Slowest RPCs</h3>
          {snap.rpcs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No RPCs tracked yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snap.rpcs.slice(0, 10).map((r) => ({ name: r.method.split("_").pop() || r.method, ms: r.maxMs }))} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="ms" fill="var(--accent, #6366f1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Recent Slow Renders (last 60s)</h3>
        {snap.renders.length === 0 ? (
          <p className="text-sm text-muted-foreground">None.</p>
        ) : (
          <div className="space-y-1">
            {snap.renders.slice(0, 20).map((r, i) => (
              <div key={i} className="flex items-center gap-4 text-xs font-mono">
                <span className="w-16">{r.phase === "mount" ? "MOUNT" : "UPDATE"}</span>
                <span className="w-16 text-right">{r.actualDuration.toFixed(0)}ms</span>
                <span className="flex-1 truncate">{r.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
