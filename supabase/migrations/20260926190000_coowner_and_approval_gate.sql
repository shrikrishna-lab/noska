-- Co-owner role + reviewer approval gate
-- ========================================
-- Two additions, deliberately modelled along different axes:
--
--   co-owner  A new ROLE value in `page_permissions.role`. Answers "what may
--             this person do to the page?". Everything an editor can do, plus
--             tree moves, trash/restore, lock, visibility/link-access changes
--             and collaborator management. Explicitly NOT: re-owning the page,
--             deleting it, encryption, or approving (approval is not a tier —
--             see below).
--
--   reviewer  NOT a role. It is membership of a new `page_reviewers` table.
--             Answers "whose sign-off is required?". A reviewer keeps whatever
--             role they already have (commenter is the usual fit, since
--             approving requires read + comment) and simply gains the duty of
--             responding to an approval request. This is why approving is not
--             folded into co-owner: doing so would let a page manager sign off
--             their own changes, which defeats the gate.
--
-- Approval gates exactly four things: publishing (visibility / is_public),
-- link access, lock and encryption. It never gates trash or delete — those are
-- owner-only outright and need no second pair of eyes.
--
-- Any content edit while `approved` resets the state to `pending_approval`, so
-- a page cannot be signed off and then quietly changed afterwards.

