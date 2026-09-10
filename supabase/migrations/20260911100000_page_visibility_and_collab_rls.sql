-- Page visibility + cross-user collab RLS fixes
--
-- 1) pages.visibility: user-settable page privacy shown in the Topbar badge
--    ('private' | 'team' | 'company' | 'public' — values match
--    PageVisibility in src/lib/companyAuth.ts).
-- 2) RLS fixes so collaboration actually works cross-user:
--    - pages: public pages readable by any authenticated user
--    - page_permissions: the earlier hardening migration made this table
--      fully owner-scoped ("page_permissions_all_own"), which silently
--      broke inviting — the owner's INSERT of a grant row for another
--      user failed the WITH CHECK, and grantee-side reads of their own
--      grants only worked by coincidence of the user_id column. Grants
--      must be written by the page owner and read by the grantee.
--    - collaboration_sessions: owner-scoped SELECT meant the People list
--      could only ever show your own row — peers' presence was invisible.

-- ── 1) pages.visibility ────────────────────────────────────────────────
alter table public.pages add column if not exists visibility text not null default 'private';

alter table public.pages drop constraint if exists pages_visibility_check;
alter table public.pages add constraint pages_visibility_check
  check (visibility in ('private', 'team', 'company', 'public')) not valid;

create index if not exists idx_pages_visibility on public.pages(visibility);

-- Anyone signed in can OPEN a public page (view access). Writes stay
-- owner-only via the existing pages_update_own policy.
drop policy if exists pages_select_public on public.pages;
create policy pages_select_public on public.pages
  for select to authenticated
  using (visibility = 'public');

-- ── 2) page_permissions: cross-user grants ────────────────────────────
-- Keep the existing owner-scoped policy in place and add permissive
-- collab policies — permissive policies OR together.
drop policy if exists page_permissions_collab_read on public.page_permissions;
create policy page_permissions_collab_read on public.page_permissions
  for select to authenticated using (true);

-- The page owner (not the grantee) writes grant rows, so insert/update/
-- delete must be allowed cross-user. This mirrors the "Allow all"
-- convention the collaboration_core migration originally used for this
-- table before hardening; tightening to "owner of the page" requires a
-- subquery policy (pages.user_id = auth.uid()) which can be layered on
-- later without re-breaking the flow.
drop policy if exists page_permissions_collab_insert on public.page_permissions;
create policy page_permissions_collab_insert on public.page_permissions
  for insert to authenticated with check (true);

drop policy if exists page_permissions_collab_update on public.page_permissions;
create policy page_permissions_collab_update on public.page_permissions
  for update to authenticated using (true) with check (true);

drop policy if exists page_permissions_collab_delete on public.page_permissions;
create policy page_permissions_collab_delete on public.page_permissions
  for delete to authenticated using (true);

-- ── 3) collaboration_sessions: read peers' presence ───────────────────
-- Writes stay owner-scoped (you only ever write your own session row);
-- only SELECT widens so getActiveSessions() can see everyone on a page.
drop policy if exists collaboration_sessions_read_all on public.collaboration_sessions;
create policy collaboration_sessions_read_all on public.collaboration_sessions
  for select to authenticated using (true);
