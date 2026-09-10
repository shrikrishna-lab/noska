-- Enable Supabase Realtime (postgres_changes) for the pages table.
--
-- Clients subscribe filtered by user_id (RLS is still enforced by Realtime's
-- WALRUS authorization, so a subscriber only ever receives rows their
-- auth.uid() may read). This powers DB-first page restore on re-login and
-- multi-device sync: inserts/updates/deletes committed by one device are
-- pushed to every other signed-in instance of the same user.
--
-- DELETE payloads expose only the primary key (`old.id`) — pages uses the
-- default replica identity, which is all the client needs since trash is a
-- soft flag (trashed=true) and hard deletes are the only DELETE events.
--
-- Idempotent: the production project (yxgtmzksnyarlivgxujf) already carries
-- pages in supabase_realtime, and re-adding raises
-- "already member of publication" — guard so db push stays green everywhere.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pages'
  ) then
    alter publication supabase_realtime add table public.pages;
  end if;
end
$$;
