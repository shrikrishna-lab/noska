-- =====================================================================
-- Notifications v2 — email-match fallback in resolve_user
--
-- resolve_user() previously only knew auth.users ids and the identities
-- table (which nothing wrote). Now a Clerk sub also resolves through the
-- profile email: user_profiles.user_id (= clerk_sub) → email →
-- auth.users.email → uuid. SECURITY DEFINER, so signed-in callers benefit
-- without any new grants. First match wins; deterministic per input.
-- Idempotent: create or replace, safe to re-run.
--
-- Deploy: supabase db push (or db query --linked -f this file)
-- =====================================================================

create or replace function notification_private.resolve_user(p_id text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where u.id::text = p_id
  union all
  select i.user_id from notification_private.identities i where i.clerk_sub = p_id
  union all
  select au.id from auth.users au
  where au.email is not null and exists (
    select 1 from public.user_profiles up
    where up.user_id = p_id
      and up.email is not null
      and lower(up.email) = lower(au.email)
  )
  limit 1;
$$;