-- ─── Role lookup helper ─────────────────────────────────────────────────────
-- 'owner' for the page owner, otherwise the caller's granted role, else null.
-- Defined first because both column guards below branch on it.
create or replace function notification_private.my_page_role(p_page uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when notification_private.owns_page(p_page) then 'owner'
    else (
      select g.role
      from public.page_permissions g
      where g.page_id = p_page
        and notification_private.resolve_user(g.user_id) = notification_private.current_user_id()
      limit 1
    )
  end;
$$;

-- ─── Widen the role allow-list ──────────────────────────────────────────────
-- The existing constraint predates co-owner and rejects it outright.
alter table public.page_permissions
  drop constraint if exists page_permissions_role_check;
alter table public.page_permissions
  add constraint page_permissions_role_check
  check (role in ('owner','admin','co-owner','editor','commenter','viewer','custom'));

-- ─── Link-access guard, co-owner aware ──────────────────────────────────────
-- `guard_page_link_access` predates co-owner and refused the column for every
-- non-owner. Since link_access is one of the four co-owner capabilities, widen
-- it to the same set the column guard allows.
create or replace function notification_private.guard_page_link_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.link_access is distinct from old.link_access
     and auth.jwt() ->> 'sub' is not null
     and not notification_private.owns_page(old.id)
     and notification_private.my_page_role(old.id) is distinct from 'co-owner' then
    raise exception 'ONLY_PAGE_OWNER_CAN_CHANGE_LINK_ACCESS' using errcode = '42501';
  end if;
  return new;
end $$;

-- ─── Column guard, now role-aware ───────────────────────────────────────────
-- Previously one flat deny-list for every non-owner. Co-owner legitimately
-- needs visibility / link_access / trashed / is_locked / parent_id /
-- workspace_id, so the list branches on role.
--
-- `parent_id` is newly denied to plain editors: moving somebody else's page was
-- reachable by writing the column directly even though the UI exposes no move
-- control for a non-owner. Closing that here rather than trusting the UI.
create or replace function notification_private.guard_page_owner_only_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched text;
  deny_owner  constant text[] := array[
    'user_id','is_encrypted','encrypted_blocks','iv','salt','organization_id','team_id'
  ];
  deny_editor constant text[] := array[
    'user_id','visibility','is_public','link_access','trashed','is_locked',
    'parent_id','workspace_id','organization_id','team_id',
    'is_encrypted','encrypted_blocks','iv','salt'
  ];
begin
  -- Service-role / admin writes carry no end-user JWT and are trusted, matching
  -- how RLS itself exempts them.
  if auth.jwt() ->> 'sub' is null then
    return new;
  end if;
  if notification_private.owns_page(old.id) then
    return new;
  end if;

  if notification_private.my_page_role(old.id) = 'co-owner' then
    select c into touched
      from unnest(deny_owner) as c
     where to_jsonb(new) ->> c is distinct from to_jsonb(old) ->> c
     limit 1;
  else
    select c into touched
      from unnest(deny_editor) as c
     where to_jsonb(new) ->> c is distinct from to_jsonb(old) ->> c
     limit 1;
  end if;

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

-- ─── Approval gate + invalidation ───────────────────────────────────────────
create or replace function notification_private.guard_page_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  publish_touched constant text[] := array['visibility','is_public','link_access','is_locked'];
  content_touched constant text[] := array['title','blocks'];
  hit text;
begin
  if auth.jwt() ->> 'sub' is null then
    return new;
  end if;

  -- 1. While a request is open, the gated actions are refused for EVERYONE,
  --    the owner included. That is the entire point of the gate: the owner
  --    waits for the reviewers rather than publishing over them.
  if coalesce(old.approval_state, 'draft') = 'pending_approval' then
    select c into hit
      from unnest(publish_touched) as c
     where to_jsonb(new) ->> c is distinct from to_jsonb(old) ->> c
     limit 1;

    if hit is not null then
      raise exception 'PAGE_APPROVAL_PENDING'
        using errcode = '42501',
              detail = 'Resolve the pending approval request before changing '
                       || hit || '.';
    end if;
  end if;

  -- 2. An approved page that gets edited loses its approval. Applies to the
  --    owner and to co-owners editing content, not just to non-owners.
  if coalesce(old.approval_state, 'draft') = 'approved' then
    select c into hit
      from unnest(content_touched) as c
     where to_jsonb(new) ->> c is distinct from to_jsonb(old) ->> c
     limit 1;

    if hit is not null then
      if exists (select 1 from public.page_reviewers r where r.page_id = old.id) then
        new.approval_state := 'pending_approval';
        new.approval_requested_at := now();
        new.approval_requested_by := auth.jwt() ->> 'sub';
        -- Re-open the reviewers as well. Resetting only the page would leave
        -- every reviewer still marked 'approved', so nobody could respond and
        -- the owner would be stuck in pending_approval with no way forward.
        update public.page_reviewers r
        set status = 'pending', responded_at = null, note = null
        where r.page_id = old.id and r.status is distinct from 'pending';
      else
        new.approval_state := 'draft';
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists pages_guard_approval on public.pages;
create trigger pages_guard_approval
  before update on public.pages
  for each row execute function notification_private.guard_page_approval();

-- ─── Approval columns ───────────────────────────────────────────────────────
alter table public.pages
  add column if not exists approval_state text not null default 'draft',
  add column if not exists approval_requested_at timestamptz,
  add column if not exists approval_requested_by text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pages_approval_state_check'
  ) then
    alter table public.pages
      add constraint pages_approval_state_check
      check (approval_state in ('draft','pending_approval','approved','rejected'));
  end if;
end $$;

