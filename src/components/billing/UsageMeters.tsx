// UsageMeters (§18, §45): usage vs limits with 80/90/100% warnings. Integrates with noska:toast.
import React, { useEffect, useRef, useState } from "react";
import { useUsage } from "@/hooks/billing/useEntitlements";
import { supabase, getAuthUserId } from "@/lib/supabase";

const METERS: Array<{ key: string; label: string; unit?: string; usageKey?: string }> = [
  { key: "monthly_ai_credits", label: "AI Credits" },
  { key: "max_storage_mb", label: "Storage", unit: "mb" },
  { key: "max_workspaces", label: "Workspaces", usageKey: "workspaces" },
  { key: "max_automations", label: "Automations", usageKey: "max_automations" },
  { key: "max_custom_agents", label: "Agents", usageKey: "max_custom_agents" },
  { key: "max_mcp_calls", label: "MCP calls", usageKey: "max_mcp_calls" },
];

function fmt(key: string, v: number, unit?: string): string {
  if (unit === "mb") return v >= 1024 ? `${(v / 1024).toFixed(1)}GB` : `${Math.round(v)}MB`;
  if (key === "monthly_ai_credits") return v.toLocaleString("en-IN");
  return String(Math.round(v));
}

export function UsageMeters() {
  const { usage, limit } = useUsage();
  const warned = useRef<Set<string>>(new Set());
  const [live, setLive] = useState<Record<string, number>>({});

  // Live counts for resources tracked as rows (not usage_records)
  useEffect(() => {
    (async () => {
      try {
        const uid = await getAuthUserId();
        if (!uid) return;
        const sb = supabase as unknown as { from(t: string): any };
        const [au, ag] = await Promise.all([
          sb.from("automations").select("id", { count: "exact", head: true }).eq("owner_id", uid),
          sb.from("agents").select("id", { count: "exact", head: true }).eq("owner_id", uid),
        ]);
        setLive({ max_automations: au.count ?? 0, max_custom_agents: ag.count ?? 0 });
      } catch { /* meters must never break billing UI */ }
    })();
  }, []);

  const usedOf = (m: { key: string; usageKey?: string }) =>
    live[m.key] ?? usage[m.usageKey ?? m.key] ?? 0;

  useEffect(() => {
    for (const m of METERS) {
      const lim = limit(m.key);
      if (lim === null || lim === undefined) continue; // unlimited — no warnings
      const usedVal = usedOf(m);
      const pct = lim > 0 ? (usedVal / lim) * 100 : 0;
      const bucket = pct >= 100 ? "100" : pct >= 90 ? "90" : pct >= 80 ? "80" : null;
      if (bucket && !warned.current.has(m.key + bucket)) {
        warned.current.add(m.key + bucket);
        const msg = bucket === "100"
          ? `You've reached your ${m.label.toLowerCase()} limit. Upgrade or wait for reset.`
          : `You have used ${Math.round(pct)}% of your ${m.label.toLowerCase()}.`;
        window.dispatchEvent(new CustomEvent("noska:toast", { detail: msg }));
      }
    }
  });

  return (
    <div className="space-y-3">
      {METERS.map((m) => {
        const lim = limit(m.key);
        if (lim === null || lim === undefined) {
          // Unlimited plan: show usage without a cap
          const usedVal = usedOf(m);
          return (
            <div key={m.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium dark:text-white">{m.label}</span>
                <span className="text-xs text-neutral-500">{fmt(m.key, usedVal, m.unit)} · Unlimited</span>
              </div>
            </div>
          );
        }
        const usedVal = usedOf(m);
        const pct = Math.min(100, Math.round((usedVal / lim) * 100));
        const over = usedVal >= lim;
        return (
          <div key={m.key}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium dark:text-white">{m.label}</span>
              <span className={`text-xs ${over ? "font-semibold text-red-600" : "text-neutral-500"}`}>
                {fmt(m.key, usedVal, m.unit)} / {fmt(m.key, lim, m.unit)}{over ? " — limit reached" : ""}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : "bg-black dark:bg-white"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
