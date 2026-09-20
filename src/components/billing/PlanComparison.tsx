// PlanComparison (§51): full comparison table. Every value comes from the
// entitlement system (billing_plans + billing_plan_features) — never hardcoded.
import React, { useEffect, useMemo, useState } from "react";
import { fetchPublicPlans, OFFICIAL_PUBLIC_PLANS } from "@/lib/billing/api";
import type { PublicPlan } from "@/lib/billing/api";

const ROWS: Array<{ key: string; label: string; kind: "bool" | "limit" }> = [
  { key: "ai_generation", label: "AI assistant", kind: "bool" },
  { key: "monthly_ai_credits", label: "AI credits / month", kind: "limit" },
  { key: "ai_image_analysis", label: "Image analysis", kind: "bool" },
  { key: "ai_file_analysis", label: "File analysis", kind: "bool" },
  { key: "voice_input", label: "Voice input", kind: "bool" },
  { key: "custom_agents", label: "Custom agents", kind: "bool" },
  { key: "max_custom_agents", label: "Custom agent limit", kind: "limit" },
  { key: "agent_memory", label: "Agent memory", kind: "bool" },
  { key: "premium_models", label: "Premium models", kind: "bool" },
  { key: "byok", label: "BYOK", kind: "bool" },
  { key: "api_access", label: "API access", kind: "bool" },
  { key: "automation", label: "Automations", kind: "bool" },
  { key: "max_automations", label: "Automation limit", kind: "limit" },
  { key: "mcp_access", label: "MCP", kind: "bool" },
  { key: "advanced_mcp", label: "Advanced MCP", kind: "bool" },
  { key: "max_mcp_calls", label: "MCP calls / month", kind: "limit" },
  { key: "advanced_databases", label: "Advanced databases", kind: "bool" },
  { key: "advanced_widgets", label: "Advanced widgets", kind: "bool" },
  { key: "pdf_export", label: "PDF export", kind: "bool" },
  { key: "advanced_export", label: "Advanced export", kind: "bool" },
  { key: "calendar_sync", label: "Calendar sync", kind: "bool" },
  { key: "gmail_sync", label: "Gmail sync", kind: "bool" },
  { key: "version_history", label: "Version history", kind: "bool" },
  { key: "offline_mode", label: "Offline mode", kind: "bool" },
  { key: "desktop_app", label: "Desktop app", kind: "bool" },
  { key: "mobile_app", label: "Mobile app", kind: "bool" },
  { key: "max_workspaces", label: "Workspaces", kind: "limit" },
  { key: "max_storage_mb", label: "Storage", kind: "limit" },
  { key: "max_members", label: "Members", kind: "limit" },
  { key: "teamspaces", label: "Private teamspaces", kind: "bool" },
  { key: "rbac", label: "Advanced RBAC", kind: "bool" },
  { key: "audit_logs", label: "Audit logs", kind: "bool" },
  { key: "analytics", label: "Advanced analytics", kind: "bool" },
  { key: "sso", label: "SSO / SAML", kind: "bool" },
  { key: "scim", label: "SCIM", kind: "bool" },
];

function cell(plan: PublicPlan, row: (typeof ROWS)[number]): string {
  const f = plan.features.find((x) => x.feature_key === row.key);
  if (!f) return "—";
  if (row.kind === "bool") return f.enabled ? "✓" : "—";
  if (f.limit_value === null || f.limit_value === undefined) return f.enabled ? "Unlimited" : "—";
  if (row.key === "max_storage_mb") {
    const v = Number(f.limit_value);
    return v >= 1024 ? `${Math.round(v / 1024)} GB` : `${v} MB`;
  }
  if (row.key === "max_workspaces" && Number(f.limit_value) >= 1000) return "Unlimited";
  return String(Math.round(Number(f.limit_value)));
}

export function PlanComparison() {
  const [plans, setPlans] = useState<PublicPlan[]>(OFFICIAL_PUBLIC_PLANS);
  useEffect(() => {
    fetchPublicPlans().then(setPlans).catch(() => setPlans([]));
  }, []);
  const ordered = useMemo(() => [...plans].sort((a, b) => a.display_order - b.display_order), [plans]);
  if (!ordered.length) return <div className="h-40 animate-pulse rounded-3xl bg-neutral-100 dark:bg-white/5" />;
  return (
    <div className="overflow-x-auto rounded-3xl border border-neutral-200 dark:border-white/10">
      <table className="w-full min-w-[720px] border-collapse bg-white text-sm dark:bg-neutral-900">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-white/10">
            <th className="p-3 text-left font-medium text-neutral-500">Feature</th>
            {ordered.map((p) => (
              <th key={p.id} className="p-3 text-center font-semibold dark:text-white">{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.key} className="border-b border-neutral-100 last:border-0 dark:border-white/5">
              <td className="p-3 text-neutral-600 dark:text-neutral-300">{r.label}</td>
              {ordered.map((p) => {
                const v = cell(p, r);
                return (
                  <td key={p.id} className={`p-3 text-center ${v === "✓" ? "font-semibold text-green-600" : "text-neutral-500"}`}>
                    {v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
