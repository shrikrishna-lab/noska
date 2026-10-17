-- ============================================================================
-- Page link sharing: access requests + forkable links
--
-- Two distinct ways for somebody else to open a shared page link:
--
--   1. Request access  — the visitor asks, the owner approves, and the
--      approval writes a `page_permissions` row. That row is what puts both
--      people in the same document: `pages_update_own_or_editor` allows the
--      editor to write, and the Realtime presence/broadcast channels key off
--      the page id, so the two of them collaborate on one page.
--
--   2. Fork            — the visitor gets an independent server-side copy in
--      their own workspace. No `page_permissions` row, no collaboration
--      session, no shared lineage beyond a "forked from" breadcrumb, so later
--      edits never reach the original.
--
-- Link access is stored per page in `pages.link_access`:
--   restricted — default; a visitor must request access
--   view       — anybody with the link may read (select only, no collab)
--   fork       — anybody with the link may take a copy
-- ============================================================================

-- ─── 1. Link access mode ────────────────────────────────────────────────────

alter table public.pages
  add column if not exists link_access text not null default 'restricted';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pages_link_access_check'
  ) then
    alter table public.pages
      add constraint pages_link_access_check
      check (link_access in ('restricted', 'view', 'fork'));
  end if;
end $$;

create index if not exists idx_pages_link_access
  on public.pages (link_access)
  where link_access <> 'restricted';

-- Only the owner may flip link sharing. Editors can already UPDATE the page
-- through `pages_update_own_or_editor`, so without this guard a collaborator
-- could widen access behind the owner's back.
create or replace function notification_private.guard_page_link_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.link_access is distinct from old.link_access
     and not notification_private.owns_page(old.id) then
    raise exception 'ONLY_PAGE_OWNER_CAN_CHANGE_LINK_ACCESS' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists pages_guard_link_access on public.pages;
create trigger pages_guard_link_access
  before update on public.pages
  for each row execute function notification_private.guard_page_link_access();

-- Link-shared pages are readable by anyone holding the link. Read only:
-- there is no UPDATE path, so a link viewer can never write.
drop policy if exists pages_select_link_shared on public.pages;
create policy pages_select_link_shared
  on public.pages for select to authenticated
  using (link_access = 'view');

-- ─── 2. Access requests ─────────────────────────────────────────────────────

create table if not exists public.page_access_requests (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  requester_user_id text not null,
  requester_username text,
  owner_user_id text not null,
  message text,
  role_requested text not null default 'editor',
  status text not null default 'pending',
  responded_at timestamptz,
  responded_by text,
  created_at timestamptz not null default now(),
  constraint page_access_request_role_check
    check (role_requested in ('editor', 'commenter', 'viewer')),
  constraint page_access_request_status_check
    check (status in ('pending', 'approved', 'declined', 'cancelled'))
);

-- One live request per person per page; older decisions stay for history.
create unique index if not exists idx_page_access_request_pending
  on public.page_access_requests (page_id, requester_user_id)
  where status = 'pending';

create index if not exists idx_page_access_request_owner
  on public.page_access_requests (owner_user_id, status, created_at desc);

create index if not exists idx_page_access_request_requester
  on public.page_access_requests (requester_user_id, created_at desc);

alter table public.page_access_requests enable row level security;

revoke all on public.page_access_requests from anon;

drop policy if exists page_access_request_read on public.page_access_requests;
create policy page_access_request_read
  on public.page_access_requests for select to authenticated
  using (
    notification_private.is_me(requester_user_id)
    or notification_private.owns_page(page_id)
  );

drop policy if exists page_access_request_insert on public.page_access_requests;
create policy page_access_request_insert
  on public.page_access_requests for insert to authenticated
  with check (notification_private.is_me(requester_user_id));

-- Requester may cancel their own request; the owner may decide it.
drop policy if exists page_access_request_update on public.page_access_requests;
create policy page_access_request_update
  on public.page_access_requests for update to authenticated
  using (
    notification_private.is_me(requester_user_id)
    or notification_private.owns_page(page_id)
  )
  with check (
    notification_private.is_me(requester_user_id)
    or notification_private.owns_page(page_id)
  );

drop policy if exists page_access_request_delete on public.page_access_requests;
create policy page_access_request_delete
  on public.page_access_requests for delete to authenticated
  using (notification_private.owns_page(page_id));

-- ─── 3. Owner notifications ─────────────────────────────────────────────────
-- Routed straight through `emit` rather than the `create_event` dispatcher so
-- the existing notification contract stays untouched. `emit` refuses when the
-- recipient cannot access the page, which is exactly right here: the owner
-- always can, and the requester only can once approved.

