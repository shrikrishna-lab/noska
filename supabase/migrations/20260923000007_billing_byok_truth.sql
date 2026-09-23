-- =====================================================================
-- Billing v2 — BYOK truth + official-spec limits
--
-- 1. Noska is BYOK (model calls run on the user's own provider key), so
--    AI-consumption metering is removed from the plan surface:
--      monthly_ai_credits, daily_ai_requests, premium_models rows deleted.
--    (The usage engine stays generic; top-up/referral credit ledger rows
--    are untouched and remain spendable if metering ever returns.)
-- 2. Monotonicity fixes per the official spec (Plus must not exceed Pro):
--      max_workspaces: free 3→1, plus 1000→3, pro 20→10, team 50→25
--      max_storage_mb: plus 51200→5120, pro 102400→20480, team 512000→51200
--      max_members:    plus 100→10 (pro 25, team 50 stand)
-- Idempotent: conditional updates + delete-if-exists, safe to re-run.
--
-- Deploy: supabase db push (or db query --linked -f this file)
-- =====================================================================

delete from public.billing_plan_features
where feature_key in ('monthly_ai_credits', 'daily_ai_requests', 'premium_models');

update public.billing_plan_features f set limit_value = v.limit_value
from public.billing_plans p
join (values
  ('free',  'max_workspaces', 1),
  ('plus',  'max_workspaces', 3),
  ('pro',   'max_workspaces', 10),
  ('team',  'max_workspaces', 25),
  ('plus',  'max_storage_mb', 5120),
  ('pro',   'max_storage_mb', 20480),
  ('team',  'max_storage_mb', 51200),
  ('plus',  'max_members', 10)
) as v(slug, feature_key, limit_value) on v.slug = p.slug
where f.plan_id = p.id
  and f.feature_key = v.feature_key
  and f.limit_value is distinct from v.limit_value;
