-- =====================================================================
-- Billing v1 — 14-day trials on all paid plans
--
-- Product decision: Plus and Pro carry a 14-day trial (Team already
-- does). Aligns billing_plans with the official plan data.
-- Idempotent: plain update, safe to re-run.
--
-- Deploy: supabase db push (or db query --linked -f this file)
-- =====================================================================

update public.billing_plans
set trial_days = 14
where slug in ('plus', 'pro') and trial_days is distinct from 14;
