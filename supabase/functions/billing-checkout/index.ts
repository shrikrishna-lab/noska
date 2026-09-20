// POST /billing-checkout — provider-abstracted checkout (Stripe primary, Razorpay supported).
// Plan body: { plan_slug, billing_cycle, coupon_code?, seats?, currency?, provider? }
// Top-up body: { product_slug, currency?, provider? }
// Server-validates plan/product, coupon, trial eligibility; server-calculates price,
// tax, seats. NEVER grants access — only billing-verify / webhooks activate.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { db, cors, json, requireBillingUser, toErrorBody, blog, HttpError, rateLimit, razorpayConfigured, rzpRequest, stripeConfigured, stripeRequest, currencyForCountry, trialEligible, getTaxRate, applyTax, queueBillingEmail, billingEmailHtml } from "../_shared/billing/helpers.ts";

type Provider = "stripe" | "razorpay";
function pickProvider(body: Record<string, unknown>): Provider {
  const want = String((body.provider as string | undefined) ?? "").toLowerCase();
  if (want === "razorpay") return "razorpay";
  return "stripe"; // default
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { code: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireBillingUser(req);
    if (!rateLimit("checkout:" + user.sub, 10)) return json(req, 429, { code: "RATE_LIMITED", message: "Too many checkout attempts. Try again shortly." });
    const body = await req.json().catch(() => ({}));
    const provider = pickProvider(body);
    if (typeof body.product_slug === "string" && body.product_slug.trim()) {
      return await checkoutTopup(req, user, body, provider, originOf(body));
    }
    return await checkoutPlan(req, user, body, provider, originOf(body));
  } catch (e) {
    const { status, body } = toErrorBody(e);
    return json(req, status, body);
  }
});

function originOf(body: Record<string, unknown>): string {
  const o = String((body.app_origin as string | undefined) ?? "");
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return o;
  if (/^https:\/\/([\w-]+\.)?noska\.me$/.test(o)) return o;
  if (/^https:\/\/([\w-]+\.)?vercel\.app$/.test(o)) return o;
  return "https://app.noska.me";
}

interface PricedPlan {
  p: {
    id: string; name: string; slug: string; currency: string;
    monthly_price: number; yearly_price: number; trial_days: number;
  };
  perSeat: boolean; seats: number; currency: string; unitBase: number;
  baseAmount: number; discount: number; couponId: string | null; couponCode: string | null;
  tax: number; total: number; email: string | null;
  /** Admin-configured Stripe Price ID for this cycle (Phase 1 catalog). Null → inline price_data. */
  stripePriceId: string | null;
  trialDays: number;
  billingCycle: string;
}

