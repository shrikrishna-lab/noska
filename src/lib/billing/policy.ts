// Pure billing policy helpers (mirrored in Edge Functions + Postgres).
// Unit-tested in src/lib/billing/__tests__/. Business truth lives server-side;
// this module exists so UI copy and tests share the same rules.

export const SUBSCRIPTION_TRANSITIONS: Record<string, string[]> = {
  trialing: ["active", "cancelled", "expired", "past_due"],
  pending: ["active", "trialing", "cancelled", "expired", "incomplete"],
  incomplete: ["active", "cancelled", "expired"],
  active: ["past_due", "cancelled", "paused", "expired", "unpaid"],
  past_due: ["active", "cancelled", "expired", "unpaid", "paused"],
  unpaid: ["active", "cancelled", "expired"],
  paused: ["active", "cancelled", "expired"],
  cancelled: ["expired", "active"],
  expired: [],
};

export function canTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return (SUBSCRIPTION_TRANSITIONS[from] ?? []).includes(to);
}

export function applyCouponDiscount(base: number, type: "percentage" | "fixed", value: number): { discount: number; final: number } {
  const discount = type === "percentage"
    ? Math.round(((base * value) / 100) * 100) / 100
    : Math.min(value, base);
  return { discount, final: Math.max(Math.round((base - discount) * 100) / 100, 0) };
}

/** Whether a subscription row counts as granting access right now. */
export function isAccessGranting(s: {
  status: string;
  current_period_end?: string | null;
  trial_end?: string | null;
  grace_period_until?: string | null;
  cancel_at_period_end?: boolean;
}, now = new Date()): boolean {
  const end = s.current_period_end ? new Date(s.current_period_end) : null;
  const trialEnd = s.trial_end ? new Date(s.trial_end) : null;
  const grace = s.grace_period_until ? new Date(s.grace_period_until) : null;
  switch (s.status) {
    case "active": return !end || end > now;
    case "trialing": return !trialEnd || trialEnd > now;
    case "past_due": return !grace || grace > now;
    case "cancelled": return Boolean(s.cancel_at_period_end) && (!end || end > now);
    case "paused": return !end || end > now;
    default: return false;
  }
}

/** Resolve the winning plan slug: active sub plan wins, else free. */
export function resolvePlanSlug(activeSlug: string | null, fallback = "free"): string {
  return activeSlug ?? fallback;
}

// Country → display currency. User-set billing country wins; unset → USD.
// Mirrors the Edge helper of the same name.
const EU_COUNTRIES = new Set("AT BE HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT SK SI ES SE".split(" "));
const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD", IN: "INR", GB: "GBP", CA: "CAD", AU: "AUD", JP: "JPY", SG: "SGD",
  AE: "AED", BR: "BRL", CH: "CHF", CN: "CNY", KR: "KRW", MX: "MXN", ZA: "ZAR",
};

export function currencyForCountry(country: string | null | undefined): string {
  const c = (country ?? "").trim().toUpperCase();
  if (!c) return "USD";
  if (COUNTRY_CURRENCY[c]) return COUNTRY_CURRENCY[c];
  if (EU_COUNTRIES.has(c)) return "EUR";
  return "USD";
}

/** NULL numeric limit = unlimited (Enterprise). Mirrors check_feature_access. */
export function isUnlimited(limit: number | null | undefined): boolean {
  return limit === null || limit === undefined;
}

/** Team per-seat total. Mirrors billing-checkout. */
export function perSeatTotal(unitPrice: number, seats: number): number {
  return Math.round(unitPrice * Math.max(1, Math.floor(seats || 1)) * 100) / 100;
}

/** Pick a regional price row: exact country match wins, else first active row, else null. */
export function pickRegionalPrice<T extends { country_code: string | null }>(rows: T[], country: string | null): T | null {
  if (!rows.length) return null;
  if (country) {
    const exact = rows.find((r) => r.country_code === country);
    if (exact) return exact;
  }
  return rows[0];
}

/** FIFO top-up allocation. Mirrors allocateTopupConsume: consumes oldest grants first. */
export function allocateTopup(pool: Array<{ id: string; remaining: number }>, amount: number): { allocations: Array<{ id: string; take: number }>; remainder: number } {
  let left = amount;
  const allocations: Array<{ id: string; take: number }> = [];
  for (const g of pool) {
    if (left <= 0) break;
    const take = Math.min(g.remaining, left);
    if (take > 0) allocations.push({ id: g.id, take });
    left -= take;
  }
  return { allocations, remainder: left };
}

/** Credit ledger: remaining = plan + bonus − used (null when plan is unlimited). */
export function creditRemaining(plan: number | null | undefined, bonus: number, used: number): number | null {
  if (isUnlimited(plan)) return null;
  return Math.max(Number(plan) + bonus - used, 0);
}

export interface CouponState {
  is_active: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
  max_redemptions?: number | null;
  redemption_count?: number | null;
  applicable_plan_ids?: string[] | null;
  minimum_amount?: number | null;
}

/** Pure mirror of server-side coupon validation (billing-checkout). Returns ok or a structured code. */export function couponCheck(
  coupon: CouponState | null,
  opts: { planId: string; baseAmount: number; alreadyUsed: boolean; now?: Date },
): { ok: boolean; code: string } {
  const now = opts.now ?? new Date();
  if (!coupon || !coupon.is_active) return { ok: false, code: "COUPON_INVALID" };
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return { ok: false, code: "COUPON_INVALID" };
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return { ok: false, code: "COUPON_EXPIRED" };
  if (coupon.max_redemptions != null && Number(coupon.redemption_count ?? 0) >= Number(coupon.max_redemptions)) {
    return { ok: false, code: "COUPON_MAX_REDEMPTIONS" };
  }
  if (coupon.applicable_plan_ids?.length && !coupon.applicable_plan_ids.includes(opts.planId)) {
    return { ok: false, code: "COUPON_NOT_APPLICABLE" };
  }
  if (opts.baseAmount < Number(coupon.minimum_amount ?? 0)) return { ok: false, code: "COUPON_NOT_APPLICABLE" };
  if (opts.alreadyUsed) return { ok: false, code: "COUPON_ALREADY_REDEEMED" };
  return { ok: true, code: "OK" };
}

/** Pre-tax per-seat unit in minor units for subscription-mode Checkout. Mirrors billing-checkout. */
export function subscriptionUnitMinor(total: number, tax: number, qty: number, currency: string): number {
  const factor = currency.toUpperCase() === "JPY" ? 1 : 100;
  return Math.max(Math.round(((total - tax) / Math.max(1, qty)) * factor), 0);
}

const STRIPE_STATUS_MAP: Record<string, string> = {
  trialing: "trialing", active: "active", past_due: "past_due", unpaid: "unpaid",
  incomplete: "incomplete", incomplete_expired: "expired", canceled: "cancelled",
};

/** Map a Stripe Subscription status (+pause flag) to our internal status. Mirrors billing-webhooks. */
export function mapStripeStatus(stripeStatus: string, paused: boolean): string | null {
  if (paused) return "paused";
  return STRIPE_STATUS_MAP[stripeStatus] ?? null;
}
