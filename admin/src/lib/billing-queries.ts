// Admin billing queries — all reads via admin_select RPC (server-authorized),
// all writes via admin_insert/admin_update RPCs. Every mutation writes a
// billing_audit_logs row with actor + reason.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getAdminToken } from "./supabase";
import { adminSelect } from "./queries";

function token(): string {
  const t = getAdminToken();
  if (!t) throw new Error("No admin session. Please sign in again.");
  return t;
}

async function adminInsert(table: string, data: Record<string, unknown>): Promise<string> {
  if (!supabase) throw new Error("Supabase not available");
  const { data: id, error } = await supabase.rpc("admin_insert", {
    p_session_token: token(), p_table: table, p_data: data,
  });
  if (error) throw error;
  return id as string;
}

async function adminUpdate(table: string, id: string, data: Record<string, unknown>): Promise<void> {
  if (!supabase) throw new Error("Supabase not available");
  const { error } = await supabase.rpc("admin_update", {
    p_session_token: token(), p_table: table, p_id: id, p_data: data,
  });
  if (error) throw error;
}

async function audit(action: string, entityType: string, entityId: string, targetUserId?: string | null, oldValues?: unknown, newValues?: unknown, reason?: string) {
  try {
    await adminInsert("billing_audit_logs", {
      action, entity_type: entityType, entity_id: entityId,
      target_user_id: targetUserId ?? null,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      reason: reason ?? "",
    });
  } catch { /* audit must never break the admin flow */ }
}

// ── Types ──
export interface BillingPlanRow {
  id: string; name: string; slug: string; description: string | null; status: string;
  is_public: boolean; is_highlighted: boolean; display_order: number; currency: string;
  monthly_price: number; yearly_price: number; trial_days: number; grace_period_days: number;
  badge: string | null; cta_text: string | null;
  provider_monthly_plan_id: string | null; provider_yearly_plan_id: string | null;
  metadata: unknown; created_at: string; updated_at: string;
}
export interface PlanFeatureRow {
  id: string; plan_id: string; feature_key: string; enabled: boolean;
  limit_value: number | null; limit_unit: string | null;
}
export interface FeatureCatalogRow {
  id: string; feature_key: string; display_name: string; description: string | null;
  category: string | null; is_beta: boolean; is_deprecated: boolean;
}
export interface BillingSubRow {
  id: string; user_id: string; plan_id: string | null; provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null; status: string | null; billing_cycle: string | null;
  currency: string | null; amount: number | null; trial_start: string | null; trial_end: string | null;
  current_period_start: string | null; current_period_end: string | null;
  cancel_at_period_end: boolean | null; cancelled_at: string | null;
  grace_period_until: string | null; scheduled_plan_id: string | null; created_at: string;
}
export interface BillingPaymentRow {
  id: string; user_id: string; subscription_id: string | null; provider_payment_id: string | null;
  provider_order_id: string | null; amount: number; currency: string | null; status: string | null;
  payment_method: string | null; failure_code: string | null; failure_message: string | null;
  paid_at: string | null; created_at: string;
}
export interface BillingInvoiceRow {
  id: string; user_id: string; subscription_id: string | null; invoice_number: string | null;
  status: string | null; total: number; currency: string | null; issued_at: string | null; paid_at: string | null;
  invoice_url: string | null; pdf_url: string | null;
}
export interface CouponRow {
  id: string; code: string; name: string | null; discount_type: string; discount_value: number;
  duration: string | null; max_redemptions: number | null; redemption_count: number | null;
  valid_until: string | null; minimum_amount: number | null; is_active: boolean;
}
export interface OverrideRow {
  id: string; user_id: string | null; workspace_id: string | null; feature_key: string;
  enabled: boolean; limit_value: number | null; expires_at: string | null; reason: string | null; created_at: string;
}
export interface WebhookRow {
  id: string; provider: string; event_id: string; event_type: string;
  signature_valid: boolean; processing_status: string; retry_count: number;
  processed_at: string | null; error_message: string | null; created_at: string; payload: unknown;
}
export interface BillingAuditRow {
  id: string; actor_user_id: string | null; target_user_id: string | null; action: string;
  entity_type: string; entity_id: string; reason: string | null; created_at: string;
}
export interface ConfigRow { key: string; value: unknown; updated_at: string }
export interface TopupProductRow {
  id: string; name: string; slug: string; credits: number; price: number; currency: string;
  expiry_days: number; is_active: boolean; display_order: number;
}
export interface TopupPurchaseRow {
  id: string; user_id: string; product_id: string | null; credits_granted: number;
  credits_used: number; status: string | null; expires_at: string | null; created_at: string;
}
export interface PlanPriceRow {
  id: string; plan_id: string; currency: string; country_code: string | null;
  monthly_price: number; yearly_price: number; is_active: boolean;
}
export interface TaxRateRow { id: string; country: string; name: string; rate: number; is_active: boolean }
export interface UsageRow {
  id: string; user_id: string; workspace_id: string | null; feature_key: string;
  usage_value: number; period_start: string; period_end: string; created_at: string;
}
export interface BillingCustomerRow {
  id: string; user_id: string; provider: string | null; provider_customer_id: string | null;
  email: string | null; name: string | null;
  billing_country: string | null; gstin: string | null; created_at: string;
}