async function pricePlan(user: { sub: string; email?: string }, body: Record<string, unknown>, provider: Provider): Promise<PricedPlan> {
  const planSlug = String(body.plan_slug ?? "").trim().toLowerCase();
  const billingCycle = String(body.billing_cycle ?? "monthly").trim().toLowerCase();
  const couponCode = typeof body.coupon_code === "string" && body.coupon_code.trim() ? body.coupon_code.trim() : null;
  const seats = Math.max(1, Math.min(1000, Math.floor(Number(body.seats ?? 1) || 1)));
  const wantCurrency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : null;
  if (!planSlug) throw HttpError(400, "INVALID_REQUEST", "plan_slug is required.");
  if (billingCycle !== "monthly" && billingCycle !== "yearly") throw HttpError(400, "INVALID_REQUEST", "billing_cycle must be monthly or yearly.");
  blog("checkout_started", { plan: planSlug, cycle: billingCycle, has_coupon: Boolean(couponCode), seats });

  const { data: plan } = await db().from("billing_plans").select("*").eq("slug", planSlug).maybeSingle();
  const p = plan as PricedPlan["p"] & { status: string; is_public: boolean; metadata: Record<string, unknown> | null } | null;
  if (!p || p.status !== "active" || !p.is_public) throw HttpError(404, "PLAN_NOT_FOUND", "This plan is not available.");
  if (p.slug === "free") throw HttpError(400, "PLAN_UNAVAILABLE", "The Free plan needs no checkout.");
  if (p.slug === "enterprise") throw HttpError(400, "PLAN_UNAVAILABLE", "Enterprise uses custom contracts. Contact sales to get started.");
  const perSeat = Boolean(p.metadata?.per_seat);
  if (!perSeat && seats > 1) throw HttpError(400, "INVALID_REQUEST", "Seats only apply to the Team plan.");

  const { data: profile } = await db().from("user_profiles").select("email,user_name").eq("user_id", user.sub).maybeSingle();
  const email = user.email ?? (profile as { email?: string } | null)?.email ?? null;
  const name = (profile as { user_name?: string } | null)?.user_name ?? null;
  await db().from("billing_customers").upsert(
    { user_id: user.sub, provider, email, name },
    { onConflict: "user_id,provider" },
  );
  const { data: custRows } = await db().from("billing_customers").select("billing_country").eq("user_id", user.sub).limit(5);
  const country = (((custRows ?? []) as Array<{ billing_country?: string }>).find((r) => r.billing_country)?.billing_country) ?? null;

  // Currency: explicit request (validated) → country-mapped regional → country fallback → USD → base.
  const { data: regional } = await db().from("billing_plan_prices").select("*").eq("plan_id", p.id).eq("is_active", true).limit(20);
  const rows = (regional ?? []) as Array<{ currency: string; monthly_price: number; yearly_price: number; country_code: string | null }>;
  let currency = p.currency || "INR";
  let unitBase = billingCycle === "yearly" ? Number(p.yearly_price ?? 0) : Number(p.monthly_price ?? 0);
  const applyRow = (r: { currency: string; monthly_price: number; yearly_price: number }) => {
    currency = r.currency;
    unitBase = billingCycle === "yearly" ? Number(r.yearly_price ?? 0) : Number(r.monthly_price ?? 0);
  };
  let matched = false;
  if (wantCurrency) {
    const hit = rows.find((r) => r.currency === wantCurrency) ?? (wantCurrency === (p.currency || "INR").toUpperCase() ? null : null);
    if (hit) { applyRow(hit); matched = true; }
    else if (wantCurrency === (p.currency || "INR").toUpperCase()) { matched = true; }
    if (!matched) throw HttpError(400, "PLAN_UNAVAILABLE", `This plan is not priced in ${wantCurrency} yet.`);
  }
  if (!matched && country) {
    const hit = rows.find((r) => r.country_code === country) ?? rows.find((r) => r.currency === currencyForCountry(country));
    if (hit) { applyRow(hit); matched = true; }
  }
  if (!matched) {
    const usd = rows.find((r) => r.currency === "USD");
    if (usd && currency !== "USD") { applyRow(usd); matched = true; }
  }
  void matched;
  const baseAmount = Math.round(unitBase * (perSeat ? seats : 1) * 100) / 100;

  // Coupon validation server-side
  let discount = 0;
  let couponId: string | null = null;
  if (couponCode) {
    const { data: c } = await db().from("billing_coupons").select("*").ilike("code", couponCode).maybeSingle();
    const coupon = c as {
      id: string; discount_type: string; discount_value: number;
      max_redemptions: number | null; redemption_count: number; valid_from: string | null; valid_until: string | null;
      minimum_amount: number; applicable_plan_ids: string[] | null; is_active: boolean;
    } | null;
    if (!coupon || !coupon.is_active) throw HttpError(400, "COUPON_INVALID", "This coupon is not valid.");
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) throw HttpError(400, "COUPON_EXPIRED", "This coupon has expired.");
    if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) throw HttpError(400, "COUPON_INVALID", "This coupon is not active yet.");
    if (coupon.max_redemptions !== null && Number(coupon.redemption_count) >= Number(coupon.max_redemptions)) {
      throw HttpError(400, "COUPON_MAX_REDEMPTIONS", "This coupon has reached its redemption limit.");
    }
    if (coupon.applicable_plan_ids?.length && !coupon.applicable_plan_ids.includes(p.id)) {
      throw HttpError(400, "COUPON_NOT_APPLICABLE", "This coupon does not apply to the selected plan.");
    }
    if (baseAmount < Number(coupon.minimum_amount ?? 0)) {
      throw HttpError(400, "COUPON_NOT_APPLICABLE", "This coupon requires a higher plan amount.");
    }
    const { data: dup } = await db().from("billing_coupon_redemptions").select("id").eq("coupon_id", coupon.id).eq("user_id", user.sub).limit(1);
    if ((dup ?? []).length > 0) throw HttpError(400, "COUPON_ALREADY_REDEEMED", "You have already used this coupon.");
    discount = coupon.discount_type === "percentage"
      ? Math.round((baseAmount * Number(coupon.discount_value) / 100) * 100) / 100
      : Math.min(Number(coupon.discount_value), baseAmount);
    couponId = coupon.id;
  }

  const finalAmount = Math.max(Math.round((baseAmount - discount) * 100) / 100, 0);
  const taxInfo = await getTaxRate(country);
  const { tax, total } = applyTax(finalAmount, taxInfo.rate);
  const prow = p as unknown as Record<string, unknown>;
  const stripePriceId = (billingCycle === "yearly" ? prow.provider_yearly_plan_id : prow.provider_monthly_plan_id) as string | null || null;
  return { p, perSeat, seats, currency, unitBase, baseAmount, discount, couponId, couponCode, tax, total, email, stripePriceId, trialDays: Number(prow.trial_days ?? 0), billingCycle };
}

