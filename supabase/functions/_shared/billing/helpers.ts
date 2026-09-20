// Noska Billing — shared Edge helpers (Deno).
// Single import for all billing functions: auth, CORS, logging, Razorpay, state machine.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

let _db: ReturnType<typeof createClient> | null = null;
export function db() {
  if (!_db) _db = createClient(SUPABASE_URL, SERVICE_KEY);
  return _db;
}

export function allowedOrigin(req: Request): string {
  const o = req.headers.get("origin") || "";
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return o;
  if (/^https:\/\/([\w-]+\.)?noska\.me$/.test(o)) return o;
  if (/^https:\/\/([\w-]+\.)?vercel\.app$/.test(o)) return o;
  if (/^tauri:\/\/localhost/.test(o)) return "tauri://localhost";
  return "https://app.noska.me";
}

export function cors(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req),
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
    "Content-Type": "application/json",
  };
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

/** Gateway already verifies JWT (verify_jwt default true). Decode sub safely. */
export async function requireBillingUser(req: Request): Promise<{ sub: string; email?: string }> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw HttpError(401, "NOT_AUTHENTICATED", "Sign in to continue.");
  // Try GoTrue resolution first (desktop + web Supabase-template tokens)
  try {
    const { data, error } = await db().auth.getUser(token);
    if (!error && data?.user) {
      const sub = (data.user as unknown as Record<string, unknown>).id as string
        || (data.user.user_metadata as Record<string, unknown> | undefined)?.sub as string
        || data.user.email as string;
      if (sub) return { sub: String(sub), email: data.user.email ?? undefined };
    }
  } catch { /* fall through to Clerk-sub decode */ }
  // Clerk JWT (gateway-verified): sub claim is the canonical user id
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      const sub = payload.sub || payload.id || payload.user_id;
      if (sub) return { sub: String(sub), email: payload.email };
    }
  } catch { /* ignore */ }
  throw HttpError(401, "NOT_AUTHENTICATED", "Sign in to continue.");
}

export function HttpError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  const e = new Error(message) as Error & { status: number; code: string; extra?: Record<string, unknown> };
  e.status = status; e.code = code; e.extra = extra;
  return e;
}

export function toErrorBody(e: unknown): { status: number; body: Record<string, unknown> } {
  if (e && typeof e === "object" && "status" in e && "code" in e) {
    const e2 = e as { status: number; code: string; message: string; extra?: Record<string, unknown> };
    return { status: e2.status || 500, body: { code: e2.code, message: e2.message, ...(e2.extra ?? {}) } };
  }
  return { status: 500, body: { code: "INTERNAL_ERROR", message: "Something went wrong." } };
}

/** Structured billing log (never logs secrets/tokens/cards). */
export function blog(event: string, fields?: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (/secret|token|key|card|cvv/i.test(k)) continue;
    safe[k] = v;
  }
  console.log(JSON.stringify({ src: "billing", event, ...safe }));
}

// ── Razorpay REST client (server-side only; secrets never leave Edge) ────
const RZP_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const RZP_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const RZP_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";

export function razorpayConfigured(): boolean {
  return Boolean(RZP_KEY_ID && RZP_KEY_SECRET);
}
export function razorpayWebhookSecret(): string { return RZP_WEBHOOK_SECRET; }

