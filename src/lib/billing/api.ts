// Noska Billing API client — thin fetch layer over Edge Functions.
// All pricing/coupon/entitlement decisions happen server-side.
import { currentAccessToken } from "../supabase";
import type { BillingPlan, EntitlementSnapshot, InvoiceRow, PaymentRow, TopupProduct } from "./types";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function callFn<T>(fn: string, init: RequestInit & { query?: string } = {}): Promise<T> {
  const token = await currentAccessToken();
  const res = await fetch(`${BASE}/${fn}${init.query ?? ""}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}`, ...(init.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data as T;
}

export interface PublicPlan extends BillingPlan {
  features: Array<{ feature_key: string; enabled: boolean; limit_value: number | null; limit_unit: string | null }>;
}

export const OFFICIAL_PUBLIC_PLANS: PublicPlan[] = [
  {
    id: "plan_free",
    name: "Free",
    slug: "free",
    description: "Everything you need to get started.",
    currency: "USD",
    monthly_price: 0,
    yearly_price: 0,
    trial_days: 0,
    badge: null,
    cta_text: "Current plan",
    is_highlighted: false,
    display_order: 1,
    metadata: { per_seat: false, custom_pricing: false },
    features: [
      { feature_key: "ai_generation", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "monthly_ai_credits", enabled: true, limit_value: 200, limit_unit: "credits" },
      { feature_key: "max_workspaces", enabled: true, limit_value: 1, limit_unit: "workspaces" },
      { feature_key: "max_storage_mb", enabled: true, limit_value: 500, limit_unit: "mb" },
      { feature_key: "desktop_app", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "offline_mode", enabled: true, limit_value: null, limit_unit: null },
    ],
  },
  {
    id: "plan_plus",
    name: "Plus",
    slug: "plus",
    description: "Everything you need to organize your work.",
    currency: "USD",
    monthly_price: 8,
    yearly_price: 80,
    trial_days: 14,
    badge: null,
    cta_text: "Upgrade to Plus",
    is_highlighted: false,
    display_order: 2,
    metadata: { per_seat: false, custom_pricing: false },
    features: [
      { feature_key: "ai_generation", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "monthly_ai_credits", enabled: true, limit_value: 1000, limit_unit: "credits" },
      { feature_key: "ai_image_analysis", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "ai_file_analysis", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "max_workspaces", enabled: true, limit_value: 3, limit_unit: "workspaces" },
      { feature_key: "max_storage_mb", enabled: true, limit_value: 5120, limit_unit: "mb" },
      { feature_key: "calendar_sync", enabled: true, limit_value: null, limit_unit: null },
    ],
  },
  {
    id: "plan_pro",
    name: "Pro",
    slug: "pro",
    description: "Build with AI, agents and MCP.",
    currency: "USD",
    monthly_price: 16,
    yearly_price: 160,
    trial_days: 14,
    badge: "POPULAR",
    cta_text: "Upgrade to Pro",
    is_highlighted: true,
    display_order: 3,
    metadata: { per_seat: false, custom_pricing: false },
    features: [
      { feature_key: "ai_generation", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "monthly_ai_credits", enabled: true, limit_value: 5000, limit_unit: "credits" },
      { feature_key: "custom_agents", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "mcp_access", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "max_workspaces", enabled: true, limit_value: 10, limit_unit: "workspaces" },
      { feature_key: "max_storage_mb", enabled: true, limit_value: 20480, limit_unit: "mb" },
      { feature_key: "automation", enabled: true, limit_value: null, limit_unit: null },
    ],
  },
  {
    id: "plan_team",
    name: "Team",
    slug: "team",
    description: "Powerful workspaces for teams.",
    currency: "USD",
    monthly_price: 24,
    yearly_price: 240,
    trial_days: 14,
    badge: null,
    cta_text: "Upgrade to Team",
    is_highlighted: false,
    display_order: 4,
    metadata: { per_seat: true, custom_pricing: false },
    features: [
      { feature_key: "team_collaboration", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "teamspaces", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "rbac", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "audit_logs", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "max_workspaces", enabled: true, limit_value: 25, limit_unit: "workspaces" },
      { feature_key: "max_storage_mb", enabled: true, limit_value: 51200, limit_unit: "mb" },
    ],
  },
  {
    id: "plan_enterprise",
    name: "Enterprise",
    slug: "enterprise",
    description: "Security and scale for organizations.",
    currency: "USD",
    monthly_price: 0,
    yearly_price: 0,
    trial_days: 0,
    badge: null,
    cta_text: "Contact sales",
    is_highlighted: false,
    display_order: 5,
    metadata: { per_seat: false, custom_pricing: true },
    features: [
      { feature_key: "sso", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "scim", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "max_workspaces", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "max_storage_mb", enabled: true, limit_value: null, limit_unit: null },
      { feature_key: "analytics", enabled: true, limit_value: null, limit_unit: null },
    ],
  },
];

export async function fetchPublicPlans(displayCurrency?: string): Promise<PublicPlan[]> {
  try {
    const { supabase } = await import("../supabase");
    if (!supabase) return OFFICIAL_PUBLIC_PLANS;
    const sb = supabase as unknown as { from(t: string): any };
    const { data: plans, error } = await sb
      .from("billing_plans")
      .select("*")
      .eq("status", "active")
      .eq("is_public", true)
      .order("display_order", { ascending: true });
    if (error || !plans || plans.length === 0) return OFFICIAL_PUBLIC_PLANS;
    const list = plans as unknown as BillingPlan[];
    const { data: feats } = await sb
      .from("billing_plan_features")
      .select("plan_id,feature_key,enabled,limit_value,limit_unit")
      .in("plan_id", list.map((p) => p.id));
    const byPlan = new Map<string, PublicPlan["features"]>();
    for (const f of (feats ?? []) as Array<{ plan_id: string } & PublicPlan["features"][number]>) {
      if (!byPlan.has(f.plan_id)) byPlan.set(f.plan_id, []);
      byPlan.get(f.plan_id)!.push(f);
    }
    let priced = list.map((p) => ({ ...p, features: byPlan.get(p.id) ?? [] }));
    const cur = (displayCurrency ?? "").toUpperCase();
    if (cur) {
      const { data: rows } = await sb.from("billing_plan_prices").select("*").eq("currency", cur).eq("is_active", true);
      const byId = new Map(((rows ?? []) as Array<{ plan_id: string; monthly_price: number; yearly_price: number }>).map((r) => [r.plan_id, r]));
      priced = priced.map((p) => {
        const r = byId.get(p.id);
        return r ? { ...p, currency: cur, monthly_price: Number(r.monthly_price), yearly_price: Number(r.yearly_price) } : p;
      });
    }
    return priced.length > 0 ? priced : OFFICIAL_PUBLIC_PLANS;
  } catch {
    return OFFICIAL_PUBLIC_PLANS;
  }
}

export async function fetchEntitlements(workspaceId?: string): Promise<EntitlementSnapshot> {
  return callFn<EntitlementSnapshot>("billing-entitlements", {
    method: "GET",
    query: workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "",
  });
}

export interface CheckoutResult {
  mode: "order" | "trial" | "topup" | "stripe_session";
  provider?: "stripe" | "razorpay";
  order_id?: string;
  session_id?: string;
  session_url?: string;
  amount?: number;
  amount_minor?: number;
  currency?: string;
  key_id?: string;
  subscription_id?: string;
  topup_id?: string;
  product?: { slug: string; name: string; credits?: number };
  plan?: { slug: string; name: string };
  base_amount?: number;
  discount?: number;
  tax?: number;
  seats?: number;
  trial_eligible?: boolean;
  trial_end?: string;
  email?: string;
}

export async function startCheckout(input: {
  plan_slug: string;
  billing_cycle: "monthly" | "yearly";
  coupon_code?: string;
  seats?: number;
  currency?: string;
  provider?: "stripe" | "razorpay";
}): Promise<CheckoutResult> {
  return callFn<CheckoutResult>("billing-checkout", {
    method: "POST",
    body: JSON.stringify({
      provider: "stripe",
      app_origin: typeof window !== "undefined" ? window.location.origin : undefined,
      ...input,
    }),
  });
}

export async function startTopup(product_slug: string, opts?: { currency?: string; provider?: "stripe" | "razorpay" }): Promise<CheckoutResult> {
  return callFn<CheckoutResult>("billing-checkout", {
    method: "POST",
    body: JSON.stringify({
      product_slug,
      provider: "stripe",
      app_origin: typeof window !== "undefined" ? window.location.origin : undefined,
      ...opts,
    }),
  });
}

export async function fetchTopupProducts(displayCurrency?: string): Promise<TopupProduct[]> {
  const { supabase } = await import("../supabase");
  const sb = supabase as unknown as { from(t: string): any };
  const { data, error } = await sb.from("billing_topup_products").select("*").eq("is_active", true).order("display_order", { ascending: true });
  if (error) throw error;
  const all = (data ?? []) as unknown as TopupProduct[];
  const cur = (displayCurrency ?? "").toUpperCase();
  if (!cur) return all;
  const exact = all.filter((p) => p.currency === cur);
  if (exact.length) return exact;
  const usd = all.filter((p) => p.currency === "USD");
  return usd.length ? usd : all;
}

export async function verifyPayment(input: {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  stripe_session_id?: string;
  subscription_id?: string;
  topup_id?: string;
}): Promise<{ ok: boolean; status?: string; mode?: string; credits?: number; duplicate?: boolean }> {
  return callFn("billing-verify", { method: "POST", body: JSON.stringify(input) });
}

export async function downgradePreview(plan_slug: string): Promise<{
  ok: boolean; target: string; used: Record<string, number>; limits: Record<string, number | null>;
  warnings: Array<{ key: string; used: number; allowed: number }>; effective: string | null;
}> {
  return callFn("billing-manage", { method: "POST", body: JSON.stringify({ action: "downgrade_preview", plan_slug }) });
}

export async function manageSubscription(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  return callFn("billing-manage", { method: "POST", body: JSON.stringify(input) });
}

export async function checkFeature(feature_key: string, amount = 1): Promise<{ ok: boolean; transport?: boolean;[k: string]: unknown }> {
  try {
    return await callFn("billing-usage", { method: "POST", body: JSON.stringify({ action: "check", feature_key, amount }) });
  } catch (e) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as Record<string, unknown>).code : undefined;
    // Transport failure (offline/unreachable) is flagged so callers can fail OPEN for
    // UX pre-checks. Server denials always carry a code and fail CLOSED. Either way
    // the authoritative check still runs server-side on the real operation.
    if (!code) return { ok: false, transport: true };
    return { ok: false, ...(e as Record<string, unknown>) };
  }
}

