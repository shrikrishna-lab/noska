// POST /billing-webhooks — provider webhook receiver (Stripe primary, Razorpay supported).
// verify_jwt MUST be false for this function (providers have no Supabase JWT).
// Verifies signatures, stores events idempotently, maps provider events to
// internal subscription state. Duplicates return 200 without duplicating records.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { db, webhookSignatureValid, stripeWebhookValid, transitionSubscription, blog, queueBillingEmail, billingEmailHtml } from "../_shared/billing/helpers.ts";

function corsPublic(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Razorpay-Signature, X-Razorpay-Event-Id, Stripe-Signature",
    "Content-Type": "application/json",
  };
}

function stored(req: Request, body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: corsPublic() });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsPublic() });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ code: "METHOD_NOT_ALLOWED" }), { status: 405, headers: corsPublic() });
  }
  const raw = await req.text();
  // Stripe path: Stripe-Signature header present.
  if (req.headers.get("stripe-signature")) {
    return await handleStripe(req, raw);
  }
  const signature = req.headers.get("X-Razorpay-Signature") ?? "";
  let evt: { event?: string; payload?: Record<string, unknown>; account_id?: string } = {};
  try { evt = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ code: "INVALID_PAYLOAD" }), { status: 400, headers: corsPublic() });
  }
  const eventType = String(evt.event ?? "");
  const payload = (evt.payload ?? {}) as Record<string, Record<string, unknown>>;
  // Razorpay event id: prefer payment/subscription entity id + event type for idempotency
  const entityId = String(
    (payload.payment?.entity as Record<string, unknown> | undefined)?.id
    ?? (payload.subscription?.entity as Record<string, unknown> | undefined)?.id
    ?? (payload.order?.entity as Record<string, unknown> | undefined)?.id
    ?? (payload.refund?.entity as Record<string, unknown> | undefined)?.id
    ?? req.headers.get("X-Razorpay-Event-Id") ?? `${eventType}:${Date.now()}`,
  );
  const dedupeKey = `razorpay:${eventType}:${entityId}`;

  const sigValid = await webhookSignatureValid(raw, signature);
  blog("webhook_received", { type: eventType, signature_valid: sigValid });

  // Idempotent store first (unique provider+event_id)
  const { data: seen } = await db().from("billing_webhook_events").select("id,processing_status")
    .eq("provider", "razorpay").eq("event_id", dedupeKey).maybeSingle();
  if (seen) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200, headers: corsPublic() });
  }
  const { data: inserted } = await db().from("billing_webhook_events").insert({
    provider: "razorpay", event_id: dedupeKey, event_type: eventType,
    payload: evt, signature_valid: sigValid, processing_status: sigValid ? "processing" : "failed",
    error_message: sigValid ? null : "WEBHOOK_SIGNATURE_INVALID",
  }).select("id").single();
  if (!sigValid) {
    return new Response(JSON.stringify({ code: "WEBHOOK_SIGNATURE_INVALID" }), { status: 400, headers: corsPublic() });
  }
  const rowId = (inserted as { id: string } | null)?.id;

  try {
    await handleEvent(eventType, payload);
    if (rowId) {
      await db().from("billing_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", rowId);
    }
    blog("webhook_processed", { type: eventType });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsPublic() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "handler failed";
    if (rowId) {
      await db().from("billing_webhook_events").update({ processing_status: "failed", error_message: msg }).eq("id", rowId);
    }
    blog("webhook_failed", { type: eventType, error: msg });
    // Return 200 with failed status? No — return 500 so Razorpay retries, but idempotency guard prevents duplicates.
    return new Response(JSON.stringify({ code: "WEBHOOK_PROCESSING_FAILED", message: msg }), { status: 500, headers: corsPublic() });
  }
});

