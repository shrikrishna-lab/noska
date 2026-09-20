// POST /billing-usage — server-side feature/limit gates + atomic consumption (§7).
// Body: { action: "check"|"consume", feature_key, amount?, workspace_id? }
// Never trusts client counters; resolves via billing_active_subscription + plan features + overrides + usage.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { db, cors, json, requireBillingUser, toErrorBody, blog, HttpError, rateLimit, activeTopups, allocateTopupConsume } from "../_shared/billing/helpers.ts";

const LIMIT_KEYS = new Set([
  "monthly_ai_credits", "daily_ai_requests", "max_workspaces", "max_pages", "max_storage_mb",
  "max_file_size_mb", "max_members", "max_databases", "max_widgets", "max_automations",
  "max_custom_agents", "max_mcp_calls",
]);

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { code: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireBillingUser(req);
    if (!rateLimit("usage:" + user.sub, 120)) return json(req, 429, { code: "RATE_LIMITED", message: "Too many requests." });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "check");
    const featureKey = String(body.feature_key ?? "").trim();
    const amount = Number(body.amount ?? 1);
    if (!featureKey) throw HttpError(400, "INVALID_REQUEST", "feature_key is required.");
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) throw HttpError(400, "INVALID_AMOUNT", "Invalid amount.");

    // Resolve entitlement server-side
    const now = new Date();
    const { data: subs } = await db().from("billing_subscriptions").select("*, plan:billing_plans(id,slug)")
      .eq("user_id", user.sub).order("created_at", { ascending: false }).limit(5);
    const active = (subs ?? []).find((s: Record<string, unknown>) => {
      const st = String(s.status);
      const end = s.current_period_end ? new Date(String(s.current_period_end)) : null;
      const grace = s.grace_period_until ? new Date(String(s.grace_period_until)) : null;
      const trialEnd = s.trial_end ? new Date(String(s.trial_end)) : null;
      if (st === "active") return !end || end > now;
      if (st === "trialing") return !trialEnd || trialEnd > now;
      if (st === "past_due") return !grace || grace > now;
      if (st === "cancelled") return Boolean(s.cancel_at_period_end) && (!end || end > now);
      return false;
    }) as Record<string, unknown> | undefined;

    let planId: string | null = (active?.plan_id as string | undefined) ?? null;
    if (!planId) {
      const { data: free } = await db().from("billing_plans").select("id").eq("slug", "free").maybeSingle();
      planId = (free as { id: string } | null)?.id ?? null;
    }
    if (!planId) throw HttpError(500, "PLAN_NOT_FOUND", "Default plan is not configured.");

    const { data: pf } = await db().from("billing_plan_features").select("*").eq("plan_id", planId).eq("feature_key", featureKey).maybeSingle();
    const prow = pf as { enabled: boolean; limit_value: number | null } | null;

    // Overrides win
    const { data: ov } = await db().from("billing_entitlement_overrides").select("*")
      .eq("user_id", user.sub).eq("feature_key", featureKey)
      .or("expires_at.is.null,expires_at.gt." + now.toISOString()).order("created_at", { ascending: false }).limit(1);
    const override = ((ov ?? [])[0]) as { enabled: boolean; limit_value: number | null } | undefined;

    const isLimit = LIMIT_KEYS.has(featureKey);
    if (!isLimit) {
      const allowed = override ? Boolean(override.enabled) : Boolean(prow?.enabled);
      if (!allowed) return json(req, 403, { code: "FEATURE_NOT_AVAILABLE", feature: featureKey, upgrade_required: true });
      blog("feature_check_ok", { feature: featureKey });
      return json(req, 200, { ok: true, feature: featureKey });
    }

    // Limit path: compute current usage. NULL limit = unlimited (Enterprise).
    const wsId = typeof body.workspace_id === "string" && body.workspace_id ? body.workspace_id : null;
    const limit = override?.limit_value ?? prow?.limit_value ?? null;
    if (limit === null || limit === undefined) {
      if (action === "consume" && featureKey === "monthly_ai_credits") {
        // Still meter unlimited pools for analytics (no enforcement).
        await db().rpc("service_consume_usage", {
          p_user_id: user.sub, p_feature: featureKey, p_amount: amount, p_workspace_id: wsId, p_limit: null,
        }).catch(() => null);
      }
      if (action === "check" || action === "consume") {
        return json(req, 200, { ok: true, feature: featureKey, unlimited: true });
      }
      throw HttpError(400, "INVALID_REQUEST", "Unknown action.");
    }
    const isDaily = featureKey === "daily_ai_requests";
    const pStart = isDaily
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      : ((active?.current_period_start as string | undefined) ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
    const pEnd = isDaily
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
      : ((active?.current_period_end as string | undefined) ?? new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString());

    let current = 0;
    if (featureKey === "max_workspaces") {
      const { count } = await db().from("workspaces").select("id", { count: "exact", head: true }).eq("owner_id", user.sub);
      current = count ?? 0;
    } else {
      const { data: rows } = await db().from("billing_usage_records").select("usage_value")
        .eq("user_id", user.sub).eq("feature_key", featureKey).gte("period_start", pStart).lte("period_end", pEnd);
      current = ((rows ?? []) as Array<{ usage_value: number }>).reduce((a, r) => a + Number(r.usage_value), 0);
    }

    // AI credits draw from plan pool + promotional top-up pool (§10).
    let bonusPool = 0;
    if (featureKey === "monthly_ai_credits") {
      bonusPool = (await activeTopups(user.sub)).reduce((a, g) => a + g.remaining, 0);
    }
    const poolLimit = Number(limit) + bonusPool;

    if (current + amount > poolLimit) {
      return json(req, 403, { code: "LIMIT_EXCEEDED", feature: featureKey, current, limit: poolLimit, upgrade_required: true });
    }
    if (action === "check") return json(req, 200, { ok: true, feature: featureKey, current, limit: poolLimit });

    if (action === "consume") {
      // Consume top-ups first (FIFO), remainder from the plan pool (atomic, locked).
      let remainder = amount;
      if (featureKey === "monthly_ai_credits" && bonusPool > 0) {
        remainder = await allocateTopupConsume(user.sub, amount);
      }
      if (remainder > 0) {
        const { data: res, error: rpcErr } = await db().rpc("service_consume_usage", {
          p_user_id: user.sub, p_feature: featureKey, p_amount: remainder, p_workspace_id: wsId, p_limit: Number(limit),
        });
        if (rpcErr) throw HttpError(500, "USAGE_RECORD_FAILED", "Could not record usage.");
        const r = res as { ok?: boolean; code?: string; current?: number } | null;
        if (r && r.ok === false) {
          if (r.code === "LIMIT_EXCEEDED") {
            return json(req, 403, { code: "LIMIT_EXCEEDED", feature: featureKey, current: r.current, limit: poolLimit, upgrade_required: true });
          }
          throw HttpError(500, "USAGE_RECORD_FAILED", "Could not record usage.");
        }
      }
      blog("usage_consumed", { feature: featureKey, amount });
      return json(req, 200, { ok: true, feature: featureKey, consumed: amount, current: current + amount, limit: poolLimit });
    }
    throw HttpError(400, "INVALID_REQUEST", "Unknown action.");
  } catch (e) {
    const { status, body } = toErrorBody(e);
    return json(req, status, body);
  }
});
