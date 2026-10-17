-- Final definitions for the page link-sharing backend introduced in
-- 20260926182431_page_access_requests_and_link_sharing.sql.
--
-- Four defects were found by exercising the flow against real rows, and each
-- is corrected here:
--
--   1. Identity. `pages.user_id` and `page_permissions.user_id` hold the Clerk
--      subject, while `notification_private.my_canonical_id()` returns the
--      auth.users uuid. Comparing one against the other made an owner look like
--      a stranger. Ownership now goes through `notification_private.owns_page()`,
--      which resolves both representations, and the Clerk subject is what gets
--      written — matching `acceptPageInvite` and the RLS predicates.
--   2. Column shadowing. The `username` plpgsql variable hid
--      `user_profiles.username`, so requesting access failed with
--      "column reference username is ambiguous". The column is now qualified.
--   3. Service-role writes. The link-access guard also fired for admin/service
--      writes, which carry no end-user JWT. It now only polices authenticated
--      user sessions, mirroring how RLS treats the service role.
--   4. Fork id map. `select key::uuid from jsonb_object_keys(...)` has no
--      column named `key` without an alias, so the copy insert failed. Also,
--      requiring a `workspaces` row made forking impossible in deployments
--      where every page carries `workspace_id = ''`; a named workspace must
--      still be one the caller belongs to.

-- ─── Guard: only the owner may change link sharing ───────────────────────────

create or replace function notification_private.guard_page_link_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.link_access is distinct from old.link_access
     and auth.jwt() ->> 'sub' is not null
     and not notification_private.owns_page(old.id) then
    raise exception 'ONLY_PAGE_OWNER_CAN_CHANGE_LINK_ACCESS' using errcode = '42501';
  end if;
  return new;
end $$;

-- ─── Guard: ownership and owner-only settings ─────────────────────────────────
-- Found by testing the three roles against real rows with each user's own JWT.
-- `pages_update_own_or_editor` lets an editor write any column, so an editor
-- could:
--   * rewrite `user_id` and become the owner — after which every other owner
--     action (delete, change link access, move) became theirs too, and the
--     original owner silently lost the page;
--   * set `visibility`/`is_public` and expose a private page to the web, which
--     the UI already restricts to the owner;
--   * trash, lock or encrypt somebody else's page, or move it to a workspace
--     they do not belong to.
-- The UI already treats all of these as owner-only, so the server was the
-- weaker of the two. Editors keep the content columns they are supposed to
-- have: title, blocks, icon, cover, tags and layout.
--
-- The column list is explicit rather than an allow-list of editable columns so
-- that adding a content column later does not silently become owner-only, while
-- every column here is a decision about *the page* rather than its contents.

create or replace function notification_private.guard_page_owner_only_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched text;
begin
  -- Service-role / admin writes carry no end-user JWT and are trusted, matching
  -- how RLS itself exempts them.
  if auth.jwt() ->> 'sub' is null then
    return new;
  end if;
  if notification_private.owns_page(old.id) then
    return new;
  end if;

  -- Report the first offending column so the failure names the actual cause.
  select c into touched
    from unnest(array[
      'user_id','visibility','is_public','link_access','trashed',
      'is_locked','is_encrypted','encrypted_blocks','iv','salt',
      'workspace_id','organization_id','team_id'
    ]) as c
   where to_jsonb(new) ->> c is distinct from to_jsonb(old) ->> c
   limit 1;

  if touched is not null then
    raise exception 'ONLY_PAGE_OWNER_CAN_CHANGE_%', upper(touched)
      using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists pages_guard_owner_only_columns on public.pages;
create trigger pages_guard_owner_only_columns
  before update on public.pages
  for each row execute function notification_private.guard_page_owner_only_columns();

-- ─── What does this visitor see? ─────────────────────────────────────────────
-- Presentation metadata only, never blocks. A restricted page keeps its title
-- hidden, so holding the id alone leaks nothing.