async function findSubByProvider(providerSubId: string | null, orderId: string | null): Promise<{ id: string; user_id: string; status: string } | null> {
  if (providerSubId) {
    const { data } = await db().from("billing_subscriptions").select("id,user_id,status").eq("provider_subscription_id", providerSubId).maybeSingle();
    if (data) return data as { id: string; user_id: string; status: string };
  }
  if (orderId) {
    const { data } = await db().from("billing_subscriptions").select("id,user_id,status").eq("metadata->>provider_order_id", orderId).maybeSingle();
    // metadata query fallback: scan pending subs by order id stored in metadata
    if (data) return data as { id: string; user_id: string; status: string };
    const { data: byMeta } = await db().from("billing_subscriptions").select("id,user_id,status,metadata").in("status", ["pending", "incomplete", "past_due"]).limit(50);
    const hit = ((byMeta ?? []) as Array<{ id: string; user_id: string; status: string; metadata: Record<string, unknown> | null }>)
      .find((s) => s.metadata?.provider_order_id === orderId);
    if (hit) return hit;
  }
  return null;
}

async function handleEvent(eventType: string, payload: Record<string, Record<string, unknown>>): Promise<void> {
  const pay = (payload.payment?.entity ?? {}) as Record<string, unknown>;
  const sub = (payload.subscription?.entity ?? {}) as Record<string, unknown>;
  const providerSubId = (sub.id ?? pay.subscription_id ?? null) as string | null;
  const orderId = (pay.order_id ?? null) as string | null;
  const paymentId = (pay.id ?? null) as string | null;

  switch (eventType) {
    case "payment.captured":
    case "order.paid": {
      // Top-up orders grant credits (idempotent on status)
      if (orderId) {
        const { data: tp } = await db().from("billing_topup_purchases").select("id,user_id,status,product:billing_topup_products(credits,expiry_days)").eq("provider_order_id", orderId).maybeSingle();
        const t = tp as { id: string; user_id: string; status: string; product?: { credits: number; expiry_days: number } | null } | null;
        if (t && t.status !== "granted") {
          const credits = Number(t.product?.credits ?? 0);
          await db().from("billing_topup_purchases").update({
            provider_payment_id: paymentId, credits_granted: credits, credits_used: 0,
            status: "granted", expires_at: new Date(Date.now() + Number(t.product?.expiry_days ?? 30) * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", t.id);
          if (paymentId) {
            await db().from("billing_payments").upsert({
              user_id: t.user_id, subscription_id: null, provider_payment_id: paymentId,
              provider_order_id: orderId, amount: Number(pay.amount ?? 0) / 100,
              currency: String(pay.currency ?? "INR"), status: "captured",
              payment_method: String(pay.method ?? "razorpay"), paid_at: new Date().toISOString(),
            }, { onConflict: "provider_payment_id" });
          }
          blog("topup_granted", { via: "webhook" });
          break;
        }
        if (t) break; // already granted → acknowledge
      }
      const target = await findSubByProvider(providerSubId, orderId);
      if (!target) return; // unknown subscription (e.g. non-billing payment) — acknowledge
      if (paymentId) {
        await db().from("billing_payments").upsert({
          user_id: target.user_id,
          subscription_id: target.id,
          provider_payment_id: paymentId,
          provider_order_id: orderId,
          provider_subscription_id: providerSubId,
          amount: Number(pay.amount ?? 0) / 100,
          currency: String(pay.currency ?? "INR"),
          status: "captured",
          payment_method: String(pay.method ?? "razorpay"),
          paid_at: new Date().toISOString(),
        }, { onConflict: "provider_payment_id" });
        // Async-capture invoice (verify flow covers the browser path; unique key keeps this idempotent)
        const invoiceNo = `NSK-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        await db().from("billing_invoices").upsert({
          user_id: target.user_id, subscription_id: target.id, provider_invoice_id: `rzp_${paymentId}`,
          invoice_number: invoiceNo, status: "paid",
          amount: Number(pay.amount ?? 0) / 100, currency: String(pay.currency ?? "INR"),
          total: Number(pay.amount ?? 0) / 100,
          issued_at: new Date().toISOString(), paid_at: new Date().toISOString(),
        }, { onConflict: "provider_invoice_id" });
      }
      await transitionSubscription(target.id, "active", eventType === "order.paid" ? "renewed" : "activated", { provider_payment_id: paymentId });
      break;
    }
    case "payment.failed": {
      const target = await findSubByProvider(providerSubId, orderId);
      const errDesc = ((pay.error_description ?? pay.error_reason ?? "Payment failed") as string);
      const errCode = String(pay.error_code ?? "PAYMENT_FAILED");
      if (target) {
        if (paymentId) {
          await db().from("billing_payments").upsert({
            user_id: target.user_id, subscription_id: target.id,
            provider_payment_id: paymentId, provider_order_id: orderId,
            provider_subscription_id: providerSubId,
            amount: Number(pay.amount ?? 0) / 100, currency: String(pay.currency ?? "INR"),
            status: "failed", failure_code: errCode, failure_message: errDesc,
          }, { onConflict: "provider_payment_id" });
        }
        await transitionSubscription(target.id, "past_due", "payment_failed", { failure_code: errCode, failure_message: errDesc });
        // Grace period from plan config (default 3 days)
        const { data: srow } = await db().from("billing_subscriptions").select("plan_id").eq("id", target.id).maybeSingle();
        const { data: prow } = srow
          ? await db().from("billing_plans").select("grace_period_days").eq("id", (srow as { plan_id: string }).plan_id).maybeSingle()
          : { data: null };
        const graceDays = Number((prow as { grace_period_days?: number } | null)?.grace_period_days ?? 3);
        await db().from("billing_subscriptions").update({
          grace_period_until: new Date(Date.now() + graceDays * 86400000).toISOString(),
        }).eq("id", target.id);
        try {
          const { data: cust } = await db().from("billing_customers").select("email").eq("user_id", target.user_id).maybeSingle();
          queueBillingEmail((cust as { email?: string } | null)?.email, "Noska payment failed", billingEmailHtml("Payment failed", [`We couldn't charge your subscription (${errDesc}).`, `Your access continues during the grace period. Update your payment method to stay on your plan.`]));
        } catch { /* ignore */ }
      }
      break;
    }
    case "subscription.activated":
    case "subscription.charged": {
      const target = providerSubId ? await findSubByProvider(providerSubId, null) : null;
      if (target) await transitionSubscription(target.id, "active", eventType === "subscription.charged" ? "renewed" : "activated", { provider_subscription_id: providerSubId });
      break;
    }
    case "subscription.cancelled":
    case "subscription.completed": {
      const target = providerSubId ? await findSubByProvider(providerSubId, null) : null;
      if (target) {
        if (eventType === "subscription.cancelled") {
          // Provider-side cancel → cancel at period end (preserve access)
          await db().from("billing_subscriptions").update({ cancel_at_period_end: true, cancelled_at: new Date().toISOString() }).eq("id", target.id);
          await db().from("billing_subscription_events").insert({ subscription_id: target.id, event_type: "cancelled", old_status: target.status, new_status: "cancelled", metadata: { at: "provider" } });
          try {
            const { data: cust } = await db().from("billing_customers").select("email").eq("user_id", target.user_id).maybeSingle();
            queueBillingEmail((cust as { email?: string } | null)?.email, "Noska subscription cancelled", billingEmailHtml("Subscription cancelled", [`Your plan remains active until the end of the billing period.`]));
          } catch { /* ignore */ }
        } else {
          await transitionSubscription(target.id, "expired", "expired", { provider_subscription_id: providerSubId });
        }
      }
      break;
    }
    case "subscription.paused":
    case "subscription.resumed": {
      const target = providerSubId ? await findSubByProvider(providerSubId, null) : null;
      if (target) {
        await transitionSubscription(target.id, eventType === "subscription.paused" ? "paused" : "active", eventType === "subscription.paused" ? "paused" : "resumed", {});
      }
      break;
    }
    case "refund.created":
    case "refund.processed": {
      if (paymentId || (payload.refund?.entity as Record<string, unknown> | undefined)?.payment_id) {
        const pid = String((payload.refund?.entity as Record<string, unknown>).payment_id ?? paymentId);
        await db().from("billing_payments").update({ status: "refunded" }).eq("provider_payment_id", pid);
      }
      break;
    }
    default:
      // Unknown event: acknowledged + stored for admin inspection
      break;
  }
}

// ── Stripe webhook path ──────────────────────────────────────────────────
async function handleStripe(req: Request, raw: string): Promise<Response> {
  const sigHeader = req.headers.get("stripe-signature") ?? "";
  let evt: { id?: string; type?: string; data?: { object?: Record<string, unknown> } } = {};
  try { evt = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ code: "INVALID_PAYLOAD" }), { status: 400, headers: corsPublic() });
  }
  const eventType = String(evt.type ?? "");
  const obj = (evt.data?.object ?? {}) as Record<string, unknown>;
  const dedupeKey = `stripe:${String(evt.id ?? `${eventType}:${Date.now()}`)}`;

  const sigValid = await stripeWebhookValid(raw, sigHeader);
  blog("webhook_received", { provider: "stripe", type: eventType, signature_valid: sigValid });

  const { data: seen } = await db().from("billing_webhook_events").select("id")
    .eq("provider", "stripe").eq("event_id", dedupeKey).maybeSingle();
  if (seen) return stored(req, { ok: true, duplicate: true });
  void req;
  const { data: inserted } = await db().from("billing_webhook_events").insert({
    provider: "stripe", event_id: dedupeKey, event_type: eventType,
    payload: evt, signature_valid: sigValid, processing_status: sigValid ? "processing" : "failed",
    error_message: sigValid ? null : "WEBHOOK_SIGNATURE_INVALID",
  }).select("id").single();
  if (!sigValid) {
    return new Response(JSON.stringify({ code: "WEBHOOK_SIGNATURE_INVALID" }), { status: 400, headers: corsPublic() });
  }
  const rowId = (inserted as { id: string } | null)?.id;
  try {
    await handleStripeEvent(eventType, obj);
    if (rowId) await db().from("billing_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", rowId);
    blog("webhook_processed", { provider: "stripe", type: eventType });
    return stored(req, { ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "handler failed";
    if (rowId) await db().from("billing_webhook_events").update({ processing_status: "failed", error_message: msg }).eq("id", rowId);
    blog("webhook_failed", { provider: "stripe", type: eventType, error: msg });
    return new Response(JSON.stringify({ code: "WEBHOOK_PROCESSING_FAILED", message: msg }), { status: 500, headers: corsPublic() });
  }
}

async function stripeSubBySession(sessionId: string): Promise<{ id: string; user_id: string; status: string } | null> {
  const { data } = await db().from("billing_subscriptions").select("id,user_id,status")
    .eq("provider", "stripe").eq("provider_subscription_id", sessionId).maybeSingle();
  return (data ?? null) as { id: string; user_id: string; status: string } | null;
}

async function handleStripeEvent(eventType: string, obj: Record<string, unknown>): Promise<void> {
  const meta = (obj.metadata ?? {}) as Record<string, string>;
  switch (eventType) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      // Fulfillment is gated on payment_status inside fulfillStripeCheckout:
      // delayed-notification methods complete while still unpaid and must only
      // be fulfilled when the succeeded event arrives.
      await fulfillStripeCheckout(obj);
      break;
    }
    case "checkout.session.async_payment_failed": {
      await recordStripeFailure(meta.subscription_id || null, "STRIPE_ASYNC_FAILED", "Delayed payment failed.", null);
      break;
    }
    case "invoice.paid": {
      await syncStripeInvoice(obj);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      await syncStripeSubscription(obj);
      break;
    }
    case "invoice.payment_failed":
    case "charge.failed":
    case "customer.subscription.deleted":
    case "charge.refunded": {
      await handleStripeFailures(eventType, obj);
      break;
    }
    default:
      break;
  }
}

