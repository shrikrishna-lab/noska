// POST /billing-manage — self-service subscription actions.
// Actions: cancel (at period end default / immediate), resume, change_plan (upgrade immediate / downgrade scheduled),
// downgrade_preview, update_seats, update_billing_profile, portal (Stripe Customer Portal).
// Provider-side changes go through the payment APIs server-side; DB updates follow provider confirmation.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { db, cors, json, requireBillingUser, toErrorBody, blog, HttpError, rateLimit, rzpRequest, razorpayConfigured, stripeRequest, stripeConfigured, transitionSubscription } from "../_shared/billing/helpers.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { code: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireBillingUser(req);
    if (!rateLimit("manage:" + user.sub, 20)) return json(req, 429, { code: "RATE_LIMITED", message: "Too many requests." });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const { data: subs } = await db().from("billing_subscriptions").select("*, plan:billing_plans(id,slug,name)")
      .eq("user_id", user.sub).order("created_at", { ascending: false }).limit(1);
    const s = ((subs ?? [])[0]) as {
      id: string; status: string; plan_id: string; billing_cycle: string; cancel_at_period_end: boolean;
      current_period_end: string | null; provider: string | null; provider_subscription_id: string | null; scheduled_plan_id: string | null;
      amount: number; currency: string;
      plan?: { slug: string; name: string };
    } | undefined;
    if (!s) return json(req, 404, { code: "SUBSCRIPTION_NOT_FOUND", message: "No subscription found." });

    // Cancel a provider-side subscription object (Stripe sub_*, Razorpay subscription).
    async function providerCancel(atPeriodEnd: boolean): Promise<void> {
      const pid = s!.provider_subscription_id;
      if (!pid) return;
      try {
        if (pid.startsWith("sub_") && stripeConfigured()) {
          if (atPeriodEnd) await stripeRequest("POST", `/subscriptions/${pid}`, { cancel_at_period_end: "true" });
          else await stripeRequest("DELETE", `/subscriptions/${pid}`, {});
        } else if (razorpayConfigured()) {
          await rzpRequest("POST", `/subscriptions/${pid}/cancel`, {});
        }
      } catch { /* provider cancel is best-effort; local state + webhooks converge */ }
    }

    if (action === "cancel") {
      if (s.status === "cancelled" && s.cancel_at_period_end) {
        return json(req, 409, { code: "SUBSCRIPTION_ALREADY_CANCELLED", message: "Subscription is already set to cancel." });
      }
      if (!["active", "trialing", "past_due", "paused"].includes(s.status)) {
        return json(req, 409, { code: "INVALID_SUBSCRIPTION_TRANSITION", message: "This subscription cannot be cancelled." });
      }
      const immediate = body.immediate === true;
      if (immediate) {
        await providerCancel(false);
        const t = await transitionSubscription(s.id, "cancelled", "cancelled", { at: "immediate", by: "self" });
        if (!t.ok) return json(req, 409, { code: t.code ?? "INVALID_SUBSCRIPTION_TRANSITION" });
        await db().from("billing_subscriptions").update({ cancel_at_period_end: false, ended_at: new Date().toISOString() }).eq("id", s.id);
      } else {
        await providerCancel(true);
        await db().from("billing_subscriptions").update({
          cancel_at_period_end: true, cancelled_at: new Date().toISOString(),
        }).eq("id", s.id);
        await db().from("billing_subscription_events").insert({
          subscription_id: s.id, event_type: "cancelled", old_status: s.status, new_status: s.status,
          metadata: { at: "period_end", by: "self" },
        });
      }
      blog("subscription_cancelled", { mode: immediate ? "immediate" : "period_end" });
      return json(req, 200, { ok: true, cancel_at_period_end: !immediate, current_period_end: s.current_period_end });
    }

    if (action === "resume") {
      if (!(s.status === "cancelled" && s.cancel_at_period_end)) {
        return json(req, 409, { code: "INVALID_SUBSCRIPTION_TRANSITION", message: "Only subscriptions cancelled at period end can be resumed." });
      }
      if (s.current_period_end && new Date(s.current_period_end) <= new Date()) {
        return json(req, 409, { code: "SUBSCRIPTION_ALREADY_CANCELLED", message: "The billing period already ended." });
      }
      // Re-activate provider-side when we had scheduled a period-end cancel.
      if (s.provider_subscription_id?.startsWith("sub_") && stripeConfigured()) {
        try {
          await stripeRequest("POST", `/subscriptions/${s.provider_subscription_id}`, { cancel_at_period_end: "false" });
        } catch { /* best-effort */ }
      }
      await db().from("billing_subscriptions").update({ cancel_at_period_end: false, cancelled_at: null }).eq("id", s.id);
      await db().from("billing_subscription_events").insert({
        subscription_id: s.id, event_type: "resumed", old_status: s.status, new_status: s.status, metadata: { by: "self" },
      });
      blog("subscription_resumed", {});
      return json(req, 200, { ok: true });
    }

    if (action === "change_plan") {
      const targetSlug = String(body.plan_slug ?? "").trim().toLowerCase();
      const cycle = String(body.billing_cycle ?? s.billing_cycle).toLowerCase();
      if (!targetSlug) throw HttpError(400, "INVALID_REQUEST", "plan_slug is required.");
      const { data: target } = await db().from("billing_plans").select("*").eq("slug", targetSlug).maybeSingle();
      const t = target as { id: string; slug: string; name: string; status: string; is_public: boolean; monthly_price: number; yearly_price: number } | null;
      if (!t || t.status !== "active" || !t.is_public) return json(req, 404, { code: "PLAN_NOT_FOUND" });
      if (t.id === s.plan_id && cycle === s.billing_cycle) return json(req, 200, { ok: true, unchanged: true });

      const currentPrice = Number(s.amount ?? 0);
      const targetPrice = cycle === "yearly" ? Number(t.yearly_price ?? 0) : Number(t.monthly_price ?? 0);
      const isUpgrade = targetPrice > currentPrice;

      if (isUpgrade) {
        // Upgrade: create a new pending subscription via checkout flow semantics (charge now, activate on verify).
        // (No provider-side mutation: the new Checkout Session supersedes; cancel the old
        // Stripe subscription at period end once the new one activates — handled by webhook + schedule.)
        if (s.provider_subscription_id && !s.provider_subscription_id.startsWith("sub_") && razorpayConfigured()) {
          // Best-effort legacy provider update; DB change below is authoritative after payment verify.
          await rzpRequest("PATCH", `/subscriptions/${s.provider_subscription_id}`, {}).catch(() => null);
        }
        const nowT = new Date();
        const periodEnd = cycle === "yearly" ? new Date(nowT.getTime() + 365 * 86400000) : new Date(nowT.getTime() + 30 * 86400000);
        const { data: created } = await db().from("billing_subscriptions").insert({
          user_id: user.sub, plan_id: t.id, provider: s.provider ?? "stripe", status: "pending",
          billing_cycle: cycle, currency: s.currency, amount: targetPrice,
          current_period_start: nowT.toISOString(), current_period_end: periodEnd.toISOString(),
          metadata: { upgrade_from: s.id },
        }).select("id").single();
        await db().from("billing_subscription_events").insert({
          subscription_id: (created as { id: string }).id, event_type: "upgraded",
          old_status: null, new_status: "pending", metadata: { from_subscription: s.id, from_plan: s.plan?.slug },
        });
        blog("subscription_upgraded", { from: s.plan?.slug, to: t.slug });
        return json(req, 200, { ok: true, mode: "upgrade_checkout", subscription_id: (created as { id: string }).id, amount: targetPrice, currency: s.currency });
      }

      // Downgrade: keep current plan until period end, schedule target after (§12). Never deletes data.
      await db().from("billing_subscriptions").update({ scheduled_plan_id: t.id }).eq("id", s.id);
      await db().from("billing_subscription_events").insert({
        subscription_id: s.id, event_type: "downgraded", old_status: s.status, new_status: s.status,
        metadata: { scheduled_plan: t.slug, effective: s.current_period_end, by: "self" },
      });
      blog("subscription_downgraded", { to: t.slug });
      return json(req, 200, { ok: true, mode: "downgrade_scheduled", effective: s.current_period_end, plan: t.slug });
    }

    // Downgrade preview (§16): current usage vs target plan limits — warn before applying.
    if (action === "downgrade_preview") {
      const targetSlug = String(body.plan_slug ?? "").trim().toLowerCase();
      const { data: target } = await db().from("billing_plans").select("id,slug,name").eq("slug", targetSlug).maybeSingle();
      if (!target) return json(req, 404, { code: "PLAN_NOT_FOUND" });
      const { data: tfeats } = await db().from("billing_plan_features").select("feature_key,limit_value")
        .eq("plan_id", (target as { id: string }).id);
      const limits: Record<string, number | null> = {};
      for (const f of (tfeats ?? []) as Array<{ feature_key: string; limit_value: number | null }>) {
        if (/^(max_|monthly_|daily_)/.test(f.feature_key)) limits[f.feature_key] = f.limit_value;
      }
      const { count: ws } = await db().from("workspaces").select("id", { count: "exact", head: true }).eq("owner_id", user.sub);
      const { data: usage } = await db().from("billing_usage_records").select("feature_key,usage_value")
        .eq("user_id", user.sub).gte("period_start", s.current_period_start ?? new Date(0).toISOString());
      const used: Record<string, number> = { workspaces: ws ?? 0 };
      for (const u of (usage ?? []) as Array<{ feature_key: string; usage_value: number }>) {
        used[u.feature_key] = (used[u.feature_key] ?? 0) + Number(u.usage_value);
      }
      const warnings: Array<{ key: string; used: number; allowed: number | null }> = [];
      for (const [k, lim] of Object.entries(limits)) {
        if (lim === null || lim === undefined) continue;
        const u = k === "max_workspaces" ? (used["workspaces"] ?? 0) : (used[k] ?? 0);
        if (u > Number(lim)) warnings.push({ key: k, used: u, allowed: Number(lim) });
      }
      return json(req, 200, { ok: true, target: targetSlug, used, limits, warnings, effective: s.current_period_end });
    }

    if (action === "update_seats") {
      const seats = Math.floor(Number(body.seats ?? 0));
      if (!Number.isInteger(seats) || seats < 1 || seats > 1000) throw HttpError(400, "INVALID_REQUEST", "Seats must be 1–1000.");
      const { data: pl } = await db().from("billing_plans").select("id,metadata").eq("id", s.plan_id).maybeSingle();
      if (!Boolean((pl as { metadata?: Record<string, unknown> } | null)?.metadata?.per_seat)) {
        throw HttpError(400, "INVALID_REQUEST", "Seats only apply to the Team plan.");
      }
      await db().from("billing_subscription_items").update({ quantity: seats }).eq("subscription_id", s.id).eq("product_key", `seat:${s.plan?.slug ?? "team"}`);
      const { data: cur } = await db().from("billing_subscriptions").select("metadata").eq("id", s.id).maybeSingle();
      const meta = ((cur as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
      await db().from("billing_subscriptions").update({ metadata: { ...meta, seats } }).eq("id", s.id);
      await db().from("billing_subscription_events").insert({
        subscription_id: s.id, event_type: "seats_updated", old_status: s.status, new_status: s.status,
        metadata: { seats, by: "self" },
      });
      blog("seats_updated", { seats });
      return json(req, 200, { ok: true, seats, note: "Seat changes apply from the next billing cycle." });
    }

    // Billing profile (§37): country drives currency; GSTIN/address go on invoices.
    if (action === "update_billing_profile") {
      const patch: Record<string, unknown> = {};
      if (typeof body.billing_country === "string" && /^[A-Za-z]{2}$/.test(body.billing_country.trim())) {
        patch.billing_country = body.billing_country.trim().toUpperCase();
      }
      if (typeof body.gstin === "string") patch.gstin = body.gstin.trim().slice(0, 20) || null;
      if (typeof body.billing_name === "string") patch.billing_name = body.billing_name.trim().slice(0, 120) || null;
      if (typeof body.billing_email === "string") patch.billing_email = body.billing_email.trim().slice(0, 160) || null;
      if (body.billing_address && typeof body.billing_address === "object") {
        const a = body.billing_address as Record<string, unknown>;
        patch.billing_address = {
          line1: String(a.line1 ?? "").slice(0, 200), city: String(a.city ?? "").slice(0, 100),
          state: String(a.state ?? "").slice(0, 100), postal: String(a.postal ?? "").slice(0, 20),
          country: String(a.country ?? patch.billing_country ?? "").slice(0, 2),
        };
      }
      if (!Object.keys(patch).length) throw HttpError(400, "INVALID_REQUEST", "Nothing to update.");
      // Ensure a customer row exists for at least one provider, then update all rows.
      await db().from("billing_customers").upsert({ user_id: user.sub, provider: "stripe" }, { onConflict: "user_id,provider" });
      await db().from("billing_customers").update(patch).eq("user_id", user.sub);
      blog("billing_profile_updated", { country: patch.billing_country ?? null });
      return json(req, 200, { ok: true, ...patch });
    }

    // Stripe Customer Portal: self-service payment method / plan / invoice management.
    // Requires a portal configuration in the Stripe Dashboard (Settings → Billing → Customer portal).
    if (action === "portal") {
      if (!stripeConfigured()) {
        return json(req, 503, { code: "PAYMENT_PROVIDER_NOT_CONFIGURED", message: "Online payments are not configured yet." });
      }
      const { data: rows } = await db().from("billing_customers").select("provider_customer_id,provider").eq("user_id", user.sub).limit(5);
      const cusId = (((rows ?? []) as Array<{ provider_customer_id?: string; provider?: string }>)
        .find((r) => r.provider === "stripe" && r.provider_customer_id)?.provider_customer_id)
        ?? (((rows ?? []) as Array<{ provider_customer_id?: string }>).find((r) => r.provider_customer_id)?.provider_customer_id)
        ?? null;
      if (!cusId) {
        return json(req, 400, { code: "SUBSCRIPTION_NOT_FOUND", message: "No Stripe customer yet. Complete a checkout first." });
      }
      const origin = (() => {
        const o = String(body.app_origin ?? req.headers.get("origin") ?? "");
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return o;
        if (/^https:\/\/([\w-]+\.)?noska\.me$/.test(o)) return o;
        return "https://app.noska.me";
      })();
      const ps = await stripeRequest("POST", "/billing_portal/sessions", {
        customer: cusId, "return_url": `${origin}/settings/billing`,
      });
      if (!ps.ok) {
        blog("portal_failed", { status: ps.status });
        return json(req, 502, { code: "CHECKOUT_FAILED", message: "Customer portal is not configured yet. Contact support." });
      }
      return json(req, 200, { ok: true, portal_url: (ps.data as { url: string }).url });
    }

    throw HttpError(400, "INVALID_REQUEST", "Unknown action.");
  } catch (e) {
    const { status, body } = toErrorBody(e);
    return json(req, status, body);
  }
});