create or replace function notification_private.page_access_request_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester uuid;
  owner_id uuid;
  page_title text;
  result uuid;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then return new; end if;
    requester := notification_private.resolve_user(new.requester_user_id);
    owner_id := notification_private.resolve_user(new.owner_user_id);
    if requester is null or owner_id is null or requester = owner_id then return new; end if;

    select coalesce(nullif(p.title, ''), 'Untitled') into page_title
      from public.pages p where p.id = new.page_id;

    result := notification_private.emit(
      owner_id,
      'access',
      coalesce(new.requester_username, 'Someone') || ' requested access',
      coalesce(new.message, 'Open the page sharing menu to approve or decline.'),
      'access-request:' || new.id::text,
      new.page_id,
      requester,
      new.id::text,
      null,
      'high',
      jsonb_build_object(
        'access_request_id', new.id,
        'page_id', new.page_id,
        'page_title', page_title,
        'requester_user_id', new.requester_user_id,
        'requester_username', new.requester_username,
        'role_requested', new.role_requested
      )
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status
        and new.status in ('approved', 'declined') then
    requester := notification_private.resolve_user(new.requester_user_id);
    if requester is null then return new; end if;

    result := notification_private.emit(
      requester,
      'access',
      case when new.status = 'approved'
        then 'Access granted'
        else 'Access request declined' end,
      case when new.status = 'approved'
        then 'You can now open and edit this page together with the owner.'
        else 'The owner declined your request to this page.'
      end,
      'access-decision:' || new.id::text || ':' || new.status,
      -- Only attach the page once access exists; a declined requester must not
      -- get page-scoped notification delivery.
      case when new.status = 'approved' then new.page_id else null end,
      notification_private.resolve_user(new.responded_by),
      new.id::text,
      null,
      'high',
      jsonb_build_object('access_request_id', new.id, 'page_id', new.page_id, 'status', new.status)
    );
  end if;
  return new;
end $$;

drop trigger if exists notification_access_request_created on public.page_access_requests;
create trigger notification_access_request_created
  after insert or update on public.page_access_requests
  for each row execute function notification_private.page_access_request_event();

-- Realtime so the owner's sharing menu updates without a refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'page_access_requests'
  ) then
    alter publication supabase_realtime add table public.page_access_requests;
  end if;
end $$;

-- ─── 4. RPC: what does this visitor see? ────────────────────────────────────
-- Powers the gate screen a visitor lands on. Deliberately returns only
-- presentation metadata — never blocks. A private page's title stays hidden
-- until the owner allows link access, so a UUID alone leaks nothing.

