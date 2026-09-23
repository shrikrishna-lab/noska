// Referral loop: code issue → apply → complete on first paid activation.
// ai_credits tiers auto-fulfill as spendable top-up grants (the same pool
// billing-usage draws from); xp tiers bump the code counters. All other
// tiers (pro_days, theme, badge, …) are recorded as unlocked
// (reward_id + reward_claimed) for manual fulfillment.
import { db, HttpError, blog } from "./helpers.ts";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateReferralCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let s = "";
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `NOSKA-${s}`;
}

interface CodeRow {
  id: string;
  user_id: string;
  code: string;
  total_referrals: number;
  active_referrals: number;
  rewards_earned: number;
  ai_credits: number;
  xp: number;
  level: number;
}

export async function getOrCreateReferralCode(userId: string): Promise<CodeRow> {
  const { data: existing } = await db().from("referral_codes").select("*").eq("user_id", userId).maybeSingle();
  if (existing) return existing as CodeRow;
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const { data, error } = await db().from("referral_codes").insert({
      user_id: userId, code, total_referrals: 0, active_referrals: 0,
      rewards_earned: 0, ai_credits: 0, xp: 0, level: 1,
    }).select("*").single();
    if (!error && data) return data as CodeRow;
  }
  throw HttpError(500, "REFERRAL_CODE_FAILED", "Could not issue a referral code.");
}

export async function applyReferralCode(userId: string, rawCode: unknown): Promise<{ referrer_code: string }> {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!code) throw HttpError(400, "INVALID_REQUEST", "code is required.");
  const { data: row } = await db().from("referral_codes").select("id,user_id,code").eq("code", code).maybeSingle();
  const ref = row as { id: string; user_id: string; code: string } | null;
  if (!ref) throw HttpError(404, "REFERRAL_CODE_INVALID", "This invite code does not exist.");
  if (ref.user_id === userId) throw HttpError(400, "REFERRAL_SELF", "You cannot use your own invite code.");
  const { data: mine } = await db().from("user_referrals").select("id").eq("referred_id", userId).limit(1);
  if ((mine ?? []).length > 0) throw HttpError(409, "REFERRAL_ALREADY_APPLIED", "An invite code is already linked to your account.");
  const { error } = await db().from("user_referrals").insert({
    referrer_id: ref.user_id, referred_id: userId, referral_code_id: ref.id,
    status: "pending", reward_claimed: false, joined_at: new Date().toISOString(),
  });
  if (error) throw HttpError(409, "REFERRAL_ALREADY_APPLIED", "An invite code is already linked to your account.");
  const { count } = await db().from("user_referrals").select("id", { count: "exact", head: true }).eq("referrer_id", ref.user_id);
  await db().from("referral_codes").update({ total_referrals: count ?? 1, updated_at: new Date().toISOString() }).eq("id", ref.id);
  blog("referral_applied", { referrer: ref.user_id });
  return { referrer_code: ref.code };
}

interface RewardRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  value: number;
  min_referrals: number;
  icon: string | null;
  color: string | null;
}

/**
 * Complete pending referrals when the referee pays for the first time.
 * Idempotent (pending rows flip to completed exactly once) and total:
 * never throws, so payment webhooks cannot break on referral logic.
 */
export async function completeReferralActivation(userId: string): Promise<void> {
  try {
    const { data: pendings } = await db().from("user_referrals").select("id,referrer_id").eq("referred_id", userId).eq("status", "pending");
    for (const pr of ((pendings ?? []) as Array<{ id: string; referrer_id: string }>)) {
      await db().from("user_referrals").update({ status: "completed" }).eq("id", pr.id).eq("status", "pending");
      const { count: active } = await db().from("user_referrals").select("id", { count: "exact", head: true }).eq("referrer_id", pr.referrer_id).eq("status", "completed");
      const { count: total } = await db().from("user_referrals").select("id", { count: "exact", head: true }).eq("referrer_id", pr.referrer_id);
      const { data: rewards } = await db().from("referral_rewards").select("*").eq("active", true).order("min_referrals", { ascending: true });
      const tiers = ((rewards ?? []) as RewardRow[]).filter((r) => Number(r.min_referrals) <= Number(total ?? 1));
      const tier = tiers.length ? tiers[tiers.length - 1] : null;
      let grantedCredits = 0;
      let xpGain = 0;
      if (tier && Number(tier.value) > 0) {
        if (tier.type === "ai_credits") {
          grantedCredits = Number(tier.value);
          await db().from("billing_topup_purchases").insert({
            user_id: pr.referrer_id, product_id: null, provider_order_id: `referral:${pr.id}`,
            credits_granted: grantedCredits, credits_used: 0, status: "granted", expires_at: null,
          });
        } else if (tier.type === "xp") {
          xpGain = Number(tier.value);
        }
      }
      const { data: codeRow } = await db().from("referral_codes").select("*").eq("user_id", pr.referrer_id).maybeSingle();
      const cr = codeRow as CodeRow | null;
      if (cr) {
        await db().from("referral_codes").update({
          active_referrals: active ?? cr.active_referrals,
          total_referrals: total ?? cr.total_referrals,
          rewards_earned: Number(cr.rewards_earned ?? 0) + 1,
          ai_credits: Number(cr.ai_credits ?? 0) + grantedCredits,
          xp: Number(cr.xp ?? 0) + xpGain,
          updated_at: new Date().toISOString(),
        }).eq("id", cr.id);
      }
      await db().from("user_referrals").update({
        reward_id: tier ? tier.id : null,
        reward_claimed: Boolean(tier),
      }).eq("id", pr.id);
      blog("referral_completed", { referrer: pr.referrer_id, tier: tier ? tier.name : null, granted_credits: grantedCredits });
    }
  } catch (err) {
    blog("referral_complete_failed", { error: err instanceof Error ? err.message : String(err) });
  }
}

export async function getReferralSummary(userId: string): Promise<Record<string, unknown>> {
  const code = await getOrCreateReferralCode(userId);
  const { data: rewards } = await db().from("referral_rewards").select("id,name,description,type,value,min_referrals,icon,color").eq("active", true).order("min_referrals", { ascending: true });
  const { data: mine } = await db().from("user_referrals").select("id,status,reward_claimed,joined_at").eq("referred_id", userId).limit(1);
  const mineRow = ((mine ?? []) as Array<Record<string, unknown>>)[0] ?? null;
  const tiers = ((rewards ?? []) as RewardRow[]);
  const current = tiers.filter((r) => Number(r.min_referrals) <= Number(code.total_referrals)).pop() ?? null;
  const next = tiers.find((r) => Number(r.min_referrals) > Number(code.total_referrals)) ?? null;
  return {
    code: code.code,
    stats: {
      total_referrals: code.total_referrals,
      active_referrals: code.active_referrals,
      rewards_earned: code.rewards_earned,
      ai_credits: code.ai_credits,
      xp: code.xp,
      level: code.level,
    },
    current_tier: current ? { id: current.id, name: current.name, type: current.type, value: current.value } : null,
    next_tier: next ? { id: next.id, name: next.name, type: next.type, value: next.value, min_referrals: next.min_referrals } : null,
    rewards: tiers,
    referred: mineRow ? { status: mineRow.status, reward_claimed: mineRow.reward_claimed, joined_at: mineRow.joined_at } : null,
  };
}