export async function consumeUsage(feature_key: string, amount = 1, workspace_id?: string): Promise<{ ok: boolean; transport?: boolean;[k: string]: unknown }> {
  try {
    return await callFn("billing-usage", { method: "POST", body: JSON.stringify({ action: "consume", feature_key, amount, workspace_id }) });
  } catch (e) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as Record<string, unknown>).code : undefined;
    if (!code) return { ok: false, transport: true };
    return { ok: false, ...(e as Record<string, unknown>) };
  }
}

export async function fetchMyInvoices(): Promise<InvoiceRow[]> {
  const { supabase } = await import("../supabase");
  const sb = supabase as unknown as { from(t: string): any };
  const { data, error } = await sb.from("billing_invoices").select("*").order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []) as unknown as InvoiceRow[];
}

export async function fetchMyPayments(): Promise<PaymentRow[]> {
  const { supabase } = await import("../supabase");
  const sb = supabase as unknown as { from(t: string): any };
  const { data, error } = await sb.from("billing_payments").select("*").order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []) as unknown as PaymentRow[];
}

export function yearlySavings(monthly: number, yearly: number): { total: number; save: number; pct: number } {
  const total = monthly * 12;
  const save = Math.max(total - yearly, 0);
  const pct = total > 0 ? Math.round((save / total) * 100) : 0;
  return { total, save, pct };
}

export function formatINR(n: number): string {
  return formatMoney(n, "INR");
}

export function formatMoney(n: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency", currency, maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
}