// ── Reads ──
export const useBillingPlans = () => useQuery({ queryKey: ["billing", "plans"], queryFn: () => adminSelect<BillingPlanRow>("billing_plans", "*", { order: "display_order asc" }) });
export const usePlanFeatures = (planId?: string) => useQuery({
  queryKey: ["billing", "plan-features", planId],
  queryFn: () => adminSelect<PlanFeatureRow>("billing_plan_features", "*"),
  select: (rows) => (planId ? rows.filter((r) => r.plan_id === planId) : rows),
});
export const useFeatureCatalog = () => useQuery({ queryKey: ["billing", "catalog"], queryFn: () => adminSelect<FeatureCatalogRow>("billing_feature_catalog", "*") });
export const useBillingSubscriptions = () => useQuery({ queryKey: ["billing", "subscriptions"], queryFn: () => adminSelect<BillingSubRow>("billing_subscriptions", "*", { order: "created_at desc", limit: 200 }) });
export const useBillingPayments = () => useQuery({ queryKey: ["billing", "payments"], queryFn: () => adminSelect<BillingPaymentRow>("billing_payments", "*", { order: "created_at desc", limit: 200 }) });
export const useBillingInvoices = () => useQuery({ queryKey: ["billing", "invoices"], queryFn: () => adminSelect<BillingInvoiceRow>("billing_invoices", "*", { order: "created_at desc", limit: 200 }) });
export const useBillingCoupons = () => useQuery({ queryKey: ["billing", "coupons"], queryFn: () => adminSelect<CouponRow>("billing_coupons", "*", { order: "created_at desc" }) });
export const useBillingOverrides = () => useQuery({ queryKey: ["billing", "overrides"], queryFn: () => adminSelect<OverrideRow>("billing_entitlement_overrides", "*", { order: "created_at desc", limit: 200 }) });
export const useBillingWebhooks = (status?: string) => useQuery({
  queryKey: ["billing", "webhooks", status],
  queryFn: () => adminSelect<WebhookRow>("billing_webhook_events", "id,provider,event_id,event_type,signature_valid,processing_status,retry_count,processed_at,error_message,created_at", { order: "created_at desc", limit: 200 }),
  select: (rows) => (status ? rows.filter((r) => r.processing_status === status) : rows),
});
export const useBillingAudit = () => useQuery({ queryKey: ["billing", "audit"], queryFn: () => adminSelect<BillingAuditRow>("billing_audit_logs", "*", { order: "created_at desc", limit: 200 }) });
export const useBillingConfig = () => useQuery({ queryKey: ["billing", "config"], queryFn: () => adminSelect<ConfigRow>("billing_config", "*") });
export const useTopupProducts = () => useQuery({ queryKey: ["billing", "topups"], queryFn: () => adminSelect<TopupProductRow>("billing_topup_products", "*", { order: "display_order asc" }) });
export const useTopupPurchases = () => useQuery({ queryKey: ["billing", "topup-purchases"], queryFn: () => adminSelect<TopupPurchaseRow>("billing_topup_purchases", "*", { order: "created_at desc", limit: 200 }) });
export const usePlanPrices = () => useQuery({ queryKey: ["billing", "plan-prices"], queryFn: () => adminSelect<PlanPriceRow>("billing_plan_prices", "*") });
export const useTaxRates = () => useQuery({ queryKey: ["billing", "tax"], queryFn: () => adminSelect<TaxRateRow>("billing_tax_rates", "*") });
export const useUsageRecords = () => useQuery({ queryKey: ["billing", "usage"], queryFn: () => adminSelect<UsageRow>("billing_usage_records", "*", { order: "created_at desc", limit: 200 }) });
export const useBillingCustomers = () => useQuery({ queryKey: ["billing", "customers"], queryFn: () => adminSelect<BillingCustomerRow>("billing_customers", "*", { order: "created_at desc", limit: 200 }) });
export const useUserBillingSubs = (userId?: string) => useQuery({
  queryKey: ["billing", "user-subs", userId],
  queryFn: () => adminSelect<BillingSubRow>("billing_subscriptions", "*", { eq: ["user_id", userId ?? ""], limit: 20 }),
  enabled: !!userId,
});
export const useUserBillingPayments = (userId?: string) => useQuery({
  queryKey: ["billing", "user-payments", userId],
  queryFn: () => adminSelect<BillingPaymentRow>("billing_payments", "*", { eq: ["user_id", userId ?? ""], limit: 20 }),
  enabled: !!userId,
});
export const useUserBillingOverrides = (userId?: string) => useQuery({
  queryKey: ["billing", "user-overrides", userId],
  queryFn: () => adminSelect<OverrideRow>("billing_entitlement_overrides", "*", { eq: ["user_id", userId ?? ""], limit: 20 }),
  enabled: !!userId,
});

