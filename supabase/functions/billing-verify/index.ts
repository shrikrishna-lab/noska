// POST /billing-verify — confirm provider payment, then activate/grant.
// Razorpay body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscription_id?, topup_id? }
// Stripe body: { stripe_session_id, subscription_id?, topup_id? }
// Server state is authoritative; checkout UI success is never trusted.
// Idempotent: repeats return success without duplicates.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { db, cors, json, requireBillingUser, toErrorBody, blog, HttpError, rateLimit, paymentSignatureValid, rzpRequest, stripeRequest, transitionSubscription, queueBillingEmail, billingEmailHtml } from "../_shared/billing/helpers.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { code: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireBillingUser(req);
    if (!rateLimit("verify:" + user.sub, 20)) return json(req, 429, { code: "RATE_LIMITED", message: "Too many attempts." });
    const body = await req.json().catch(() => ({}));
    // Stripe Checkout return path: retrieve the session server-side and confirm paid.
    if (typeof body.stripe_session_id === "string" && body.stripe_session_id) {
      return await verifyStripeSession(req, user, String(body.stripe_session_id), String(body.subscription_id ?? ""), String(body.topup_id ?? ""));
    }
    const orderId = String(body.razorpay_order_id ?? "");
    const paymentId = String(body.razorpay_payment_id ?? "");
    const signature = String(body.razorpay_signature ?? "");
    const subId = String(body.subscription_id ?? "");
    const topupId = String(body.topup_id ?? "");
    if (!orderId || !paymentId || !signature || (!subId && !topupId)) {
      return json(req, 400, { code: "PAYMENT_VERIFICATION_FAILED", message: "Missing payment details." });
    }

    // Server-side signature verification first (authoritative for both flows)
    const sigOk = await paymentSignatureValid(orderId, paymentId, signature);
    if (!sigOk) {
      blog("payment_failed", { reason: "bad_signature" });
      return json(req, 400, { code: "PAYMENT_VERIFICATION_FAILED", message: "Payment verification failed." });
    }

    // ── Top-up flow: grant credits with expiry (§11) ──
    if (topupId) {
      const { data: tp } = await db().from("billing_topup_purchases").select("*, product:billing_topup_products(id,name,credits,expiry_days)").eq("id", topupId).maybeSingle();
      const t = tp as {
        id: string; user_id: string; status: string; provider_order_id: string | null;
        product?: { credits: number; expiry_days: number; name: string } | null;
        product_id: string;
      } | null;
      if (!t || t.user_id !== user.sub) return json(req, 404, { code: "SUBSCRIPTION_NOT_FOUND" });
      if (t.status === "granted") return json(req, 200, { ok: true, mode: "topup", duplicate: true });
      if (t.provider_order_id && t.provider_order_id !== orderId) {
        return json(req, 400, { code: "PAYMENT_VERIFICATION_FAILED", message: "Order mismatch." });
      }
      const credits = Number(t.product?.credits ?? 0);
      const expires = new Date(Date.now() + Number(t.product?.expiry_days ?? 30) * 86400000).toISOString();
      await db().from("billing_topup_purchases").update({
        provider_payment_id: paymentId, credits_granted: credits, credits_used: 0,
        status: "granted", expires_at: expires, updated_at: new Date().toISOString(),
      }).eq("id", topupId);
      await db().from("billing_payments").upsert({
        user_id: user.sub, subscription_id: null, provider_payment_id: paymentId,
        provider_order_id: orderId, amount: 0, currency: "INR",
        status: "captured", payment_method: "razorpay", paid_at: new Date().toISOString(),
      }, { onConflict: "provider_payment_id" });
      try {
        const { data: custRows } = await db().from("billing_customers").select("email").eq("user_id", user.sub).limit(5);
        queueBillingEmail((((custRows ?? []) as Array<{ email?: string }>).find((r) => r.email)?.email), "AI credits added", billingEmailHtml("Top-up successful", [`${credits} AI credits were added to your account.`]));
      } catch { /* ignore */ }
      blog("topup_granted", { credits });
      return json(req, 200, { ok: true, mode: "topup", credits });
    }

    // Ownership check: subscription must belong to caller
    const { data: sub } = await db().from("billing_subscriptions").select("*").eq("id", subId).maybeSingle();
    const s = sub as {
      id: string; user_id: string; status: string; plan_id: string; billing_cycle: string;
      currency: string; amount: number; metadata: Record<string, unknown> | null;
    } | null;
    if (!s || s.user_id !== user.sub) return json(req, 404, { code: "SUBSCRIPTION_NOT_FOUND" });

    // Idempotency: payment already captured for this order?
    const { data: existingPay } = await db().from("billing_payments").select("*")
      .eq("provider_order_id", orderId).eq("provider_payment_id", paymentId).maybeSingle();
    if (existingPay && (existingPay as { status: string }).status === "captured") {
      blog("verify_idempotent", { order: orderId });
      return json(req, 200, { ok: true, subscription_id: subId, status: s.status, duplicate: true });
    }

    // Signature already verified above (authoritative; checkout UI success is NOT trusted).

    // Optional: confirm with Razorpay API that the payment is captured
    let method: string | null = null;
    try {
      const pr = await rzpRequest("GET", `/payments/${paymentId}`);
      if (pr.ok) {
        const pd = pr.data as { status?: string; method?: string };
        method = pd.method ?? null;
        if (pd.status && !["captured", "authorized"].includes(pd.status)) {
          blog("payment_failed", { reason: "provider_status", provider_status: pd.status });
          return json(req, 402, { code: "PAYMENT_FAILED", message: "Payment was not captured." });
        }
      }
    } catch { /* provider confirm best-effort; signature is authoritative */ }

    // Record payment (idempotent upsert on provider_payment_id)
    await db().from("billing_payments").upsert({
      user_id: user.sub, subscription_id: subId, provider_payment_id: paymentId,
      provider_order_id: orderId, amount: s.amount, currency: s.currency,
      status: "captured", payment_method: method ?? "razorpay", paid_at: new Date().toISOString(),
    }, { onConflict: "provider_payment_id" });

    // Invoice for this cycle (idempotent via provider_invoice_id; tax from checkout metadata)
    const invoiceNo = `NSK-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const taxAmt = Number((s.metadata as Record<string, unknown> | null)?.tax ?? 0);
    await db().from("billing_invoices").upsert({
      user_id: user.sub, subscription_id: subId, provider_invoice_id: `rzp_${paymentId}`,
      invoice_number: invoiceNo, status: "paid",
      amount: Math.round((Number(s.amount) - taxAmt) * 100) / 100,
      currency: s.currency, tax: taxAmt, total: s.amount,
      issued_at: new Date().toISOString(), paid_at: new Date().toISOString(),
    }, { onConflict: "provider_invoice_id" });

    // Activate subscription (via state machine)
    const t = await transitionSubscription(subId, "active", "activated", { provider_payment_id: paymentId, provider_order_id: orderId });
    if (!t.ok) return json(req, 409, { code: t.code ?? "INVALID_SUBSCRIPTION_TRANSITION", message: "Could not activate subscription." });

    // Trial history marker (first paid activation consumes trial eligibility implicitly via paid status)
    blog("subscription_activated", { plan_cycle: s.billing_cycle });
    // Billing emails (fire-and-forget; never block the transaction)
    try {
      const { data: custRows } = await db().from("billing_customers").select("email").eq("user_id", user.sub).limit(5);
      const email = (((custRows ?? []) as Array<{ email?: string }>).find((r) => r.email)?.email) ?? undefined;
      queueBillingEmail(email, "Welcome to Noska Pro", billingEmailHtml("Payment successful", [`Your subscription is now active.`]));
    } catch { /* ignore */ }
    return json(req, 200, { ok: true, subscription_id: subId, status: "active" });
  } catch (e) {
    const { status, body } = toErrorBody(e);
    return json(req, status, body);
  }
});

// ── Stripe Checkout Session verification ─────────────────────────────────
// Retrieves the session server-to-server. Subscription-mode sessions resolve the
// Stripe Subscription (trialing/active) and mirror its status + period dates;
// one-time sessions require payment_status "paid". Idempotent throughout.
async function verifyStripeSession(req: Request, user: { sub: string }, sessionId: string, subId: string, topupId: string): Promise<Response> {
  const sess = await stripeRequest("GET", `/checkout/sessions/${sessionId}`);
  if (!sess.ok) {
    blog("payment_failed", { reason: "stripe_session_lookup_failed" });
    return json(req, 400, { code: "PAYMENT_VERIFICATION_FAILED", message: "Could not confirm payment with Stripe." });
  }
  const sd = sess.data as {
    id: string; payment_status: string; payment_intent: string; amount_total: number;
    currency: string; customer_email?: string; subscription?: string | { id: string };
    metadata?: Record<string, string>;
  };
  const metaUser = sd.metadata?.user_id;
  if (metaUser && metaUser !== user.sub) {
    return json(req, 403, { code: "PAYMENT_VERIFICATION_FAILED", message: "Session does not belong to this account." });
  }
  const effTopup = topupId || sd.metadata?.topup_id || "";
  const effSub = subId || sd.metadata?.subscription_id || "";
  const stripeSubId = typeof sd.subscription === "string" ? sd.subscription : sd.subscription?.id ?? "";
  const pi = typeof sd.payment_intent === "string" ? sd.payment_intent : "";
  const amount = (sd.amount_total ?? 0) / 100;
  const currency = (sd.currency ?? "usd").toUpperCase();

  if (effTopup) {
    let t: { id: string; user_id: string; status: string; product?: { credits: number; expiry_days: number } | null } | null = null;
    const byId = await db().from("billing_topup_purchases").select("*, product:billing_topup_products(id,name,credits,expiry_days)").eq("id", effTopup).maybeSingle();
    t = byId.data as typeof t;
    if (!t) {
      const bySess = await db().from("billing_topup_purchases").select("*, product:billing_topup_products(id,name,credits,expiry_days)").eq("provider_order_id", sessionId).maybeSingle();
      t = bySess.data as typeof t;
    }
    if (!t || t.user_id !== user.sub) return json(req, 404, { code: "SUBSCRIPTION_NOT_FOUND" });
    if (t.status === "granted") return json(req, 200, { ok: true, mode: "topup", duplicate: true });
    const credits = Number(t.product?.credits ?? 0);
    await db().from("billing_topup_purchases").update({
      provider_payment_id: pi || sessionId, credits_granted: credits, credits_used: 0,
      status: "granted", expires_at: new Date(Date.now() + Number(t.product?.expiry_days ?? 30) * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", t.id);
    await recordStripePayment(user.sub, null, pi || sessionId, sessionId, amount, currency);
    await storeTopupReceipt(user.sub, pi || null, sessionId, amount, currency);
    await notifyEmail(user.sub, "AI credits added", billingEmailHtml("Top-up successful", [`${credits} AI credits were added to your account.`]));
    blog("topup_granted", { via: "stripe", credits });
    return json(req, 200, { ok: true, mode: "topup", credits });
  }

  if (!effSub) return json(req, 400, { code: "PAYMENT_VERIFICATION_FAILED", message: "Missing subscription reference." });
  const { data: sub } = await db().from("billing_subscriptions").select("*").eq("id", effSub).maybeSingle();
  const s = sub as { id: string; user_id: string; status: string; billing_cycle: string; currency: string; amount: number; metadata: Record<string, unknown> | null } | null;
  if (!s || s.user_id !== user.sub) return json(req, 404, { code: "SUBSCRIPTION_NOT_FOUND" });

  // Subscription-mode (recurring): mirror the Stripe Subscription state.
  if (stripeSubId) {
    return await activateFromStripeSubscription(req, user, s, stripeSubId, sessionId);
  }

  // One-time mode: payment must be captured.
  if (sd.payment_status !== "paid") {
    return json(req, 402, { code: "PAYMENT_FAILED", message: "Payment was not completed." });
  }

  const { data: dup } = await db().from("billing_payments").select("id").eq("provider_payment_id", pi || sessionId).limit(1);
  if ((dup ?? []).length > 0 && s.status === "active") {
    return json(req, 200, { ok: true, subscription_id: s.id, status: s.status, duplicate: true });
  }
  await recordStripePayment(user.sub, s.id, pi || sessionId, sessionId, Number(s.amount), s.currency);
  const invoiceNo = `NSK-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const taxAmt = Number(s.metadata?.tax ?? 0);
  await db().from("billing_invoices").upsert({
    user_id: user.sub, subscription_id: s.id, provider_invoice_id: `stripe_${pi || sessionId}`,
    invoice_number: invoiceNo, status: "paid",
    amount: Math.round((Number(s.amount) - taxAmt) * 100) / 100,
    currency: s.currency, tax: taxAmt, total: s.amount,
    issued_at: new Date().toISOString(), paid_at: new Date().toISOString(),
  }, { onConflict: "provider_invoice_id" });
  const t = await transitionSubscription(s.id, "active", "activated", { stripe_session_id: sessionId, payment_intent: pi });
  if (!t.ok) return json(req, 409, { code: t.code ?? "INVALID_SUBSCRIPTION_TRANSITION", message: "Could not activate subscription." });
  await notifyEmail(user.sub, "Welcome to Noska", billingEmailHtml("Payment successful", [`Your subscription is now active.`]));
  blog("subscription_activated", { via: "stripe" });
  return json(req, 200, { ok: true, subscription_id: s.id, status: "active" });
}

