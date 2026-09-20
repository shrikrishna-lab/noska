// GET /billing-entitlements — centralized entitlement snapshot (§6).
// Auth: gateway-verified JWT (Clerk sub or GoTrue). No secrets. Cached 30s client-side.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { db, cors, json, requireBillingUser, toErrorBody, blog, processDueSchedule, activeTopups, currencyForCountry } from "../_shared/billing/helpers.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "GET") return json(req, 405, { code: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireBillingUser(req);
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspace_id");

    // Lazy schedule processing: activate due downgrades / expire ended rows (idempotent).
    await processDueSchedule();

    // Resolve via SECURITY DEFINER RPCs with the user's JWT (RLS-safe).
    // Edge uses service client; emulate user scope by filtering user_id explicitly.
    const { data: plans } = await db().from("billing_plans").select("*").eq("status", "active").order("display_order");
    const { data: subs } = await db().from("billing_subscriptions").select("*, plan:billing_plans(id,name,slug)")
      .eq("user_id", user.sub).order("created_at", { ascending: false }).limit(5);

    const now = new Date();
    const active = (subs ?? []).find((s: Record<string, unknown>) => {
      const st = String(s.status);
      const end = s.current_period_end ? new Date(String(s.current_period_end)) : null;
      const grace = s.grace_period_until ? new Date(String(s.grace_period_until)) : null;
      const trialEnd = s.trial_end ? new Date(String(s.trial_end)) : null;
      if (st === "active") return !end || end > now;
      if (st === "trialing") return !trialEnd || trialEnd > now;
      if (st === "past_due") return !grace || grace > now;
      if (st === "cancelled") return Boolean(s.cancel_at_period_end) && (!end || end > now);
      if (st === "paused") return !end || end > now;
      return false;
    }) as (Record<string, unknown> & { plan?: { id: string; name: string; slug: string } }) | undefined;

    let plan = (plans ?? []).find((p: Record<string, unknown>) => p.slug === "free") ?? (plans ?? [])[0];
    if (active?.plan_id) {
      const found = (plans ?? []).find((p: Record<string, unknown>) => p.id === active.plan_id);
      if (found) plan = found;
    }

    const { data: planFeatures } = await db().from("billing_plan_features").select("*").eq("plan_id", plan.id);
    const features: Record<string, boolean> = {};
    const limits: Record<string, number | null> = {};
    for (const f of (planFeatures ?? []) as Array<{ feature_key: string; enabled: boolean; limit_value: number | null }>) {
      if (/^(max_|monthly_|daily_)/.test(f.feature_key) || /_(mb|credits|requests|members|calls|agents|automations|widgets|databases|pages|workspaces)$/.test(f.feature_key)) {
        limits[f.feature_key] = f.limit_value;
      } else {
        features[f.feature_key] = Boolean(f.enabled);
      }
    }

    // Admin overrides (non-expired)
    const { data: overrides } = await db().from("billing_entitlement_overrides").select("*")
      .eq("user_id", user.sub).or("expires_at.is.null,expires_at.gt." + now.toISOString());
    for (const o of (overrides ?? []) as Array<{ feature_key: string; enabled: boolean; limit_value: number | null }>) {
      if (o.limit_value !== null && o.limit_value !== undefined) {
        limits[o.feature_key] = Number(o.limit_value);
        features[o.feature_key] = o.enabled !== false;
      } else {
        features[o.feature_key] = Boolean(o.enabled);
      }
    }

    // Usage for current period
    const periodStart = (active?.current_period_start as string | undefined) ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = (active?.current_period_end as string | undefined) ?? new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data: usageRows } = await db().from("billing_usage_records").select("feature_key,usage_value")
      .eq("user_id", user.sub).gte("period_start", periodStart).lte("period_end", periodEnd);
    const usage: Record<string, number> = {};
    for (const u of (usageRows ?? []) as Array<{ feature_key: string; usage_value: number }>) {
      usage[u.feature_key] = (usage[u.feature_key] ?? 0) + Number(u.usage_value);
    }
    // Workspaces live count
    const { count: wsCount } = await db().from("workspaces").select("id", { count: "exact", head: true }).eq("owner_id", user.sub);
    usage["workspaces"] = wsCount ?? 0;

    const remaining: Record<string, number> = {};
    for (const [k, lim] of Object.entries(limits)) {
      if (lim === null || lim === undefined) continue; // unlimited (Enterprise): no remaining math
      const usedKey = k === "max_workspaces" ? "workspaces" : k;
      remaining[k] = Math.max(Number(lim) - (usage[usedKey] ?? 0), 0);
    }

    // Credit ledger breakdown (§10): plan pool + promotional top-up pool.
    // remaining_credits = plan_credits + bonus_credits - used_credits (null when unlimited).
    const planCredits = limits["monthly_ai_credits"] ?? null;
    const grants = await activeTopups(user.sub);
    const bonusCredits = grants.reduce((a, g) => a + g.remaining, 0);
    const usedCredits = usage["monthly_ai_credits"] ?? 0;
    const credits = {
      plan_credits: planCredits,
      bonus_credits: bonusCredits,
      used_credits: usedCredits,
      remaining_credits: planCredits === null || planCredits === undefined
        ? null
        : Math.max(Number(planCredits) + bonusCredits - usedCredits, 0),
      topups: grants.map((g) => ({ remaining: g.remaining, expires_at: g.expires_at })),
    };

    void workspaceId;
    // Customer billing profile → display currency (user-set country, else USD).
    const { data: custRows } = await db().from("billing_customers").select("billing_country").eq("user_id", user.sub).limit(5);
    const billingCountry = (((custRows ?? []) as Array<{ billing_country?: string }>).find((r) => r.billing_country)?.billing_country) ?? null;
    const customer = { billing_country: billingCountry, display_currency: currencyForCountry(billingCountry) };
    blog("entitlement_resolved", { plan: (plan as { slug: string }).slug, status: active ? String(active.status) : "none" });
    return json(req, 200, {
      plan: { id: (plan as { id: string }).id, name: (plan as { name: string }).name, slug: (plan as { slug: string }).slug },
      features, limits, usage, remaining, credits, customer,
      subscription: active ? {
        id: active.id, status: active.status, billing_cycle: active.billing_cycle,
        current_period_end: active.current_period_end, cancel_at_period_end: active.cancel_at_period_end,
        trial_end: active.trial_end, grace_period_until: active.grace_period_until,
      } : { status: "none" },
    });
  } catch (e) {
    const { status, body } = toErrorBody(e);
    return json(req, status, body);
  }
});