-- ─── Reviewers ──────────────────────────────────────────────────────────────
create table if not exists public.page_reviewers (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  user_id text not null,
  user_name text,
  status text not null default 'pending',
  note text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (page_id, user_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'page_reviewers_status_check'
  ) then
    alter table public.page_reviewers
      add constraint page_reviewers_status_check
      check (status in ('pending','approved','rejected'));
  end if;
end $$;

create index if not exists page_reviewers_page_id_idx
  on public.page_reviewers (page_id);

alter table public.page_reviewers enable row level security;

-- A reviewer list is collaboration metadata: the owner manages it, and anyone
-- who can already read the page can see who is reviewing it (needed to render
-- "Approved by …"). Anyone else learns nothing.
drop policy if exists page_reviewer_read on public.page_reviewers;
create policy page_reviewer_read
  on public.page_reviewers for select to authenticated
  using (
    notification_private.owns_page(page_id)
    or notification_private.is_me(user_id)
    or notification_private.my_page_access(page_id)
  );

drop policy if exists page_reviewer_write on public.page_reviewers;
create policy page_reviewer_write
  on public.page_reviewers for all to authenticated
  using (notification_private.owns_page(page_id))
  with check (notification_private.owns_page(page_id));

-- ─── Co-owner may manage collaborators ───────────────────────────────────────
-- Previously owner-only. A co-owner gets this, with one deliberate exclusion:
-- they cannot mint a `can_delete` grant or an `owner` role, because those are
-- the two capabilities reserved for the owner. Without this a co-owner could
-- promote a friend to delete-capable and route around the whole tier.
--
-- Expressed through a `security definer` helper rather than by calling
-- `resolve_user` inside the policy: that function is deliberately not granted
-- to `authenticated`, and an RLS policy that references it fails outright with
-- "permission denied for function" instead of quietly evaluating false.
create or replace function notification_private.can_manage_page_collaborators(p_page uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select notification_private.owns_page(p_page) or exists (
    select 1
    from public.page_permissions mine
    where mine.page_id = p_page
      and notification_private.resolve_user(mine.user_id) = notification_private.current_user_id()
      and coalesce(mine.can_manage_collaborators, false)
  );
$$;

grant execute on function notification_private.can_manage_page_collaborators(uuid) to authenticated;

-- Same reasoning for reading the caller out of a permission row without
-- re-granting `resolve_user`.
create or replace function notification_private.granted_role_on_page(p_page uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select g.role
  from public.page_permissions g
  where g.page_id = p_page
    and notification_private.resolve_user(g.user_id) = notification_private.current_user_id()
  limit 1;
$$;

grant execute on function notification_private.granted_role_on_page(uuid) to authenticated;

-- Collaborator visibility: you can always see your own grant; the owner and any
-- co-owner see the whole roster, because they have to be able to manage it.
--
-- The co-owner clause is load-bearing beyond display: PostgREST turns
-- `.insert(...).select(...)` into `INSERT ... RETURNING`, and RETURNING is
-- evaluated against the SELECT policy. Without this a co-owner's add would
-- succeed at the database and then be reported as an RLS violation, because
-- they cannot read back the row they just created.
drop policy if exists page_permission_read on public.page_permissions;
create policy page_permission_read
  on public.page_permissions for select to authenticated
  using (
    notification_private.is_me(user_id)
    or notification_private.can_manage_page_collaborators(page_id)
  );

drop policy if exists page_permission_insert on public.page_permissions;
create policy page_permission_insert
  on public.page_permissions for insert to authenticated
  with check (
    -- The owner is the only way to mint an owner/admin grant. Without this a
    -- co-owner could insert a row with role='owner' and mint themselves a full
    -- owner on somebody else's page.
    coalesce(role, '') not in ('owner', 'admin')
    and coalesce(can_delete, false) = false
    and notification_private.can_manage_page_collaborators(page_id)
  );

drop policy if exists page_permission_update on public.page_permissions;
create policy page_permission_update
  on public.page_permissions for update to authenticated
  using (notification_private.can_manage_page_collaborators(page_id))
  with check (
    coalesce(role, '') not in ('owner', 'admin')
    and coalesce(can_delete, false) = false
    and notification_private.can_manage_page_collaborators(page_id)
  );

drop policy if exists page_permission_delete on public.page_permissions;
create policy page_permission_delete
  on public.page_permissions for delete to authenticated
  using (notification_private.can_manage_page_collaborators(page_id));

-- ─── Accept the new role where roles are validated ──────────────────────────
-- request_page_access / respond_page_access_request both hard-check the role
-- against a literal list; without these a co-owner can be granted by nobody.

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
  me_sub text;
  username text;
begin
  me_sub := notification_private.current_user_id();
  if me_sub is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_role not in ('editor', 'co-owner', 'commenter', 'viewer') then
    raise exception 'INVALID_ROLE' using errcode = '22023';
  end if;

  select * into p from public.pages where id = p_page and not coalesce(trashed, false);
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if notification_private.owns_page(p_page) then
    raise exception 'ALREADY_OWNER' using errcode = '22023';
  end if;
  if notification_private.my_page_access(p_page) then
    raise exception 'ALREADY_HAS_ACCESS' using errcode = '22023';
  end if;

  select coalesce(nullif(rtrim(up.username), ''), nullif(rtrim(up.user_name), ''), 'Someone')
    into username
  from public.user_profiles up
  where notification_private.resolve_user(up.user_id) = me_sub
  limit 1;
  username := coalesce(username, 'Someone');

  insert into public.page_access_requests (
    page_id, requester_user_id, requester_username, owner_user_id, message, role_requested
  ) values (
    p.id, me_sub, username, coalesce(p.user_id, ''),
    nullif(left(coalesce(p_message, ''), 1000), ''), p_role
  )
  on conflict (page_id, requester_user_id) do update
    set message = excluded.message, role_requested = excluded.role_requested;

  return jsonb_build_object('status', 'requested');
end $$;

-- ─── Approval RPCs ──────────────────────────────────────────────────────────

create or replace function public.request_page_approval(p_page uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewers int;
begin
  if not notification_private.owns_page(p_page) then
    raise exception 'ONLY_PAGE_OWNER_CAN_REQUEST_APPROVAL' using errcode = '42501';
  end if;

  select count(*) into reviewers
  from public.page_reviewers r
  where r.page_id = p_page
    -- A reviewer who has since lost all access to the page cannot sign off,
    -- so they must not count towards the quorum.
    and notification_private.can_access_page(
      notification_private.resolve_user(r.user_id), p_page
    );

  if reviewers = 0 then
    raise exception 'NO_REVIEWERS_WITH_ACCESS' using errcode = '22023',
      detail = 'Add at least one reviewer who can read this page first.';
  end if;

  update public.page_reviewers r
  set status = 'pending', responded_at = null, note = null
  where r.page_id = p_page;

  update public.pages
  set approval_state = 'pending_approval',
      approval_requested_at = now(),
      approval_requested_by = notification_private.current_user_id()
  where id = p_page;

  return jsonb_build_object('approval_state', 'pending_approval', 'reviewers', reviewers);
end $$;

create or replace function public.cancel_page_approval(p_page uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not notification_private.owns_page(p_page) then
    raise exception 'ONLY_PAGE_OWNER_CANCEL_APPROVAL' using errcode = '42501';
  end if;

  update public.pages
  set approval_state = 'draft', approval_requested_at = null, approval_requested_by = null
  where id = p_page;

  update public.page_reviewers set status = 'pending', responded_at = null, note = null
  where page_id = p_page;

  return jsonb_build_object('approval_state', 'draft');
end $$;

create or replace function public.set_page_reviewers(
  p_page uuid,
  p_user_ids text[],
  p_user_names text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  i int;
  uid text;
  uname text;
  kept_with_access int;
begin
  if not notification_private.owns_page(p_page) then
    raise exception 'ONLY_PAGE_OWNER_CAN_MANAGE_REVIEWERS' using errcode = '42501';
  end if;

  delete from public.page_reviewers where page_id = p_page;

  if p_user_ids is not null then
    for i in 1 .. coalesce(array_length(p_user_ids, 1), 0) loop
      uid := nullif(btrim(p_user_ids[i]), '');
      if uid is null then
        continue;
      end if;
      uname := nullif(btrim(coalesce(p_user_names[i], '')), '');

      -- Reviewing implies being able to read. Someone with no access at all
      -- cannot be handed the duty, otherwise the owner could create a reviewer
      -- who is permanently unable to approve.
      if not notification_private.can_access_page(
           notification_private.resolve_user(uid), p_page
         ) then
        continue;
      end if;

      insert into public.page_reviewers (page_id, user_id, user_name)
      values (p_page, uid, uname)
      on conflict (page_id, user_id) do nothing;
    end loop;
  end if;

  -- Replacing the list must not strand the page in a pending state whose
  -- quorum can no longer be met.
  select count(*) into kept_with_access
  from public.page_reviewers r
  where r.page_id = p_page
    and notification_private.can_access_page(
      notification_private.resolve_user(r.user_id), p_page
    );

  if coalesce(kept_with_access, 0) = 0 then
    update public.pages
    set approval_state = 'draft',
        approval_requested_at = null,
        approval_requested_by = null
    where id = p_page and approval_state <> 'draft';
  else
    update public.page_reviewers set status = 'pending', responded_at = null, note = null
    where page_id = p_page;
    update public.pages
    set approval_state = 'draft', approval_requested_at = null, approval_requested_by = null
    where id = p_page and approval_state in ('pending_approval', 'rejected');
  end if;

  return jsonb_build_object(
    'reviewers', kept_with_access,
    'approval_state', (select approval_state from public.pages where id = p_page)
  );
end $$;

create or replace function public.approve_page(
  p_page uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me_sub uuid;
  total int := 0;
  approved int := 0;
  rejected int := 0;
  next_state text;
begin
  me_sub := notification_private.current_user_id();
  if me_sub is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.page_reviewers r
    where r.page_id = p_page
      and notification_private.resolve_user(r.user_id) = me_sub
  ) then
    raise exception 'NOT_A_REVIEWER' using errcode = '42501';
  end if;

  if (select approval_state from public.pages where id = p_page) <> 'pending_approval' then
    raise exception 'NO_PENDING_APPROVAL' using errcode = '22023';
  end if;

  update public.page_reviewers r
  set status = p_decision,
      responded_at = now(),
      note = nullif(left(coalesce(p_note, ''), 1000), '')
  where r.page_id = p_page
    and notification_private.resolve_user(r.user_id) = me_sub;

  -- Only reviewers who can still read the page count. Losing access mid-review
  -- must not leave the owner waiting on somebody who can never respond.
  select count(*) into total
  from public.page_reviewers r
  where r.page_id = p_page
    and notification_private.can_access_page(
      notification_private.resolve_user(r.user_id), p_page
    );

  select count(*) into approved
  from public.page_reviewers r
  where r.page_id = p_page
    and r.status = 'approved'
    and notification_private.can_access_page(
      notification_private.resolve_user(r.user_id), p_page
    );

  select count(*) into rejected
  from public.page_reviewers r
  where r.page_id = p_page
    and r.status = 'rejected'
    and notification_private.can_access_page(
      notification_private.resolve_user(r.user_id), p_page
    );

  if rejected > 0 then
    next_state := 'rejected';
  elsif total > 0 and approved = total then
    next_state := 'approved';
  else
    next_state := 'pending_approval';
  end if;

  update public.pages set approval_state = next_state where id = p_page;

  return jsonb_build_object(
    'approval_state', next_state,
    'total', total,
    'approved', approved,
    'rejected', rejected
  );
end $$;

create or replace function public.page_approval_info(p_page uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'approval_state', p.approval_state,
    'requested_at', p.approval_requested_at,
    'requested_by', p.approval_requested_by,
    'my_review', (
      select jsonb_build_object(
        'status', r.status,
        'responded_at', r.responded_at,
        'note', r.note
      )
      from public.page_reviewers r
      where r.page_id = p.id
        and notification_private.resolve_user(r.user_id) = notification_private.current_user_id()
      limit 1
    ),
    'reviewers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', r.user_id,
        'user_name', r.user_name,
        'status', r.status,
        'responded_at', r.responded_at,
        'note', r.note,
        'can_respond', r.status = 'pending'
          and notification_private.can_access_page(
            notification_private.resolve_user(r.user_id), p.id
          )
      ) order by r.created_at)
      from public.page_reviewers r
      where r.page_id = p.id
    ), '[]'::jsonb)
  )
  from public.pages p
  where p.id = p_page;
$$;

grant execute on function public.request_page_approval(uuid) to authenticated;
grant execute on function public.cancel_page_approval(uuid) to authenticated;
grant execute on function public.set_page_reviewers(uuid, text[], text[]) to authenticated;
grant execute on function public.approve_page(uuid, text, text) to authenticated;
grant execute on function public.page_approval_info(uuid) to authenticated;

-- ─── Realtime ───────────────────────────────────────────────────────────────
-- `page_reviewers` drives the reviewer action bar and the owner's approval
-- banner, both of which are useless if they only update on reload.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'page_reviewers'
  ) then
    alter publication supabase_realtime add table public.page_reviewers;
  end if;
end $$;