create or replace function public.page_access_info(p_page uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.pages%rowtype;
  me uuid := notification_private.resolve_user(auth.jwt() ->> 'sub');
  canonical text := notification_private.my_canonical_id();
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

  is_owner := p.user_id = coalesce(canonical, me::text);

  select perm.role into existing_role
    from public.page_permissions perm
   where perm.page_id = p.id and perm.user_id = coalesce(canonical, me::text);

  can_read := is_owner
    or existing_role is not null
    or notification_private.can_access_page(me, p.id)
    or p.link_access = 'view'
    or p.visibility = 'public';

  select r.id, r.role_requested into pending_id, pending_role
    from public.page_access_requests r
   where r.page_id = p.id
     and r.requester_user_id = coalesce(canonical, me::text)
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
    -- A visitor can only ask when the page is not theirs, not trashed, and
    -- link sharing is not already wide open.
    'can_request', (not is_owner) and p.link_access = 'restricted' and not can_read,
    'can_fork', (not is_owner) and p.link_access = 'fork' and not can_read,
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

revoke all on function public.page_access_info(uuid) from anon;
grant execute on function public.page_access_info(uuid) to authenticated;

-- ─── 5. RPC: request access ─────────────────────────────────────────────────

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
  me uuid := notification_private.resolve_user(auth.jwt() ->> 'sub');
  canonical text := notification_private.my_canonical_id();
  username text;
  request_id uuid;
begin
  if p_page is null then
    raise exception 'PAGE_REQUIRED' using errcode = '22023';
  end if;
  if me is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_role not in ('editor', 'commenter', 'viewer') then
    raise exception 'INVALID_ROLE' using errcode = '22023';
  end if;

  select * into p from public.pages where id = p_page and not coalesce(trashed, false);
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p.user_id = coalesce(canonical, me::text) then
    raise exception 'ALREADY_THE_OWNER' using errcode = '42501';
  end if;
  if notification_private.can_access_page(me, p.id) or exists (
    select 1 from public.page_permissions perm
     where perm.page_id = p.id and perm.user_id = coalesce(canonical, me::text)
  ) then
    raise exception 'ALREADY_HAS_ACCESS' using errcode = '42501';
  end if;
  if p.link_access <> 'restricted' then
    raise exception 'LINK_ACCESS_ALREADY_GRANTED' using errcode = '42501';
  end if;

  select coalesce(nullif(rtrim(username), ''), nullif(rtrim(user_name), ''), 'Someone') into username
    from public.user_profiles
   where user_id = coalesce(canonical, me::text)
   limit 1;

  insert into public.page_access_requests (
    page_id, requester_user_id, requester_username, owner_user_id, message, role_requested
  ) values (
    p.id, coalesce(canonical, me::text), username, p.user_id,
    nullif(left(coalesce(p_message, ''), 1000), ''), p_role
  )
  on conflict (page_id, requester_user_id) where status = 'pending'
  do update set message = excluded.message, role_requested = excluded.role_requested
  returning id into request_id;

  return jsonb_build_object('request_id', request_id, 'status', 'pending');
end $$;

revoke all on function public.request_page_access(uuid, text, text) from anon;
grant execute on function public.request_page_access(uuid, text, text) to authenticated;

-- ─── 6. RPC: owner decides ──────────────────────────────────────────────────
-- Approval writes the `page_permissions` row, which is the single switch that
-- turns into live collaboration (editor UPDATE rights + presence/broadcast).

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

    select coalesce(nullif(rtrim(username), ''), nullif(rtrim(user_name), ''), 'Collaborator') into username
      from public.user_profiles
     where user_id = r.requester_user_id
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
           responded_at = now(), responded_by = notification_private.my_canonical_id()
     where id = r.id;

    return jsonb_build_object('status', 'approved', 'role', role, 'page_id', r.page_id);
  end if;

  update public.page_access_requests
     set status = 'declined', responded_at = now(), responded_by = notification_private.my_canonical_id()
   where id = r.id;

  return jsonb_build_object('status', 'declined', 'page_id', r.page_id);
end $$;

revoke all on function public.respond_page_access_request(uuid, boolean, text) from anon;
grant execute on function public.respond_page_access_request(uuid, boolean, text) to authenticated;

-- ─── 7. RPC: fork a page ────────────────────────────────────────────────────
-- Runs with elevated rights because a fork recipient cannot SELECT the source
-- in `fork` mode. The copy is owned by the caller from the moment it is
-- written: no permissions row, no collaboration session, private visibility.
-- Later edits on either side never touch the other.

create or replace function public.fork_page(
  p_page uuid,
  p_workspace_id text,
  p_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  src public.pages%rowtype;
  me uuid := notification_private.resolve_user(auth.jwt() ->> 'sub');
  canonical text := notification_private.my_canonical_id();
  owner_id text := coalesce(canonical, me::text);
  root_id uuid;
  new_root uuid;
  id_map jsonb := '{}'::jsonb;
  node record;
  copied int := 0;
  max_nodes constant int := 300;
begin
  if p_page is null then
    raise exception 'PAGE_REQUIRED' using errcode = '22023';
  end if;
  if me is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if nullif(coalesce(p_workspace_id, ''), '') is null then
    raise exception 'WORKSPACE_REQUIRED' using errcode = '22023';
  end if;

  -- The destination must be a live workspace the caller actually belongs to.
  if not exists (
    select 1 from public.workspaces w
     where w.id::text = p_workspace_id
       and w.archived_at is null
       and (
         notification_private.resolve_user(w.owner_id) = me
         or exists (
           select 1 from public.workspace_members m
            where m.workspace_id = w.id and m.user_id = owner_id
         )
       )
  ) then
    raise exception 'WORKSPACE_NOT_AVAILABLE' using errcode = '42501';
  end if;

  select * into src from public.pages where id = p_page and not coalesce(trashed, false);
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if src.user_id = owner_id then
    raise exception 'ALREADY_THE_OWNER' using errcode = '42501';
  end if;

  -- Reading the source is allowed either because the visitor already has
  -- access, or because the owner explicitly enabled forking via the link.
  if not (
    notification_private.can_access_page(me, src.id)
    or exists (
      select 1 from public.page_permissions perm
       where perm.page_id = src.id and perm.user_id = owner_id and perm.can_view
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
    owner_id, p_workspace_id, null, null,
    'page', false, 'private', 'restricted'
  from public.pages p
  where p.id in (select key::uuid from jsonb_object_keys(id_map))
    and not coalesce(p.trashed, false)
  on conflict (id) do nothing;

  new_root := root_id;

  return jsonb_build_object(
    'page_id', new_root,
    'pages_copied', copied,
    'truncated', copied >= max_nodes,
    'title', coalesce(nullif(left(p_title, 200), ''), src.title || ' (copy)')
  );
end $$;

revoke all on function public.fork_page(uuid, text, text) from anon;
grant execute on function public.fork_page(uuid, text, text) to authenticated;