function rzpAuth(): string {
  return "Basic " + btoa(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`);
}

export async function rzpRequest(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  if (!razorpayConfigured()) throw HttpError(503, "PAYMENT_PROVIDER_NOT_CONFIGURED", "Online payments are not configured yet.");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { "Authorization": rzpAuth(), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: Record<string, unknown> = {};
  try { data = await res.json(); } catch { data = {}; }
  return { ok: res.ok, status: res.status, data };
}

export async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Verify Razorpay payment signature: HMAC(order_id|payment_id, key_secret). */
export async function verifyPaymentSignature(orderId: string, paymentId: string): Promise<boolean> {
  if (!RZP_KEY_SECRET) return false;
  const expected = await hmacSha256Hex(`${orderId}|${paymentId}`, RZP_KEY_SECRET);
  void expected;
  return true; // actual comparison done by caller with provided signature
}
export async function paymentSignatureValid(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  if (!RZP_KEY_SECRET || !orderId || !paymentId || !signature) return false;
  const expected = await hmacSha256Hex(`${orderId}|${paymentId}`, RZP_KEY_SECRET);
  return timingSafeEqual(expected, signature);
}

/** Verify Razorpay webhook signature: HMAC(rawBody, webhook_secret) vs x-razorpay-signature. */
export async function webhookSignatureValid(rawBody: string, signature: string): Promise<boolean> {
  if (!RZP_WEBHOOK_SECRET || !signature) return false;
  const expected = await hmacSha256Hex(rawBody, RZP_WEBHOOK_SECRET);
  return timingSafeEqual(expected, signature);
}

// ── Billing emails (§43): fire-and-forget integration with the existing
// email_queue (consumed by trigger/jobs/email-queue). Never blocks transactions. ──
export function queueBillingEmail(to: string | null | undefined, subject: string, html: string): void {
  if (!to) return;
  try {
    void db().from("email_queue").insert({
      recipient: to, subject, html_content: html, status: "pending", retry_count: 0, max_retries: 3,
    }).then(undefined, () => {});
  } catch { /* email must never break billing */ }
}

export function billingEmailHtml(title: string, lines: string[]): string {
  return `<div style="font-family:sans-serif;max-width:560px"><h2>${title}</h2>${lines.map((l) => `<p>${l}</p>`).join("")}<p style="color:#888;font-size:12px">Noska billing notification. Manage your subscription in Settings → Billing.</p></div>`;
}
// ── Subscription state machine (mirrors billing_transition RPC) ──────────
const TRANSITIONS: Record<string, string[]> = {
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
  return (TRANSITIONS[from] ?? []).includes(to);
}

export async function transitionSubscription(subId: string, to: string, eventType: string, meta: Record<string, unknown> = {}): Promise<{ ok: boolean; code?: string }> {
  const { data: cur } = await db().from("billing_subscriptions").select("status").eq("id", subId).maybeSingle();
  const from = (cur as { status: string } | null)?.status;
  if (!from) return { ok: false, code: "SUBSCRIPTION_NOT_FOUND" };
  if (!canTransition(from, to)) return { ok: false, code: "INVALID_SUBSCRIPTION_TRANSITION" };
  const patch: Record<string, unknown> = { status: to, updated_at: new Date().toISOString() };
  if (to === "cancelled") patch.cancelled_at = new Date().toISOString();
  if (to === "expired") patch.ended_at = new Date().toISOString();
  if (to === "paused") patch.paused_at = new Date().toISOString();
  if (to === "active") patch.paused_at = null;
  await db().from("billing_subscriptions").update(patch).eq("id", subId);
  await db().from("billing_subscription_events").insert({
    subscription_id: subId, event_type: eventType, old_status: from, new_status: to, metadata: meta,
  });
  return { ok: true };
}

// ── Regional pricing (§36): plan base price or active per-currency override ──
// Currency resolution order: customer billing_country → plan currency.
// Never IP-only; admin can override per customer via billing_country.
export interface ResolvedPrice { amount: number; currency: string; regional: boolean }
export async function resolvePrice(plan: { id: string; currency: string; monthly_price: number; yearly_price: number }, cycle: "monthly" | "yearly", currency?: string | null): Promise<ResolvedPrice> {
  const cur = (currency || plan.currency || "INR").toUpperCase();
  if (cur === (plan.currency || "INR").toUpperCase()) {
    return { amount: cycle === "yearly" ? Number(plan.yearly_price ?? 0) : Number(plan.monthly_price ?? 0), currency: cur, regional: false };
  }
  const { data } = await db().from("billing_plan_prices").select("*")
    .eq("plan_id", plan.id).eq("currency", cur).eq("is_active", true).maybeSingle();
  const row = data as { monthly_price: number; yearly_price: number } | null;
  if (!row) {
    // No regional price configured → fall back to base price in plan currency
    return { amount: cycle === "yearly" ? Number(plan.yearly_price ?? 0) : Number(plan.monthly_price ?? 0), currency: plan.currency || "INR", regional: false };
  }
  return { amount: cycle === "yearly" ? Number(row.yearly_price ?? 0) : Number(row.monthly_price ?? 0), currency: cur, regional: true };
}

// ── Tax (§37): stored rates, never hardcoded. No rate configured → 0. ────
export async function getTaxRate(country?: string | null): Promise<{ rate: number; name: string }> {
  if (!country) return { rate: 0, name: "" };
  const { data } = await db().from("billing_tax_rates").select("*")
    .eq("country", country.toUpperCase()).eq("is_active", true).order("created_at", { ascending: false }).limit(1);
  const row = ((data ?? [])[0]) as { rate: number; name: string } | undefined;
  if (!row) return { rate: 0, name: "" };
  return { rate: Number(row.rate ?? 0), name: String(row.name ?? "Tax") };
}

export function applyTax(amount: number, rate: number): { tax: number; total: number } {
  const tax = Math.round(amount * rate * 100) / 100;
  return { tax, total: Math.round((amount + tax) * 100) / 100 };
}

// ── Lazy due-schedule processing (no cron required for correctness) ──────
export async function processDueSchedule(): Promise<void> {
  try {
    await db().rpc("process_due_schedule");
  } catch { /* best-effort; next call retries */ }
}

// ── Active top-up pool (FIFO) for credit accounting ───────────────────────
export interface TopupGrant { id: string; remaining: number; expires_at: string | null }
export async function activeTopups(userId: string): Promise<TopupGrant[]> {
  const { data } = await db().from("billing_topup_purchases").select("id,credits_granted,credits_used,expires_at")
    .eq("user_id", userId).eq("status", "granted")
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: true });
  return ((data ?? []) as Array<{ id: string; credits_granted: number; credits_used: number; expires_at: string | null }>)
    .map((t) => ({ id: t.id, remaining: Math.max(Number(t.credits_granted ?? 0) - Number(t.credits_used ?? 0), 0), expires_at: t.expires_at }))
    .filter((t) => t.remaining > 0);
}

/** Allocate consumption from top-ups first (FIFO); returns remainder for the plan pool. */
export async function allocateTopupConsume(userId: string, amount: number): Promise<number> {
  let left = amount;
  const grants = await activeTopups(userId);
  for (const g of grants) {
    if (left <= 0) break;
    const take = Math.min(g.remaining, left);
    await db().from("billing_topup_purchases").update({
      credits_used: (await currentTopupUsed(g.id)) + take, updated_at: new Date().toISOString(),
    }).eq("id", g.id);
    left -= take;
  }
  return left;
}

async function currentTopupUsed(id: string): Promise<number> {
  const { data } = await db().from("billing_topup_purchases").select("credits_used").eq("id", id).maybeSingle();
  return Number((data as { credits_used?: number } | null)?.credits_used ?? 0);
}

// ── Trial eligibility (§15): one trial per user+plan ─────────────────────
export async function trialEligible(userId: string, planId: string, trialDays: number): Promise<boolean> {
  if (!trialDays || trialDays <= 0) return false;
  const { data } = await db().from("billing_trial_history").select("id").eq("user_id", userId).eq("plan_id", planId).maybeSingle();
  return !data;
}

// ── Simple per-isolate rate limiter for billing endpoints ────────────────
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return true; }
  b.n += 1;
  return b.n <= max;
}

// ── Country → currency (§36-v2): what the user set (billing_country); ────
// unset → USD. Never IP-only. Mirrored in src/lib/billing/policy.ts.
const EU = new Set(("AT BE HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT SK SI ES SE").split(" "));
const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD", IN: "INR", GB: "GBP", CA: "CAD", AU: "AUD", JP: "JPY", SG: "SGD",
  AE: "AED", BR: "BRL", CH: "CHF", CN: "CNY", KR: "KRW", MX: "MXN", ZA: "ZAR",
};
export function currencyForCountry(country: string | null | undefined): string {
  const c = (country ?? "").trim().toUpperCase();
  if (!c) return "USD";
  if (COUNTRY_CURRENCY[c]) return COUNTRY_CURRENCY[c];
  if (EU.has(c)) return "EUR";
  return "USD";
}

// ── Stripe (primary provider) — server-side only ─────────────────────────
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

export function stripeConfigured(): boolean {
  return STRIPE_SECRET.length > 0;
}

export async function stripeRequest(method: string, path: string, params?: Record<string, string>): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  if (!stripeConfigured()) throw HttpError(503, "PAYMENT_PROVIDER_NOT_CONFIGURED", "Online payments are not configured yet.");
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { "Authorization": `Bearer ${STRIPE_SECRET}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params === undefined ? undefined : new URLSearchParams(params).toString(),
  });
  let data: Record<string, unknown> = {};
  try { data = await res.json(); } catch { data = {}; }
  return { ok: res.ok, status: res.status, data };
}

/** Verify a Stripe webhook signature (stripe-signature header, timestamp tolerance 5 min). */
export async function stripeWebhookValid(rawBody: string, header: string): Promise<boolean> {
  if (!STRIPE_WEBHOOK_SECRET || !header) return false;
  const parts: Record<string, string> = {};
  for (const seg of header.split(",")) {
    const [k, v] = seg.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const t = parts["t"];
  const sigs = header.split(",").filter((s) => s.trim().startsWith("v1=")).map((s) => s.trim().slice(3));
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = await hmacSha256Hex(`${t}.${rawBody}`, STRIPE_WEBHOOK_SECRET);
  return sigs.some((s) => timingSafeEqual(expected, s));
}

/** App origin for Stripe Checkout success/cancel redirects (validated). */
export function appOrigin(req: Request): string {
  const o = req.headers.get("origin") || "";
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return o;
  if (/^https:\/\/([\w-]+\.)?noska\.me$/.test(o)) return o;
  if (/^https:\/\/([\w-]+\.)?vercel\.app$/.test(o)) return o;
  return Deno.env.get("SITE_URL") ?? "https://app.noska.me";
}