// Shared Checkout fulfillment — gated on payment_status (async methods complete unpaid).
async function fulfillStripeCheckout(obj: Record<string, unknown>): Promise<void> {
  if (String(obj.payment_status ?? "") !== "paid") {
    blog("webhook_deferred", { provider: "stripe", session: String(obj.id ?? "") });
    return;
  }
  const meta = (obj.metadata ?? {}) as Record<string, string>;
  const sessionId = String(obj.id ?? "");
      const pi = String(obj.payment_intent ?? "");
      const amount = Number((obj.amount_total as number | undefined) ?? 0) / 100;
      const currency = String((obj.currency as string | undefined) ?? "usd").toUpperCase();
      // Top-up?
      if (meta.topup_id) {
        const { data: tp } = await db().from("billing_topup_purchases").select("id,user_id,status,product:billing_topup_products(credits,expiry_days)").eq("id", meta.topup_id).maybeSingle();
        const t = tp as { id: string; user_id: string; status: string; product?: { credits: number; expiry_days: number } | null } | null;
        if (t && t.status !== "granted") {
          await db().from("billing_topup_purchases").update({
            provider_payment_id: pi || sessionId, credits_granted: Number(t.product?.credits ?? 0), credits_used: 0,
            status: "granted", expires_at: new Date(Date.now() + Number(t.product?.expiry_days ?? 30) * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", t.id);
          await db().from("billing_payments").upsert({
            user_id: t.user_id, subscription_id: null, provider_payment_id: pi || sessionId,
            provider_order_id: sessionId, amount, currency, status: "captured",
            payment_method: "stripe", paid_at: new Date().toISOString(),
          }, { onConflict: "provider_payment_id" });
        }
        break;
      }
      const target = meta.subscription_id
        ? ((await db().from("billing_subscriptions").select("id,user_id,status").eq("id", meta.subscription_id).maybeSingle()).data as { id: string; user_id: string; status: string } | null)
        : await stripeSubBySession(sessionId);
      if (!target) break; // unknown — acknowledge
      await db().from("billing_payments").upsert({
        user_id: target.user_id, subscription_id: target.id, provider_payment_id: pi || sessionId,
        provider_order_id: sessionId, provider_subscription_id: sessionId,
        amount, currency, status: "captured", payment_method: "stripe", paid_at: new Date().toISOString(),
      }, { onConflict: "provider_payment_id" });
      const invoiceNo = `NSK-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await db().from("billing_invoices").upsert({
        user_id: target.user_id, subscription_id: target.id, provider_invoice_id: `stripe_${pi || sessionId}`,
        invoice_number: invoiceNo, status: "paid", amount, currency, total: amount,
        issued_at: new Date().toISOString(), paid_at: new Date().toISOString(),
      }, { onConflict: "provider_invoice_id" });
      await transitionSubscription(target.id, "active", "activated", { stripe_session_id: sessionId });
}

async function handleStripeFailures(eventType: string, obj: Record<string, unknown>): Promise<void> {
  const meta = (obj.metadata ?? {}) as Record<string, string>;
  switch (eventType) {
    case "invoice.payment_failed":
    case "charge.failed": {
      const subId = meta.subscription_id || String((obj.subscription as string | undefined) ?? "");
      await recordStripeFailure(subId || null, "STRIPE_PAYMENT_FAILED", "Card payment failed.", obj);
      break;
    }
    case "customer.subscription.deleted": {
      const subId = meta.subscription_id || "";
      if (subId) {
        await db().from("billing_subscriptions").update({ cancel_at_period_end: true, cancelled_at: new Date().toISOString() }).eq("id", subId);
        await db().from("billing_subscription_events").insert({ subscription_id: subId, event_type: "cancelled", old_status: "active", new_status: "cancelled", metadata: { at: "provider", via: "stripe" } });
      }
      break;
    }
    case "charge.refunded": {
      const pi = String(obj.payment_intent ?? "");
      if (pi) await db().from("billing_payments").update({ status: "refunded" }).eq("provider_payment_id", pi);
      break;
    }
    default:
      break;
  }
}

// ── Shared Stripe failure recording (charge/invoice/async failures) ──────
async function recordStripeFailure(
  ourSubId: string | null, code: string, message: string, obj: Record<string, unknown> | null,
): Promise<void> {
  let target: { id: string; user_id: string; status: string; plan_id: string } | null = null;
  if (ourSubId) {
    const r = await db().from("billing_subscriptions").select("id,user_id,status,plan_id").eq("id", ourSubId).maybeSingle();
    target = r.data as typeof target;
  }
  const stripeSub = obj ? String((obj.subscription as string | undefined) ?? "") : "";
  if (!target && stripeSub) {
    const r = await db().from("billing_subscriptions").select("id,user_id,status,plan_id")
      .eq("provider", "stripe").eq("provider_subscription_id", stripeSub).maybeSingle();
    target = r.data as typeof target;
  }
  if (!target) return; // unknown — acknowledge
  const amount = obj ? Number((obj.amount_due as number | undefined) ?? (obj.amount as number | undefined) ?? 0) / 100 : 0;
  const currency = obj ? String((obj.currency as string | undefined) ?? "USD").toUpperCase() : "USD";
  await db().from("billing_payments").insert({
    user_id: target.user_id, subscription_id: target.id, amount, currency,
    status: "failed", failure_code: code, failure_message: message,
  });
  await transitionSubscription(target.id, "past_due", "payment_failed", { via: "stripe", code });
  const { data: prow } = await db().from("billing_plans").select("grace_period_days").eq("id", target.plan_id).maybeSingle();
  const graceDays = Number((prow as { grace_period_days?: number } | null)?.grace_period_days ?? 3);
  await db().from("billing_subscriptions").update({
    grace_period_until: new Date(Date.now() + graceDays * 86400000).toISOString(),
  }).eq("id", target.id);
  try {
    const { data: rows } = await db().from("billing_customers").select("email").eq("user_id", target.user_id).limit(5);
    queueBillingEmail((((rows ?? []) as Array<{ email?: string }>).find((r) => r.email)?.email), "Noska payment failed", billingEmailHtml("Payment failed", [`We couldn't charge your subscription.`, `Your access continues during the grace period.`]));
  } catch { /* ignore */ }
}

// ── Stripe subscription sync (created/updated): status mapping + linking ─
const STRIPE_STATUS_MAP: Record<string, string> = {
  trialing: "trialing", active: "active", past_due: "past_due", unpaid: "unpaid",
  incomplete: "incomplete", incomplete_expired: "expired", canceled: "cancelled",
};

async function syncStripeSubscription(obj: Record<string, unknown>): Promise<void> {
  const stripeSubId = String(obj.id ?? "");
  const meta = (obj.metadata ?? {}) as Record<string, string>;
  if (!stripeSubId) return;
  const { data } = await db().from("billing_subscriptions").select("*").eq("id", meta.subscription_id ?? "").maybeSingle();
  let row = (data ?? null) as { id: string; status: string } | null;
  if (!row) {
    const byProv = await db().from("billing_subscriptions").select("id,status")
      .eq("provider", "stripe").eq("provider_subscription_id", stripeSubId).maybeSingle();
    row = (byProv.data ?? null) as typeof row;
  }
  if (!row) return; // unknown — acknowledge
  const patch: Record<string, unknown> = { provider_subscription_id: stripeSubId, updated_at: new Date().toISOString() };
  const pause = obj.pause_collection;
  const stripeStatus = pause ? "paused" : String(obj.status ?? "");
  const mapped = STRIPE_STATUS_MAP[stripeStatus];
  if (mapped && mapped !== row.status) {
    const t = await transitionSubscription(row.id, mapped, mapped === "active" ? "resumed" : mapped, { via: "stripe", stripe_status: stripeStatus });
    if (!t.ok) {
      // Fallback for states outside our machine (e.g. trialing→past_due): record event, set directly.
      await db().from("billing_subscription_events").insert({
        subscription_id: row.id, event_type: "provider_sync", old_status: row.status, new_status: mapped,
        metadata: { via: "stripe", stripe_status: stripeStatus },
      });
      patch.status = mapped;
    }
  }
  const trialEnd = Number(obj.trial_end ?? 0);
  if (trialEnd > 0) patch.trial_end = new Date(trialEnd * 1000).toISOString();
  await db().from("billing_subscriptions").update(patch).eq("id", row.id);
  blog("subscription_synced", { via: "stripe", status: stripeStatus });
}

// ── Stripe invoice sync (invoice.paid): renewals + hosted invoice URLs ───
async function syncStripeInvoice(obj: Record<string, unknown>): Promise<void> {
  const stripeSubId = String((obj.subscription as string | undefined) ?? "");
  const meta = (obj.metadata ?? {}) as Record<string, string>;
  let target: { id: string; user_id: string; status: string } | null = null;
  if (meta.subscription_id) {
    const r = await db().from("billing_subscriptions").select("id,user_id,status").eq("id", meta.subscription_id).maybeSingle();
    target = r.data as typeof target;
  }
  if (!target && stripeSubId) {
    const r = await db().from("billing_subscriptions").select("id,user_id,status")
      .eq("provider", "stripe").eq("provider_subscription_id", stripeSubId).maybeSingle();
    target = r.data as typeof target;
  }
  if (!target) return; // unknown — acknowledge
  const invoiceId = String(obj.id ?? "");
  const amount = Number((obj.amount_paid as number | undefined) ?? 0) / 100;
  const currency = String((obj.currency as string | undefined) ?? "usd").toUpperCase();
  const lines = ((obj.lines as { data?: Array<{ period?: { start?: number; end?: number } }> } | undefined)?.data ?? []);
  const period = lines[0]?.period;
  if (period?.start && period?.end) {
    await db().from("billing_subscriptions").update({
      current_period_start: new Date(period.start * 1000).toISOString(),
      current_period_end: new Date(period.end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", target.id);
  }
  const pi = typeof obj.payment_intent === "string" && obj.payment_intent ? obj.payment_intent : invoiceId;
  await db().from("billing_payments").upsert({
    user_id: target.user_id, subscription_id: target.id, provider_payment_id: pi,
    provider_order_id: invoiceId, provider_subscription_id: stripeSubId || null,
    amount, currency, status: "captured", payment_method: "stripe", paid_at: new Date().toISOString(),
  }, { onConflict: "provider_payment_id" });
  const invoiceNo = `NSK-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  await db().from("billing_invoices").upsert({
    user_id: target.user_id, subscription_id: target.id, provider_invoice_id: `stripe_${invoiceId}`,
    invoice_number: invoiceNo, status: "paid", amount, currency, total: amount,
    invoice_url: String(obj.hosted_invoice_url ?? "") || null,
    pdf_url: String(obj.invoice_pdf ?? "") || null,
    issued_at: new Date().toISOString(), paid_at: new Date().toISOString(),
  }, { onConflict: "provider_invoice_id" });
  // Recovery: a previously past_due subscription that just paid is active again.
  if (target.status === "past_due" || target.status === "unpaid") {
    await transitionSubscription(target.id, "active", "payment_recovered", { stripe_invoice_id: invoiceId });
  }
  blog("invoice_synced", { via: "stripe", invoice: invoiceId });
}