create or replace function public.page_access_info(p_page uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.pages%rowtype;
  me_sub text := auth.jwt() ->> 'sub';
  me uuid := notification_private.current_user_id();
  pending_id uuid;
  pending_role text;
  is_owner boolean;
  can_read boolean;
  existing_role text;
  collaborator_count int;
begin
  if p_page is null then
    raise exception 'PAGE_REQUIRED' using errcode = '22023';
  end if;

  select * into p from public.pages where id = p_page and not coalesce(trashed, false);
  if not found then
    return jsonb_build_object('found', false);
  end if;

  is_owner := notification_private.owns_page(p.id);

  select perm.role into existing_role
    from public.page_permissions perm
   where perm.page_id = p.id and perm.user_id = me_sub;

  can_read := is_owner
    or existing_role is not null
    or (me is not null and notification_private.can_access_page(me, p.id))
    or p.link_access = 'view'
    or p.visibility = 'public';

  select r.id, r.role_requested into pending_id, pending_role
    from public.page_access_requests r
   where r.page_id = p.id
     and r.requester_user_id = me_sub
     and r.status = 'pending'
   limit 1;

  select count(*)::int into collaborator_count
    from public.page_permissions perm where perm.page_id = p.id;

  return jsonb_build_object(
    'found', true,
    'page_id', p.id,
    'is_owner', is_owner,
    'has_access', can_read,
    'role', case when is_owner then 'owner' else existing_role end,
    'link_access', p.link_access,
    'visibility', p.visibility,
    'collaborator_count', collaborator_count,
    'pending_request_id', pending_id,
    'pending_role', pending_role,
    'can_request', (not is_owner) and p.link_access = 'restricted' and not can_read,
    -- `fork` additionally requires the owner to have published the page to the
    -- web (`visibility = 'public'`). Forking hands out a full copy, so it is
    -- only offered for pages the owner has deliberately put on the web.
    'can_fork', (not is_owner) and p.link_access = 'fork'
      and p.visibility = 'public' and not can_read,
    'can_view_link', (not is_owner) and p.link_access = 'view' and not can_read,
    'title', case
      when can_read or p.link_access <> 'restricted' then p.title
      else null
    end,
    'icon', case
      when can_read or p.link_access <> 'restricted' then p.icon
      else null
    end
  );
end $$;

-- ─── Request access ──────────────────────────────────────────────────────────

create or replace function public.request_page_access(
  p_page uuid,
  p_message text default null,
  p_role text default 'editor'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pages%rowtype;
  me_sub text := auth.jwt() ->> 'sub';
  me uuid := notification_private.current_user_id();
  username text;
  request_id uuid;
begin
  if p_page is null then
    raise exception 'PAGE_REQUIRED' using errcode = '22023';
  end if;
  if me_sub is null or me is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_role not in ('editor', 'commenter', 'viewer') then
    raise exception 'INVALID_ROLE' using errcode = '22023';
  end if;

  select * into p from public.pages where id = p_page and not coalesce(trashed, false);
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if notification_private.owns_page(p.id) then
    raise exception 'ALREADY_THE_OWNER' using errcode = '42501';
  end if;
  if (me is not null and notification_private.can_access_page(me, p.id)) or exists (
    select 1 from public.page_permissions perm
     where perm.page_id = p.id and perm.user_id = me_sub
  ) then
    raise exception 'ALREADY_HAS_ACCESS' using errcode = '42501';
  end if;
  if p.link_access <> 'restricted' then
    raise exception 'LINK_ACCESS_ALREADY_GRANTED' using errcode = '42501';
  end if;

  select coalesce(nullif(rtrim(up.username), ''), nullif(rtrim(up.user_name), ''), 'Someone')
    into username
    from public.user_profiles up
   where up.user_id = me_sub
   limit 1;

  insert into public.page_access_requests (
    page_id, requester_user_id, requester_username, owner_user_id, message, role_requested
  ) values (
    p.id, me_sub, username, coalesce(p.user_id, ''),
    nullif(left(coalesce(p_message, ''), 1000), ''), p_role
  )
  on conflict (page_id, requester_user_id) where status = 'pending'
  do update set message = excluded.message, role_requested = excluded.role_requested
  returning id into request_id;

  return jsonb_build_object('request_id', request_id, 'status', 'pending');
end $$;

-- ─── Owner decides ───────────────────────────────────────────────────────────
-- Approval writes the `page_permissions` row, which is the single switch that
-- turns into live collaboration: `pages_update_own_or_editor` then allows the
-- editor to write, and the Realtime presence/broadcast channels key off the
-- page id.

create or replace function public.respond_page_access_request(
  p_request uuid,
  p_approve boolean,
  p_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.page_access_requests%rowtype;
  role text;
  can_edit boolean;
  can_comment boolean;
  username text;
begin
  if p_request is null then
    raise exception 'REQUEST_REQUIRED' using errcode = '22023';
  end if;

  select * into r from public.page_access_requests where id = p_request for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;
  if r.status <> 'pending' then
    raise exception 'REQUEST_ALREADY_DECIDED' using errcode = '42501';
  end if;
  if not notification_private.owns_page(r.page_id) then
    raise exception 'ONLY_PAGE_OWNER_CAN_DECIDE' using errcode = '42501';
  end if;

  if p_approve then
    role := coalesce(p_role, r.role_requested);
    if role not in ('editor', 'commenter', 'viewer') then
      raise exception 'INVALID_ROLE' using errcode = '22023';
    end if;
    can_edit := role in ('editor', 'admin', 'owner');
    can_comment := role in ('editor', 'admin', 'owner', 'commenter');

    select coalesce(nullif(rtrim(up.username), ''), nullif(rtrim(up.user_name), ''), 'Collaborator')
      into username
      from public.user_profiles up
     where up.user_id = r.requester_user_id
     limit 1;

    insert into public.page_permissions (
      page_id, user_id, user_name, role,
      can_view, can_edit, can_comment, can_share,
      can_delete, can_audit, can_manage_collaborators, can_export, can_use_ai
    ) values (
      r.page_id, r.requester_user_id, username, role,
      true, can_edit, can_comment, false,
      false, false, false, true, can_edit
    )
    on conflict (page_id, user_id) do update
      set role = excluded.role,
          can_view = true,
          can_edit = excluded.can_edit,
          can_comment = excluded.can_comment,
          can_use_ai = excluded.can_use_ai,
          updated_at = now();

    update public.page_access_requests
       set status = 'approved', role_requested = role,
           responded_at = now(), responded_by = auth.jwt() ->> 'sub'
     where id = r.id;

    return jsonb_build_object('status', 'approved', 'role', role, 'page_id', r.page_id);
  end if;

  update public.page_access_requests
     set status = 'declined', responded_at = now(), responded_by = auth.jwt() ->> 'sub'
   where id = r.id;

  return jsonb_build_object('status', 'declined', 'page_id', r.page_id);
end $$;

-- ─── Fork ────────────────────────────────────────────────────────────────────
-- Runs with elevated rights because a fork recipient cannot SELECT the source
-- in `fork` mode. The copy is owned by the caller from the moment it is
-- written: no permissions row, no collaboration session, private visibility.
-- Later edits on either side never reach the other.

create or replace function public.fork_page(
  p_page uuid,
  p_workspace_id text default '',
  p_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  src public.pages%rowtype;
  me_sub text := auth.jwt() ->> 'sub';
  me uuid := notification_private.current_user_id();
  destination text;
  root_id uuid;
  id_map jsonb := '{}'::jsonb;
  node record;
  copied int := 0;
  max_nodes constant int := 300;
begin
  if p_page is null then
    raise exception 'PAGE_REQUIRED' using errcode = '22023';
  end if;
  if me_sub is null or me is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  -- Destination resolution. The client's scope id is not trustworthy as a
  -- workspace reference: this deployment stores `workspace_id = ''` on every
  -- page, and the client falls back to a synthetic default id that has no
  -- `workspaces` row. So membership is enforced only when the id actually
  -- names a real workspace; anything else resolves to the caller's own scope.
  destination := nullif(coalesce(p_workspace_id, ''), '');

  if destination is not null and exists (
    select 1 from public.workspaces w where w.id::text = destination
  ) and not exists (
    select 1 from public.workspaces w
     where w.id::text = destination
       and w.archived_at is null
       and (
         notification_private.resolve_user(w.owner_id) = me
         or exists (
           select 1 from public.workspace_members m
            where m.workspace_id = w.id and m.user_id = me_sub
         )
       )
  ) then
    raise exception 'WORKSPACE_NOT_AVAILABLE' using errcode = '42501';
  end if;

  if destination is null or not exists (
    select 1 from public.workspaces w where w.id::text = destination
  ) then
    select coalesce(max(p.workspace_id), '') into destination
      from public.pages p
     where p.user_id = me_sub and not coalesce(p.trashed, false);
  end if;

  select * into src from public.pages where id = p_page and not coalesce(trashed, false);
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if notification_private.owns_page(src.id) then
    raise exception 'ALREADY_THE_OWNER' using errcode = '42501';
  end if;

  -- Reading the source is allowed either because the visitor already has
  -- access, or because the owner explicitly enabled forking via the link.
  -- Forking is only offered for pages published to the web: a fork hands over a
  -- full copy of the content, so the owner has to have put it out there on
  -- purpose rather than merely opened a link mode.
  if src.link_access = 'fork' and src.visibility <> 'public' then
    raise exception 'PAGE_NOT_PUBLISHED' using errcode = '42501';
  end if;

  if not (
    notification_private.can_access_page(me, src.id)
    or exists (
      select 1 from public.page_permissions perm
       where perm.page_id = src.id and perm.user_id = me_sub and perm.can_view
    )
    or src.link_access = 'fork'
  ) then
    raise exception 'PAGE_NOT_AVAILABLE' using errcode = '42501';
  end if;

  -- Breadth-first over parent_id so a parent is always remapped before its
  -- children. Capped so a huge tree cannot be used to mass-copy a workspace.
  for node in
    with recursive tree as (
      select p.* from public.pages p where p.id = src.id
      union all
      select c.* from public.pages c
        join tree t on c.parent_id = t.id
       where not coalesce(c.trashed, false)
    )
    select * from tree order by coalesce(parent_id, id) limit max_nodes
  loop
    id_map := jsonb_set(id_map, array[node.id::text], to_jsonb(gen_random_uuid()));
    copied := copied + 1;
  end loop;

  if copied = 0 then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'P0002';
  end if;

  root_id := (id_map ->> src.id::text)::uuid;

  insert into public.pages (
    id, title, icon, cover, parent_id, favorite, trashed, tags,
    hidden_from_recents, offline, is_locked, blocks, lineage,
    user_id, workspace_id, organization_id, team_id,
    document_type, is_public, visibility, link_access
  )
  select
    (id_map ->> p.id::text)::uuid,
    case when p.id = src.id
      then coalesce(nullif(left(p_title, 200), ''), p.title || ' (copy)')
      else p.title end,
    p.icon, p.cover,
    case when p.parent_id is null then null
      else (id_map ->> p.parent_id::text)::uuid end,
    false, false, p.tags,
    false, false, false,
    p.blocks,
    case when p.id = src.id
      then coalesce(p.lineage, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'action', 'forked',
        'timestamp', now(),
        'detail', 'Forked from a shared page'
      ))
      else coalesce(p.lineage, '[]'::jsonb) end,
    me_sub, destination, null, null,
    'page', false, 'private', 'restricted'
  from public.pages p
  where p.id in (select (k.key)::uuid from jsonb_object_keys(id_map) as k(key))
    and not coalesce(p.trashed, false)
  on conflict (id) do nothing;

  return jsonb_build_object(
    'page_id', root_id,
    'pages_copied', copied,
    'truncated', copied >= max_nodes,
    'title', coalesce(nullif(left(p_title, 200), ''), src.title || ' (copy)')
  );
end $$;
