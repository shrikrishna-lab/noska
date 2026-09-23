-- =====================================================================
-- Notifications v1 — backfill Clerk → GoTrue identity links
--
-- notification_private.resolve_user() maps a Clerk sub to a notification
-- uuid via notification_private.identities, but nothing ever wrote those
-- rows (notification_register_identity has no callers), so every Clerk
-- user failed identity resolution: Settings showed "Sign in…" while
-- signed in and the Inbox stayed empty.
--
-- Backfills links for existing users by matching profile email to the
-- GoTrue user's email (one mapping per GoTrue id). Going forward the
-- clerk-webhook registers the link on user.created / user.updated.
-- Users with no matching GoTrue row stay unlinked (same as today).
-- Idempotent: upsert on clerk_sub, safe to re-run.
--
-- Deploy: supabase db push (or db query --linked -f this file)
-- =====================================================================

insert into notification_private.identities (clerk_sub, user_id)
select distinct on (au.id) up.user_id, au.id
from public.user_profiles up
join auth.users au on lower(au.email) = lower(up.email)
where up.user_id ~ '^user_[A-Za-z0-9]+$'
  and up.email is not null
  and au.email is not null
order by au.id, up.user_id
on conflict (clerk_sub) do update set
  user_id = excluded.user_id,
  updated_at = now();