async function recordStripePayment(userId: string, subId: string | null, paymentIntent: string, sessionId: string, amount: number, currency: string): Promise<void> {
  await db().from("billing_payments").upsert({
    user_id: userId, subscription_id: subId, provider_payment_id: paymentIntent || sessionId,
    provider_order_id: sessionId, amount, currency, status: "captured",
    payment_method: "stripe", paid_at: new Date().toISOString(),
  }, { onConflict: "provider_payment_id" });
}

async function notifyEmail(userId: string, subject: string, html: string): Promise<void> {
  try {
    const { data: rows } = await db().from("billing_customers").select("email").eq("user_id", userId).limit(5);
    const email = (((rows ?? []) as Array<{ email?: string }>).find((r) => r.email)?.email) ?? undefined;
    queueBillingEmail(email, subject, html);
  } catch { /* ignore */ }
}

// Mirror a Stripe Subscription into our row (status + period + trial).
async function activateFromStripeSubscription(
  req: Request, user: { sub: string },
  s: { id: string; user_id: string; status: string; currency: string; amount: number },
  stripeSubId: string, sessionId: string,
): Promise<Response> {
  const sub = await stripeRequest("GET", `/subscriptions/${stripeSubId}`);
  if (!sub.ok) {
    return json(req, 400, { code: "PAYMENT_VERIFICATION_FAILED", message: "Could not confirm subscription with Stripe." });
  }
  const ss = sub.data as {
    id: string; status: string; trial_end: number | null;
    current_period_start: number; current_period_end: number;
    latest_invoice?: string;
  };
  const patch: Record<string, unknown> = {
    provider_subscription_id: stripeSubId, updated_at: new Date().toISOString(),
  };
  if (ss.current_period_start) patch.current_period_start = new Date(ss.current_period_start * 1000).toISOString();
  if (ss.current_period_end) patch.current_period_end = new Date(ss.current_period_end * 1000).toISOString();
  if (ss.trial_end) patch.trial_end = new Date(ss.trial_end * 1000).toISOString();
  await db().from("billing_subscriptions").update(patch).eq("id", s.id);

  const internal = ss.status === "trialing" ? "trialing" : ss.status === "active" ? "active" : null;
  if (!internal) {
    // e.g. incomplete/past_due on first return: leave pending; webhooks will advance it.
    return json(req, 202, { ok: true, subscription_id: s.id, status: s.status, pending_provider_status: ss.status });
  }
  const t = await transitionSubscription(s.id, internal, internal === "trialing" ? "created" : "activated", {
    stripe_subscription_id: stripeSubId, stripe_session_id: sessionId,
  });
  if (!t.ok) return json(req, 409, { code: t.code ?? "INVALID_SUBSCRIPTION_TRANSITION", message: "Could not activate subscription." });
  await notifyEmail(user.sub, "Welcome to Noska", billingEmailHtml("Subscription active", [
    internal === "trialing" ? `Your trial is active.` : `Your subscription is now active and renews automatically.`,
  ]));
  blog("subscription_activated", { via: "stripe_subscription", status: internal });
  return json(req, 200, { ok: true, subscription_id: s.id, status: internal });
}

// Store Stripe's hosted receipt for one-time top-ups (Invoicing-lite).
async function storeTopupReceipt(userId: string, paymentIntent: string | null, sessionId: string, amount: number, currency: string): Promise<void> {
  try {
    if (!paymentIntent) return;
    const pi = await stripeRequest("GET", `/payment_intents/${paymentIntent}`);
    const chargeId = String(((pi.data as { latest_charge?: unknown }).latest_charge as string | undefined) ?? "");
    if (!chargeId || !chargeId.startsWith("ch_")) return;
    const ch = await stripeRequest("GET", `/charges/${chargeId}`);
    const receiptUrl = String((ch.data as { receipt_url?: unknown }).receipt_url ?? "");
    if (!receiptUrl) return;
    const invoiceNo = `NSK-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await db().from("billing_invoices").upsert({
      user_id: userId, subscription_id: null, provider_invoice_id: `stripe_${chargeId}`,
      invoice_number: invoiceNo, status: "paid", amount, currency, total: amount,
      invoice_url: receiptUrl, issued_at: new Date().toISOString(), paid_at: new Date().toISOString(),
    }, { onConflict: "provider_invoice_id" });
  } catch { /* receipt sync is best-effort */ }
}
