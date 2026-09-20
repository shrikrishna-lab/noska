// PremiumGate (§32): presentation-only gate. Renders locked state with upgrade CTA.
// SECURITY: this is UX only — every premium operation MUST still be enforced server-side.
import React, { useState } from "react";
import { useFeatureAccess } from "@/hooks/billing/useEntitlements";
import { UpgradeModal } from "./UpgradeModal";

export function PremiumGate({
  feature, title, description, children, fallback,
}: {
  feature: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { allowed, loading } = useFeatureAccess(feature);
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="animate-pulse rounded-xl bg-[var(--surface,#f1efe9)] p-6 text-sm text-[var(--text-secondary,#6b675f)]">Checking access…</div>;
  }
  if (allowed) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  return (
    <div className="rounded-2xl border border-[var(--border,#e8e4db)] bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg dark:bg-amber-900/40">🔒</div>
      <h3 className="text-base font-semibold text-[var(--text-primary,#1a1a1a)] dark:text-white">{title ?? "Premium feature"}</h3>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--text-secondary,#6b675f)] dark:text-neutral-400">{description}</p>}
      <button
        onClick={() => setOpen(true)}
        className="mt-4 rounded-full bg-[var(--text-primary,#1a1a1a)] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
      >
        View plans
      </button>
      <UpgradeModal open={open} onClose={() => setOpen(false)} feature={feature} />
    </div>
  );
}