// ── Mutations (all audited) ──
function useBillingMutation<TInput>(fn: (input: TInput) => Promise<unknown>, keys: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { for (const k of keys) qc.invalidateQueries({ queryKey: k }); },
  });
}

export const useUpdatePlan = () => useBillingMutation(
  async (input: { id: string; patch: Record<string, unknown>; reason?: string }) => {
    await adminUpdate("billing_plans", input.id, input.patch);
    await audit("plan_updated", "billing_plan", input.id, null, null, input.patch, input.reason ?? "");
  },
  [["billing", "plans"]],
);

export const useUpsertPlanFeature = () => useBillingMutation(
  async (input: { plan_id: string; feature_key: string; enabled: boolean; limit_value?: number | null; reason?: string }) => {
    const rows = await adminSelect<PlanFeatureRow>("billing_plan_features", "*");
    const hit = rows.find((r) => r.plan_id === input.plan_id && r.feature_key === input.feature_key);
    if (hit) {
      await adminUpdate("billing_plan_features", hit.id, { enabled: input.enabled, limit_value: input.limit_value ?? null });
    } else {
      await adminInsert("billing_plan_features", { plan_id: input.plan_id, feature_key: input.feature_key, enabled: input.enabled, limit_value: input.limit_value ?? null });
    }
    await audit("plan_feature_changed", "billing_plan_feature", `${input.plan_id}:${input.feature_key}`, null, null, input, input.reason ?? "");
  },
  [["billing", "plan-features"]],
);

export const useCreateCoupon = () => useBillingMutation(
  async (input: Record<string, unknown> & { reason?: string }) => {
    const { reason, ...data } = input;
    const id = await adminInsert("billing_coupons", { ...data, code: String(data.code).toUpperCase() });
    await audit("coupon_created", "billing_coupon", id, null, null, data, reason ?? "");
    return id;
  },
  [["billing", "coupons"]],
);

export const useUpdateCoupon = () => useBillingMutation(
  async (input: { id: string; patch: Record<string, unknown>; reason?: string }) => {
    await adminUpdate("billing_coupons", input.id, input.patch);
    await audit("coupon_updated", "billing_coupon", input.id, null, null, input.patch, input.reason ?? "");
  },
  [["billing", "coupons"]],
);

export const useCreateOverride = () => useBillingMutation(
  async (input: { user_id: string; feature_key: string; enabled?: boolean; limit_value?: number | null; expires_at?: string | null; reason: string }) => {
    const id = await adminInsert("billing_entitlement_overrides", {
      user_id: input.user_id, feature_key: input.feature_key,
      enabled: input.enabled ?? true, limit_value: input.limit_value ?? null,
      expires_at: input.expires_at ?? null, reason: input.reason,
    });
    await audit("override_created", "billing_override", id, input.user_id, null, input, input.reason);
    return id;
  },
  [["billing", "overrides"]],
);

export const useRemoveOverride = () => useBillingMutation(
  async (input: { id: string; target_user_id?: string | null; reason: string }) => {
    await adminUpdate("billing_entitlement_overrides", input.id, { expires_at: new Date().toISOString() });
    await audit("override_removed", "billing_override", input.id, input.target_user_id ?? null, null, null, input.reason);
  },
  [["billing", "overrides"]],
);

export const useAdminCancelSubscription = () => useBillingMutation(
  async (input: { id: string; at_period_end?: boolean; reason: string }) => {
    await adminUpdate("billing_subscriptions", input.id, {
      cancel_at_period_end: input.at_period_end ?? true,
      cancelled_at: new Date().toISOString(),
    });
    await audit("subscription_cancelled", "billing_subscription", input.id, null, null, input, input.reason);
  },
  [["billing", "subscriptions"]],
);

export const useAdminSetConfig = () => useBillingMutation(
  async (input: { key: string; value: unknown; reason?: string }) => {
    if (!supabase) throw new Error("Supabase not available");
    const { error } = await supabase.rpc("admin_set_billing_config", {
      p_session_token: token(), p_key: input.key,
      p_value: JSON.stringify(input.value), p_reason: input.reason ?? "",
    });
    if (error) throw error;
  },
  [["billing", "config"]],
);

