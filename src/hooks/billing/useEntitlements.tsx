// Centralized entitlement hooks (§31). UI presentation only — backend is authoritative.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchEntitlements } from "@/lib/billing/api";
import type { EntitlementSnapshot } from "@/lib/billing/types";

interface EntitlementsCtx {
  data: EntitlementSnapshot | null;
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  can: (feature: string) => boolean;
  limit: (key: string) => number | null;
  used: (key: string) => number;
  remaining: (key: string) => number;
  /** Display currency: user-set billing country, else USD. */
  displayCurrency: string;
  billingCountry: string | null;
}

const Ctx = createContext<EntitlementsCtx>({
  data: null, loading: true, error: null,
  refresh: async () => {}, can: () => false,
  limit: () => null, used: () => 0, remaining: () => 0,
  displayCurrency: "USD", billingCountry: null,
});

// Local fallback so offline/unknown states never grant premium (§34)
const FREE_FALLBACK: EntitlementSnapshot = {
  plan: { id: "free", name: "Free", slug: "free" },
  features: {},
  limits: { monthly_ai_credits: 200, max_workspaces: 1, max_storage_mb: 500 },
  usage: {},
  remaining: {},
  subscription: { status: "unknown" },
};

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<EntitlementSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const timer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const snap = await fetchEntitlements();
      setData(snap);
      setError(null);
      try { sessionStorage.setItem("noska:entitlements", JSON.stringify({ at: Date.now(), snap })); } catch { /* ignore */ }
    } catch (e) {
      setError(e);
      // Offline: use cached snapshot marked unknown, else free fallback
      try {
        const raw = sessionStorage.getItem("noska:entitlements");
        if (raw) {
          const parsed = JSON.parse(raw) as { snap: EntitlementSnapshot };
          setData({ ...parsed.snap, subscription: { ...parsed.snap.subscription, status: parsed.snap.subscription.status === "active" ? "unknown_cached" : parsed.snap.subscription.status } });
        } else setData((d) => d ?? FREE_FALLBACK);
      } catch { setData((d) => d ?? FREE_FALLBACK); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onBilling = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("noska:billing-changed", onBilling);
    timer.current = window.setInterval(refresh, 5 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("noska:billing-changed", onBilling);
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [refresh]);

  const value = useMemo<EntitlementsCtx>(() => ({
    data, loading, error, refresh,
    can: (f) => Boolean(data?.features[f]),
    limit: (k) => data?.limits[k] ?? null,
    used: (k) => data?.usage[k === "max_workspaces" ? "workspaces" : k] ?? 0,
    remaining: (k) => data?.remaining[k] ?? 0,
    displayCurrency: data?.customer?.display_currency ?? "USD",
    billingCountry: data?.customer?.billing_country ?? null,
  }), [data, loading, error, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function notifyBillingChanged() {
  window.dispatchEvent(new CustomEvent("noska:billing-changed"));
}

export function useEntitlements() { return useContext(Ctx); }
export function useSubscription() {
  const { data, loading, refresh } = useEntitlements();
  return { subscription: data?.subscription ?? { status: "none" }, plan: data?.plan ?? FREE_FALLBACK.plan, loading, refresh };
}
export function usePlan() {
  const { data, loading } = useEntitlements();
  return { plan: data?.plan ?? FREE_FALLBACK.plan, loading };
}
export function useUsage() {
  const ctx = useEntitlements();
  return { usage: ctx.data?.usage ?? {}, remaining: ctx.remaining, limit: ctx.limit, used: ctx.used, loading: ctx.loading };
}
export function useFeatureAccess(feature: string) {
  const { can, loading, data } = useEntitlements();
  return { allowed: can(feature), loading, planSlug: data?.plan.slug ?? "free" };
}
export function useBilling() {
  const ctx = useEntitlements();
  return ctx;
}
