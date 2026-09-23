-- =====================================================================
-- Referrals v1 — Clerk-compatible user ids
--
-- referral_codes.user_id / user_referrals.referrer_id|referred_id were
-- uuid, but every caller id in the app is a Clerk text id (see
-- billing_subscriptions.user_id = text). Widen to text so referral rows
-- can actually be written. Existing constraints (code unique,
-- referrer+referred unique pair) are preserved.
-- Idempotent: guarded by information_schema checks, safe to re-run.
--
-- Deploy: supabase db push (or db query --linked -f this file)
-- =====================================================================

-- The own-row SELECT policies compare uuid auth.uid() to these columns,
-- so they must be dropped before the alter and recreated with a cast.
drop policy if exists users_read_own_referral_codes on public.referral_codes;
drop policy if exists users_read_own_user_referrals on public.user_referrals;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'referral_codes' and column_name = 'user_id' and data_type <> 'text'
  ) then
    alter table public.referral_codes alter column user_id type text using user_id::text;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_name = 'user_referrals' and column_name = 'referrer_id' and data_type <> 'text'
  ) then
    alter table public.user_referrals alter column referrer_id type text using referrer_id::text;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_name = 'user_referrals' and column_name = 'referred_id' and data_type <> 'text'
  ) then
    alter table public.user_referrals alter column referred_id type text using referred_id::text;
  end if;
end $$;

create policy users_read_own_referral_codes
  on public.referral_codes for select to authenticated
  using ((auth.uid())::text = user_id);
create policy users_read_own_user_referrals
  on public.user_referrals for select to authenticated
  using ((auth.uid())::text = referrer_id or (auth.uid())::text = referred_id);
