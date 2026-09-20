// UpgradeModal (§19): professional upgrade prompt when a free user hits a locked feature.
import React, { useEffect, useState } from "react";
import { fetchPublicPlans } from "@/lib/billing/api";
import type { PublicPlan } from "@/lib/billing/api";
import { useEntitlements } from "@/hooks/billing/useEntitlements";

const FEATURE_COPY: Record<string, { title: string; blurb: string }> = {
  custom_agents: { title: "Custom Agents are available on Pro", blurb: "Build reusable AI agents for your workspace." },
  automation: { title: "Automations are a paid feature", blurb: "Automate repetitive work with rules and schedules." },
  mcp_access: { title: "MCP access needs Pro", blurb: "Connect external tools through the Model Context Protocol." },
  advanced_databases: { title: "Advanced databases need Plus or Pro", blurb: "Unlock advanced views, relations and rollups." },
  pdf_export: { title: "PDF export needs Plus or Pro", blurb: "Export pages to polished PDFs." },
};

export function UpgradeModal({ open, onClose, feature }: { open: boolean; onClose: () => void; feature?: string }) {
  const { data } = useEntitlements();
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  useEffect(() => {
    if (!open) return;
    fetchPublicPlans().then(setPlans).catch(() => setPlans([]));
  }, [open ]);
  if (!open) return null;
  const copy = (feature && FEATURE_COPY[feature]) || { title: "Upgrade to unlock more", blurb: "Get higher limits and premium features." };
  const paid = plans.filter((p) => p.slug !== "free");
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="w-full max-w-md rounded-3xl border border-[var(--border,#e8e4db)] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary,#1a1a1a)] dark:text-white">{copy.title}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary,#6b675f)] dark:text-neutral-400">{copy.blurb}</p>
        <p className="mt-3 text-xs text-[var(--text-secondary,#6b675f)] dark:text-neutral-500">
          Your current plan: <span className="font-medium">{data?.plan.name ?? "Free"}</span>
        </p>
        <div className="mt-4 space-y-2">
          {paid.map((p) => (
            <a
              key={p.id}
              href="/pricing"
              className="flex items-center justify-between rounded-2xl border border-[var(--border,#e8e4db)] px-4 py-3 transition hover:border-black dark:border-white/10 dark:hover:border-white"
            >
              <div>
                <div className="text-sm font-semibold dark:text-white">{p.name}</div>
                <div className="text-xs text-[var(--text-secondary,#6b675f)] dark:text-neutral-400">
                  ₹{p.monthly_price}/mo · ₹{p.yearly_price}/yr
                </div>
              </div>
              <span className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-black">
                {p.cta_text || `Upgrade to ${p.name}`}
              </span>
            </a>
          ))}
          {paid.length === 0 && (
            <a href="/pricing" className="block rounded-2xl bg-black px-4 py-3 text-center text-sm font-medium text-white dark:bg-white dark:text-black">
              View plans
            </a>
          )}
        </div>
        <button onClick={onClose} className="mt-4 w-full text-center text-xs text-[var(--text-secondary,#6b675f)] hover:underline">
          Maybe later
        </button>
      </div>
    </div>
  );
}