async function checkoutPlan(req: Request, user: { sub: string; email?: string }, body: Record<string, unknown>, provider: Provider, origin: string): Promise<Response> {
  const priced = await pricePlan(user, body, provider);
  const { p, currency, total } = priced;
  const billingCycle = String(body.billing_cycle ?? "monthly").toLowerCase();

  const eligible = await trialEligible(user.sub, p.id, Number((p as unknown as { trial_days: number }).trial_days ?? 0));

  const { data: existing } = await db().from("billing_subscriptions").select("id,status,plan_id,billing_cycle")
    .eq("user_id", user.sub).eq("plan_id", p.id).eq("billing_cycle", billingCycle)
    .in("status", ["active", "trialing", "past_due", "pending", "incomplete"]).limit(1);
  if ((existing ?? []).length > 0) {
    return json(req, 409, { code: "SUBSCRIPTION_ALREADY_ACTIVE", message: "You already have an active subscription to this plan." });
  }

  // Free-trial-without-payment path
  if (eligible && total === 0) {
    const trialDays = Number((p as unknown as { trial_days: number }).trial_days ?? 0);
    const nowT = new Date();
    const trialEnd = new Date(nowT.getTime() + trialDays * 86400000);
    const { data: created, error: insErr } = await db().from("billing_subscriptions").insert({
      user_id: user.sub, plan_id: p.id, provider, status: "trialing",
      billing_cycle: billingCycle, currency, amount: priced.baseAmount,
      trial_start: nowT.toISOString(), trial_end: trialEnd.toISOString(),
      current_period_start: nowT.toISOString(), current_period_end: trialEnd.toISOString(),
      coupon_id: priced.couponId,
    }).select("id").single();
    if (insErr || !created) throw HttpError(500, "CHECKOUT_FAILED", "Could not start the trial.");
    const sid = (created as { id: string }).id;
    await db().from("billing_trial_history").upsert({ user_id: user.sub, plan_id: p.id, started_at: nowT.toISOString(), ended_at: trialEnd.toISOString() }, { onConflict: "user_id,plan_id" });
    await db().from("billing_subscription_events").insert({ subscription_id: sid, event_type: "created", old_status: null, new_status: "trialing", metadata: { source: "checkout", coupon: priced.couponCode } });
    if (priced.couponId) {
      await db().from("billing_coupon_redemptions").insert({ coupon_id: priced.couponId, user_id: user.sub, subscription_id: sid, discount_amount: priced.discount });
      await bumpCoupon(priced.couponId);
    }
    blog("checkout_completed", { mode: "trial", plan: p.slug });
    queueBillingEmail(priced.email, `Your ${p.name} trial started`, billingEmailHtml("Trial started", [`Your ${p.name} trial ends on ${trialEnd.toLocaleDateString()}. Enjoy Noska!`]));
    return json(req, 200, { mode: "trial", subscription_id: sid, plan: { slug: p.slug, name: p.name }, trial_end: trialEnd.toISOString() });
  }

  if (provider === "stripe") {
    if (!stripeConfigured()) {
      return json(req, 503, { code: "PAYMENT_PROVIDER_NOT_CONFIGURED", message: "Online payments are not configured yet. Contact support." });
    }
    const sid = await createPendingSubscription(user, priced, billingCycle, null, provider);
    // Reuse one Stripe Customer per account (needed for portal + invoices).
    const customerId = await ensureStripeCustomer(user.sub, priced.email);
    const qty = priced.perSeat ? priced.seats : 1;
    const interval = billingCycle === "yearly" ? "year" : "month";
    const minorFactor = currency === "JPY" ? 1 : 100;
    const params: Record<string, string> = {
      mode: "subscription",
      "success_url": `${origin}/billing/return?session_id={CHECKOUT_SESSION_ID}&subscription_id=${sid}`,
      "cancel_url": `${origin}/pricing?cancelled=1`,
      "line_items[0][quantity]": String(qty),
      "subscription_data[metadata][user_id]": user.sub,
      "subscription_data[metadata][subscription_id]": sid,
      "subscription_data[metadata][plan_slug]": p.slug,
    };
    if (priced.stripePriceId) {
      // Phase-1 catalog price (admin-pasted Price ID). Discounts/coupons for catalog
      // prices should be modeled as Stripe coupons in a follow-up; server coupon
      // validation still runs, and the discounted total is stored on our subscription.
      params["line_items[0][price]"] = priced.stripePriceId;
    } else {
      // Inline recurring price from our DB-driven totals (pre-tax unit; our stored
      // tax rate is recorded on the local invoice row until Stripe Tax is adopted).
      const unitPreTax = Math.max(Math.round(((total - priced.tax) / qty) * minorFactor), 0);
      params["line_items[0][price_data][currency]"] = currency.toLowerCase();
      params["line_items[0][price_data][unit_amount]"] = String(unitPreTax);
      params["line_items[0][price_data][recurring][interval]"] = interval;
      params["line_items[0][price_data][product_data][name]"] = `Noska ${p.name} (${billingCycle})`;
    }
    if (eligible && priced.trialDays > 0) {
      params["subscription_data[trial_period_days]"] = String(Math.min(priced.trialDays, 365));
    }
    if (customerId) params["customer"] = customerId;
    else if (priced.email) params["customer_email"] = priced.email;
    const sess = await stripeRequest("POST", "/checkout/sessions", params);
    if (!sess.ok) {
      blog("checkout_failed", { reason: "stripe_session_failed", status: sess.status });
      return json(req, 502, { code: "CHECKOUT_FAILED", message: "Could not initiate payment. Try again." });
    }
    const sdata = sess.data as { id: string; url: string };
    const { data: curSub } = await db().from("billing_subscriptions").select("metadata").eq("id", sid).maybeSingle();
    const curMeta = ((curSub as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    await db().from("billing_subscriptions").update({ metadata: { ...curMeta, provider_session_id: sdata.id } }).eq("id", sid);
    blog("checkout_completed", { mode: "stripe_subscription_session", session: sdata.id });
    return json(req, 200, {
      mode: "stripe_session", billing: "subscription", provider: "stripe",
      session_id: sdata.id, session_url: sdata.url,
      amount: total, currency, subscription_id: sid, plan: { slug: p.slug, name: p.name },
      base_amount: priced.baseAmount, discount: priced.discount, tax: priced.tax,
      seats: priced.perSeat ? priced.seats : 1, trial_eligible: eligible, email: priced.email ?? undefined,
    });
  }

  // Razorpay order path (retained fallback)
  if (!razorpayConfigured()) {
    return json(req, 503, { code: "PAYMENT_PROVIDER_NOT_CONFIGURED", message: "Online payments are not configured yet. Contact support." });
  }
  const amountMinor = Math.round(total * 100);
  const receipt = `noska_${p.slug}_${billingCycle}_${Date.now().toString(36)}`;
  const orderRes = await rzpRequest("POST", "/orders", { amount: amountMinor, currency, receipt, notes: { plan_slug: p.slug, billing_cycle: billingCycle, user_id: user.sub, seats: priced.perSeat ? priced.seats : 1 } });
  if (!orderRes.ok) {
    blog("checkout_failed", { reason: "order_create_failed", status: orderRes.status });
    return json(req, 502, { code: "CHECKOUT_FAILED", message: "Could not initiate payment. Try again." });
  }
  const order = orderRes.data as { id: string };
  const sid = await createPendingSubscription(user, priced, billingCycle, order.id, provider);
  await db().from("billing_payments").insert({
    user_id: user.sub, subscription_id: sid, provider_order_id: order.id,
    amount: total, currency, status: "pending",
  });
  blog("checkout_completed", { mode: "order", order_id: order.id });
  return json(req, 200, {
    mode: "order", provider: "razorpay", order_id: order.id, amount: total, amount_minor: amountMinor,
    currency, key_id: Deno.env.get("RAZORPAY_KEY_ID") ?? "", subscription_id: sid,
    plan: { slug: p.slug, name: p.name }, base_amount: priced.baseAmount, discount: priced.discount,
    tax: priced.tax, seats: priced.perSeat ? priced.seats : 1, trial_eligible: eligible, email: priced.email ?? undefined,
  });
}

async function createPendingSubscription(user: { sub: string }, priced: PricedPlan, billingCycle: string, providerOrderId: string | null, provider: Provider): Promise<string> {
  const nowT = new Date();
  const periodEnd = billingCycle === "yearly"
    ? new Date(nowT.getTime() + 365 * 86400000)
    : new Date(nowT.getTime() + 30 * 86400000);
  const { data: created, error } = await db().from("billing_subscriptions").insert({
    user_id: user.sub, plan_id: priced.p.id, provider, status: "pending",
    billing_cycle: billingCycle, currency: priced.currency, amount: priced.total,
    current_period_start: nowT.toISOString(), current_period_end: periodEnd.toISOString(),
    coupon_id: priced.couponId,
    metadata: {
      ...(providerOrderId ? { provider_order_id: providerOrderId } : {}),
      base_amount: priced.baseAmount, discount: priced.discount, tax: priced.tax,
      seats: priced.perSeat ? priced.seats : 1,
    },
  }).select("id").single();
  if (error || !created) throw HttpError(500, "CHECKOUT_FAILED", "Could not create subscription record.");
  const sid = (created as { id: string }).id;
  if (priced.perSeat) {
    await db().from("billing_subscription_items").insert({
      subscription_id: sid, product_key: `seat:${priced.p.slug}`, quantity: priced.seats, unit_amount: priced.unitBase,
    });
  }
  await db().from("billing_subscription_events").insert({
    subscription_id: sid, event_type: "created", old_status: null, new_status: "pending",
    metadata: { base_amount: priced.baseAmount, discount: priced.discount, tax: priced.tax, coupon: priced.couponCode, seats: priced.perSeat ? priced.seats : 1 },
  });
  if (priced.couponId) {
    await db().from("billing_coupon_redemptions").insert({ coupon_id: priced.couponId, user_id: user.sub, subscription_id: sid, discount_amount: priced.discount });
    await bumpCoupon(priced.couponId);
  }
  return sid;
}

async function bumpCoupon(couponId: string): Promise<void> {
  const { data: cc } = await db().from("billing_coupons").select("redemption_count").eq("id", couponId).maybeSingle();
  await db().from("billing_coupons").update({ redemption_count: Number((cc as { redemption_count: number } | null)?.redemption_count ?? 0) + 1 }).eq("id", couponId);
}

// ── Stripe Customer reuse (one per account; needed for portal + invoices) ─
async function ensureStripeCustomer(userId: string, email: string | null): Promise<string | null> {
  if (!email) return null;
  try {
    const found = await stripeRequest("GET", `/customers/search?query=${encodeURIComponent(`email:'${email}'`)}`);
    const list = ((found.data as { data?: Array<{ id: string; metadata?: Record<string, string> }> }).data ?? []);
    const hit = list.find((c) => c.metadata?.user_id === userId) ?? list[0];
    if (hit) {
      await db().from("billing_customers").update({ provider_customer_id: hit.id }).eq("user_id", userId).eq("provider", "stripe");
      return hit.id;
    }
    const created = await stripeRequest("POST", "/customers", { email, "metadata[user_id]": userId });
    if (created.ok) {
      const id = String((created.data as { id: string }).id);
      await db().from("billing_customers").update({ provider_customer_id: id }).eq("user_id", userId).eq("provider", "stripe");
      return id;
    }
  } catch { /* fall back to customer_email on the session */ }
  return null;
}

// ── Top-up purchase: shared pricing, provider branch at the end ──────────
async function checkoutTopup(req: Request, user: { sub: string; email?: string }, body: Record<string, unknown>, provider: Provider, origin: string): Promise<Response> {
  const slug = String(body.product_slug).trim();
  const wantCurrency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : null;
  const { data: profile } = await db().from("user_profiles").select("email,user_name").eq("user_id", user.sub).maybeSingle();
  const email = user.email ?? (profile as { email?: string } | null)?.email ?? null;
  const { data: custRows2 } = await db().from("billing_customers").select("billing_country").eq("user_id", user.sub).limit(5);
  const country = (((custRows2 ?? []) as Array<{ billing_country?: string }>).find((r) => r.billing_country)?.billing_country) ?? null;

  // Currency-aware product: exact slug, else same-credit pack in requested/country currency, else USD, else base.
  const { data: all } = await db().from("billing_topup_products").select("*").eq("is_active", true);
  const products = (all ?? []) as Array<{ id: string; name: string; slug: string; credits: number; price: number; currency: string; expiry_days: number }>;
  let prod = products.find((x) => x.slug === slug) ?? null;
  if (prod && wantCurrency && prod.currency !== wantCurrency) {
    prod = products.find((x) => x.credits === prod!.credits && x.currency === wantCurrency) ?? prod;
  }
  if (!prod) return json(req, 404, { code: "PLAN_NOT_FOUND", message: "This credit pack is not available." });
  if (!wantCurrency && country) {
    const local = products.find((x) => x.credits === prod!.credits && x.currency === currencyForCountry(country));
    if (local) prod = local;
  }
  if (!wantCurrency && !country) {
    const usd = products.find((x) => x.credits === prod!.credits && x.currency === "USD");
    if (usd && prod.currency !== "USD") prod = usd;
  }
  const taxInfo = await getTaxRate(country);
  const { tax, total } = applyTax(Number(prod.price ?? 0), taxInfo.rate);

  if (provider === "stripe") {
    if (!stripeConfigured()) return json(req, 503, { code: "PAYMENT_PROVIDER_NOT_CONFIGURED", message: "Online payments are not configured yet. Contact support." });
    const { data: created } = await db().from("billing_topup_purchases").insert({
      user_id: user.sub, product_id: prod.id, credits_granted: 0, status: "pending",
    }).select("id").single();
    const topupId = (created as { id: string } | null)?.id ?? "";
    const params: Record<string, string> = {
      mode: "payment",
      "success_url": `${origin}/billing/return?session_id={CHECKOUT_SESSION_ID}&topup_id=${topupId}`,
      "cancel_url": `${origin}/pricing?cancelled=1`,
      "line_items[0][price_data][currency]": prod.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(Math.round(total * (prod.currency === "JPY" ? 1 : 100))),
      "line_items[0][price_data][product_data][name]": `Noska AI credits — ${prod.name}`,
      "line_items[0][quantity]": "1",
      "metadata[user_id]": user.sub,
      "metadata[topup_id]": topupId,
      "metadata[product_slug]": prod.slug,
    };
    if (email) params["customer_email"] = email;
    const sess = await stripeRequest("POST", "/checkout/sessions", params);
    if (!sess.ok) return json(req, 502, { code: "CHECKOUT_FAILED", message: "Could not initiate payment. Try again." });
    const sdata = sess.data as { id: string; url: string };
    await db().from("billing_topup_purchases").update({ provider_order_id: sdata.id }).eq("id", topupId);
    blog("checkout_completed", { mode: "topup_stripe", session: sdata.id });
    return json(req, 200, {
      mode: "stripe_session", provider: "stripe", session_id: sdata.id, session_url: sdata.url,
      amount: total, currency: prod.currency, topup_id: topupId,
      product: { slug: prod.slug, name: prod.name, credits: prod.credits }, tax, email: email ?? undefined,
    });
  }

  if (!razorpayConfigured()) return json(req, 503, { code: "PAYMENT_PROVIDER_NOT_CONFIGURED", message: "Online payments are not configured yet. Contact support." });
  const amountMinor = Math.round(total * 100);
  const receipt = `noska_topup_${prod.slug}_${Date.now().toString(36)}`;
  const orderRes = await rzpRequest("POST", "/orders", {
    amount: amountMinor, currency: prod.currency || "INR", receipt,
    notes: { topup_slug: prod.slug, user_id: user.sub },
  });
  if (!orderRes.ok) {
    blog("checkout_failed", { reason: "topup_order_create_failed" });
    return json(req, 502, { code: "CHECKOUT_FAILED", message: "Could not initiate payment. Try again." });
  }
  const order = orderRes.data as { id: string };
  const { data: created } = await db().from("billing_topup_purchases").insert({
    user_id: user.sub, product_id: prod.id, provider_order_id: order.id,
    credits_granted: 0, status: "pending",
  }).select("id").single();
  await db().from("billing_payments").insert({
    user_id: user.sub, subscription_id: null, provider_order_id: order.id,
    amount: total, currency: prod.currency || "INR", status: "pending", payment_method: "razorpay",
  });
  blog("checkout_completed", { mode: "topup", order_id: order.id });
  return json(req, 200, {
    mode: "topup", provider: "razorpay", order_id: order.id, amount: total, amount_minor: amountMinor,
    currency: prod.currency || "INR", key_id: Deno.env.get("RAZORPAY_KEY_ID") ?? "",
    topup_id: (created as { id: string } | null)?.id,
    product: { slug: prod.slug, name: prod.name, credits: prod.credits },
    tax, email: email ?? undefined,
  });
}

