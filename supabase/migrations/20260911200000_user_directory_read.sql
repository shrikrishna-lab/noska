-- User directory read access — fixes Share typeahead + invite resolution
--
-- The hardening migration made user_profiles strictly owner-readable
-- (user_profiles_select_own), which is right for its sensitive columns
-- (email, ip_address, lat/long, postal code) but broke every feature that
-- must look up OTHER users by handle:
--   - Share modal username typeahead (searches, always saw zero rows)
--   - sendPageInvite / findUserByUsername (always "No user found")
--   - isUsernameAvailable (every name looked free; only the DB unique
--     index backstopped collisions)
--
-- Fix: SECURITY DEFINER functions that bypass RLS internally but expose
-- ONLY the public directory columns (user_id, user_name, username,
-- avatar_url). Email/IP/geo never leave the server.

create or replace function public.search_user_directory(p_query text, p_limit int default 6)
returns table (user_id text, user_name text, username text, avatar_url text)
language sql
security definer
stable
set search_path = public
as $$
  select up.user_id, up.user_name, up.username, up.avatar_url
  from public.user_profiles up
  where up.username is not null
    and length(trim(p_query)) >= 1
    and (
      up.username ilike '%' || regexp_replace(trim(p_query), '([%_\\])', '\\\1', 'g') || '%'
      or up.user_name ilike '%' || regexp_replace(trim(p_query), '([%_\\])', '\\\1', 'g') || '%'
      or coalesce(up.email, '') ilike '%' || regexp_replace(trim(p_query), '([%_\\])', '\\\1', 'g') || '%'
    )
  order by (up.username ilike regexp_replace(trim(p_query), '([%_\\])', '\\\1', 'g') || '%') desc, up.username
  limit least(greatest(coalesce(p_limit, 6), 1), 20);
$$;

create or replace function public.lookup_user_directory(p_username text)
returns table (user_id text, user_name text, username text, avatar_url text)
language sql
security definer
stable
set search_path = public
as $$
  select up.user_id, up.user_name, up.username, up.avatar_url
  from public.user_profiles up
  where up.username is not null
    and (
      up.username ilike btrim(p_username)
      or coalesce(up.email, '') ilike btrim(p_username)
    )
  limit 1;
$$;

-- Executable by both anon and authenticated users
grant execute on function public.search_user_directory(text, int) to anon, authenticated, public;
grant execute on function public.lookup_user_directory(text) to anon, authenticated, public;