export const useCreateFeature = () => useBillingMutation(
  async (input: { feature_key: string; display_name: string; description?: string; category?: string; reason?: string }) => {
    const id = await adminInsert("billing_feature_catalog", {
      feature_key: input.feature_key, display_name: input.display_name,
      description: input.description ?? "", category: input.category ?? "general",
    });
    await audit("feature_created", "billing_feature", id, null, null, input, input.reason ?? "");
    return id;
  },
  [["billing", "catalog"]],
);

export const useUpdateFeature = () => useBillingMutation(
  async (input: { id: string; patch: Record<string, unknown>; reason?: string }) => {
    await adminUpdate("billing_feature_catalog", input.id, input.patch);
    await audit("feature_updated", "billing_feature", input.id, null, null, input.patch, input.reason ?? "");
  },
  [["billing", "catalog"]],
);

export const useCreateTopupProduct = () => useBillingMutation(
  async (input: Record<string, unknown> & { reason?: string }) => {
    const { reason, ...data } = input;
    const id = await adminInsert("billing_topup_products", data);
    await audit("topup_created", "billing_topup", id, null, null, data, reason ?? "");
    return id;
  },
  [["billing", "topups"]],
);

export const useUpdateTopupProduct = () => useBillingMutation(
  async (input: { id: string; patch: Record<string, unknown>; reason?: string }) => {
    await adminUpdate("billing_topup_products", input.id, input.patch);
    await audit("topup_updated", "billing_topup", input.id, null, null, input.patch, input.reason ?? "");
  },
  [["billing", "topups"]],
);

export const useUpsertPlanPrice = () => useBillingMutation(
  async (input: { plan_id: string; currency: string; country_code?: string | null; monthly_price: number; yearly_price: number; reason?: string }) => {
    const rows = await adminSelect<PlanPriceRow>("billing_plan_prices", "*");
    const hit = rows.find((r) => r.plan_id === input.plan_id && r.currency === input.currency.toUpperCase());
    if (hit) {
      await adminUpdate("billing_plan_prices", hit.id, {
        monthly_price: input.monthly_price, yearly_price: input.yearly_price,
        country_code: input.country_code ?? null, is_active: true,
      });
    } else {
      await adminInsert("billing_plan_prices", {
        plan_id: input.plan_id, currency: input.currency.toUpperCase(),
        country_code: input.country_code ?? null,
        monthly_price: input.monthly_price, yearly_price: input.yearly_price,
      });
    }
    await audit("regional_price_set", "billing_plan_price", `${input.plan_id}:${input.currency}`, null, null, input, input.reason ?? "");
  },
  [["billing", "plan-prices"]],
);

export const useCreateTaxRate = () => useBillingMutation(
  async (input: { country: string; name: string; rate: number; reason?: string }) => {
    const id = await adminInsert("billing_tax_rates", { country: input.country.toUpperCase(), name: input.name, rate: input.rate });
    await audit("tax_created", "billing_tax", id, null, null, input, input.reason ?? "");
    return id;
  },
  [["billing", "tax"]],
);

export const useUpdateTaxRate = () => useBillingMutation(
  async (input: { id: string; patch: Record<string, unknown>; reason?: string }) => {
    await adminUpdate("billing_tax_rates", input.id, input.patch);
    await audit("tax_updated", "billing_tax", input.id, null, null, input.patch, input.reason ?? "");
  },
  [["billing", "tax"]],
);

export const useUserBillingCustomer = (userId?: string) => useQuery({
  queryKey: ["billing", "user-customer", userId],
  queryFn: () => adminSelect<BillingCustomerRow>("billing_customers", "*", { eq: ["user_id", userId ?? ""], limit: 5 }),
  enabled: !!userId,
});

/** Deep link into the Stripe Dashboard (works in test + live mode). Null for non-Stripe ids. */
export function stripeDashboardUrl(kind: "subscriptions" | "payments" | "customers" | "invoices", id: string | null | undefined): string | null {
  if (!id) return null;
  if (kind === "subscriptions" && !id.startsWith("sub_")) return null;
  if (kind === "payments" && !(id.startsWith("pi_") || id.startsWith("ch_"))) return null;
  if (kind === "customers" && !id.startsWith("cus_")) return null;
  if (kind === "invoices" && !id.startsWith("in_")) return null;
  return `https://dashboard.stripe.com/${kind}/${id}`;
}

export function downloadCSV(filename: string, rows: Array<Record<string, unknown>>) {  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
