begin;

alter table public.notifications rename to admin_notifications;

do $migration$
declare
  f record;
  definition text;
begin
  for f in
    select p.oid, p.proargnames
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.prosrc ~ '\mnotifications\M'
  loop
    definition := regexp_replace(pg_get_functiondef(f.oid), '\mnotifications\M', 'admin_notifications', 'g');
    if 'p_table' = any(f.proargnames) then
      definition := regexp_replace(definition, '\mBEGIN\M', E'BEGIN\n  IF p_table = ''notifications'' THEN p_table := ''admin_notifications''; END IF;', 'i');
    end if;
    execute definition;
  end loop;
  if to_regprocedure('public.admin_realtime_notify()') is not null then
    definition := pg_get_functiondef('public.admin_realtime_notify()'::regprocedure);
    definition := replace(definition, 'VALUES (TG_TABLE_NAME, TG_OP, v_record_id)',
      'VALUES (CASE WHEN TG_TABLE_NAME = ''admin_notifications'' THEN ''notifications'' ELSE TG_TABLE_NAME END, TG_OP, v_record_id)');
    execute definition;
  end if;
end;
$migration$;

create schema if not exists notification_private;
revoke all on schema notification_private from public, anon, authenticated;
grant usage on schema notification_private to authenticated, service_role;
alter default privileges in schema notification_private revoke execute on functions from public, anon, authenticated;

create table notification_private.identities (
  clerk_sub text primary key check (clerk_sub ~ '^user_[A-Za-z0-9]+$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table notification_private.identities enable row level security;
revoke all on notification_private.identities from public, anon, authenticated;

create function public.notification_register_identity(p_clerk_sub text, p_user_id uuid)
returns void language sql security definer set search_path = '' as $$
  insert into notification_private.identities(clerk_sub, user_id)
  values (p_clerk_sub, p_user_id)
  on conflict (clerk_sub) do update set user_id = excluded.user_id, updated_at = now();
$$;
revoke all on function public.notification_register_identity(text, uuid) from public, anon, authenticated;
grant execute on function public.notification_register_identity(text, uuid) to service_role;

create function notification_private.resolve_user(p_id text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where u.id::text = p_id
  union all
  select i.user_id from notification_private.identities i where i.clerk_sub = p_id
  limit 1;
$$;

create function notification_private.current_user_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select notification_private.resolve_user(auth.jwt()->>'sub');
$$;
grant execute on function notification_private.current_user_id() to authenticated;

create function notification_private.can_access_page(p_user uuid, p_page uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_sub text := auth.jwt()->>'sub'; found boolean;
begin
  if p_page is null then return false; end if;
  if p_user is not null then
    select exists (
      select 1 from public.pages p
      where p.id = p_page and not coalesce(p.trashed, false) and (
        notification_private.resolve_user(p.user_id) = p_user
        or p.visibility = 'public'
        or exists (select 1 from public.page_permissions g where g.page_id = p.id
          and notification_private.resolve_user(g.user_id) = p_user and g.can_view)
        or (p.visibility = 'company' and exists (
          select 1 from public.organization_members m where m.organization_id = p.organization_id
            and notification_private.resolve_user(m.user_id) = p_user and m.status = 'active'))
      )
    ) into found;
    if found then return true; end if;
  elsif v_sub is not null then
    select exists (
      select 1 from public.pages p
      where p.id = p_page and not coalesce(p.trashed, false) and (
        p.user_id = v_sub
        or p.visibility = 'public'
        or exists (select 1 from public.page_permissions g where g.page_id = p.id
          and g.user_id = v_sub and g.can_view)
        or (p.visibility = 'company' and exists (
          select 1 from public.organization_members m where m.organization_id = p.organization_id
            and m.user_id = v_sub and m.status = 'active'))
      )
    ) into found;
    if found then return true; end if;
  else
    return false;
  end if;
  if to_regclass('public.company_teams') is null or to_regclass('public.company_team_members') is null then
    return false;
  end if;
  if p_user is not null then
    return exists (
      select 1 from public.pages p
      where p.id = p_page and not coalesce(p.trashed, false) and p.visibility = 'team'
        and exists (
          select 1 from public.company_team_members tm
          join public.organization_members m on m.id = tm.organization_member_id
          join public.company_teams t on t.id = tm.team_id
          where tm.team_id = p.team_id and t.organization_id = p.organization_id
            and m.organization_id = p.organization_id and m.status = 'active'
            and tm.left_at is null and notification_private.resolve_user(m.user_id) = p_user)
    );
  else
    return exists (
      select 1 from public.pages p
      where p.id = p_page and not coalesce(p.trashed, false) and p.visibility = 'team'
        and exists (
          select 1 from public.company_team_members tm
          join public.organization_members m on m.id = tm.organization_member_id
          join public.company_teams t on t.id = tm.team_id
          where tm.team_id = p.team_id and t.organization_id = p.organization_id
            and m.organization_id = p.organization_id and m.status = 'active'
            and tm.left_at is null and m.user_id = v_sub)
    );
  end if;
end;
$$;

create function notification_private.owns_page(p_page uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pages p where p.id = p_page
    and (notification_private.resolve_user(p.user_id) = notification_private.current_user_id()
      or (notification_private.current_user_id() is null and p.user_id = auth.jwt()->>'sub')));
$$;
grant execute on function notification_private.owns_page(uuid) to authenticated;

create function notification_private.my_page_access(p_page uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select notification_private.can_access_page(notification_private.current_user_id(), p_page);
$$;
grant execute on function notification_private.my_page_access(uuid) to authenticated;

create function notification_private.can_comment(p_page uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select notification_private.my_page_access(p_page) and (
    notification_private.owns_page(p_page) or exists (
      select 1 from public.page_permissions g where g.page_id = p_page and g.can_comment
        and notification_private.resolve_user(g.user_id) = notification_private.current_user_id()
    )
  );
$$;
grant execute on function notification_private.can_comment(uuid) to authenticated;

create function notification_private.is_me(p_user text)
returns boolean language sql stable security definer set search_path = '' as $$
  select notification_private.resolve_user(p_user) = notification_private.current_user_id()
    or (notification_private.current_user_id() is null and p_user = auth.jwt()->>'sub');
$$;
grant execute on function notification_private.is_me(text) to authenticated;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  page_id uuid references public.pages(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  category text not null,
  title text not null check (length(title) between 1 and 200),
  body text not null default '' check (length(body) <= 2000),
  message text generated always as (body) stored,
  severity text not null default 'info' check (severity in ('info','success','warning','critical')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  source text not null,
  entity_type text,
  entity_id text,
  action_url text check (action_url is null or (action_url ~ '^/[^/\\]' and action_url !~ '[\r\n]')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 8192),
  grouping_key text,
  deduplication_key text not null check (length(deduplication_key) between 1 and 300),
  is_read boolean not null default false,
  is_archived boolean not null default false,
  read_at timestamptz,
  archived_at timestamptz,
  status text generated always as (case when is_archived then 'archived' when is_read then 'read' else 'unread' end) stored,
  legacy_notification_id uuid references public.user_notifications(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, deduplication_key)
);
create index notification_inbox_idx on public.notifications(user_id, created_at desc, id desc) where not is_archived;
create index notification_unread_idx on public.notifications(user_id) where not is_read and not is_archived;
create index notification_page_idx on public.notifications(page_id) where page_id is not null;
create index notification_workspace_idx on public.notifications(workspace_id) where workspace_id is not null;
create index notification_actor_idx on public.notifications(actor_id) where actor_id is not null;
create index notification_legacy_idx on public.notifications(legacy_notification_id) where legacy_notification_id is not null;
create index notification_group_idx on public.notifications(user_id, grouping_key, created_at desc) where grouping_key is not null;

create table public.notification_preferences (
  user_id uuid primary key default notification_private.current_user_id() references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default false,
  email_enabled boolean not null default false,
  desktop_enabled boolean not null default true,
  desktop_sound boolean not null default true,
  desktop_preview boolean not null default true,
  desktop_when_focused boolean not null default false,
  timezone text not null default 'UTC',
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '08:00',
  category_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(category_settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_page_preferences (
  user_id uuid not null default notification_private.current_user_id() references auth.users(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  mode text not null default 'all' check (mode in ('all','mentions','muted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, page_id)
);
create index notification_page_preferences_page_idx on public.notification_page_preferences(page_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default notification_private.current_user_id() references auth.users(id) on delete cascade,
  endpoint text not null check (length(endpoint) <= 2048 and endpoint ~ '^https://'),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}=?$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{22}(==)?$'),
  expiration_time timestamptz,
  device_name text check (length(device_name) <= 120),
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete cascade,
  channel text not null check (channel in ('push','broadcast')),
  operation text not null default 'INSERT' check (operation in ('INSERT','UPDATE','DELETE')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','suppressed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_until timestamptz,
  claim_token uuid,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notification_delivery_claim_idx on public.notification_deliveries(available_at, created_at) where status in ('pending','processing');
create index notification_delivery_user_idx on public.notification_deliveries(user_id, created_at desc);
create index notification_delivery_notification_idx on public.notification_deliveries(notification_id);
create index notification_delivery_subscription_idx on public.notification_deliveries(subscription_id);
create unique index notification_delivery_push_unique on public.notification_deliveries(notification_id, subscription_id) where channel = 'push';

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default notification_private.current_user_id() references auth.users(id) on delete cascade,
  page_id uuid references public.pages(id) on delete cascade,
  block_id text check (length(block_id) <= 200),
  title text not null check (length(title) between 1 and 200),
  body text not null default '' check (length(body) <= 2000),
  remind_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','cancelled')),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_due_idx on public.reminders(remind_at, id) where status = 'pending';
create index reminders_user_idx on public.reminders(user_id, remind_at);
create index reminders_page_idx on public.reminders(page_id);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_page_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.reminders enable row level security;
revoke all on public.notifications, public.notification_preferences, public.notification_page_preferences,
  public.push_subscriptions, public.notification_deliveries, public.reminders from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update(is_read, is_archived) on public.notifications to authenticated;
grant select, insert, update, delete on public.notification_preferences, public.notification_page_preferences, public.push_subscriptions to authenticated;
grant select, delete on public.reminders to authenticated;
grant insert(user_id, page_id, block_id, title, body, remind_at) on public.reminders to authenticated;
grant update(page_id, block_id, title, body, remind_at) on public.reminders to authenticated;
grant all on public.notifications, public.notification_preferences, public.notification_page_preferences,
  public.push_subscriptions, public.notification_deliveries, public.reminders to service_role;

create policy notification_read_own on public.notifications for select to authenticated
  using (user_id = (select notification_private.current_user_id()) and (page_id is null or notification_private.my_page_access(page_id)));
create policy notification_update_own on public.notifications for update to authenticated
  using (user_id = (select notification_private.current_user_id()) and (page_id is null or notification_private.my_page_access(page_id)))
  with check (user_id = (select notification_private.current_user_id()) and (page_id is null or notification_private.my_page_access(page_id)));
create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (user_id = (select notification_private.current_user_id())) with check (user_id = (select notification_private.current_user_id()));
create policy notification_page_preferences_own on public.notification_page_preferences for all to authenticated
  using (user_id = (select notification_private.current_user_id()))
  with check (user_id = (select notification_private.current_user_id()) and notification_private.my_page_access(page_id));
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = (select notification_private.current_user_id())) with check (user_id = (select notification_private.current_user_id()));
create policy reminders_read_own on public.reminders for select to authenticated
  using (user_id = (select notification_private.current_user_id()));
create policy reminders_insert_own on public.reminders for insert to authenticated
  with check (user_id = (select notification_private.current_user_id()) and (page_id is null or notification_private.my_page_access(page_id)));
create policy reminders_update_own on public.reminders for update to authenticated
  using (user_id = (select notification_private.current_user_id()) and status = 'pending')
  with check (user_id = (select notification_private.current_user_id()) and status = 'pending' and (page_id is null or notification_private.my_page_access(page_id)));
create policy reminders_delete_own on public.reminders for delete to authenticated
  using (user_id = (select notification_private.current_user_id()));

create function notification_private.validate_preferences()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'INVALID_TIMEZONE' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_each(new.category_settings) s where jsonb_typeof(s.value) <> 'boolean') then
    raise exception 'CATEGORY_SETTINGS_MUST_BE_BOOLEANS' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger notification_validate_preferences before insert or update on public.notification_preferences
for each row execute function notification_private.validate_preferences();

create function notification_private.stamp_notification()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.read_at := case when new.is_read then coalesce(old.read_at, now()) else null end;
  new.archived_at := case when new.is_archived then coalesce(old.archived_at, now()) else null end;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger notification_stamp before update on public.notifications for each row execute function notification_private.stamp_notification();

create function public.notification_unread_count()
returns bigint language sql stable security invoker set search_path = '' as $$
  select count(*) from public.notifications where not is_read and not is_archived;
$$;
create function public.notification_mark(p_ids uuid[], p_read boolean default null, p_archived boolean default null, p_all boolean default false)
returns integer language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  if coalesce(array_length(p_ids, 1), 0) > 1000 then raise exception 'TOO_MANY_IDS' using errcode = '22023'; end if;
  update public.notifications set is_read = coalesce(p_read, is_read), is_archived = coalesce(p_archived, is_archived)
  where (p_all or id = any(p_ids)) and (p_read is not null or p_archived is not null)
    and (is_read is distinct from coalesce(p_read, is_read) or is_archived is distinct from coalesce(p_archived, is_archived));
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.notification_unread_count(), public.notification_mark(uuid[], boolean, boolean, boolean) from public, anon;
grant execute on function public.notification_unread_count(), public.notification_mark(uuid[], boolean, boolean, boolean) to authenticated;

create function notification_private.next_delivery_at(p_user uuid, p_now timestamptz default now())
returns timestamptz language plpgsql stable security definer set search_path = '' as $$
declare prefs public.notification_preferences%rowtype; local_now timestamp; end_local timestamp;
begin
  select * into prefs from public.notification_preferences where user_id = p_user;
  if not found or not prefs.quiet_hours_enabled or prefs.quiet_hours_start = prefs.quiet_hours_end then return p_now; end if;
  local_now := p_now at time zone prefs.timezone;
  if (prefs.quiet_hours_start < prefs.quiet_hours_end and local_now::time >= prefs.quiet_hours_start and local_now::time < prefs.quiet_hours_end)
    or (prefs.quiet_hours_start > prefs.quiet_hours_end and (local_now::time >= prefs.quiet_hours_start or local_now::time < prefs.quiet_hours_end)) then
    end_local := local_now::date + prefs.quiet_hours_end;
    if prefs.quiet_hours_start > prefs.quiet_hours_end and local_now::time >= prefs.quiet_hours_start then end_local := end_local + interval '1 day'; end if;
    return greatest(p_now, end_local at time zone prefs.timezone);
  end if;
  return p_now;
end;
$$;

create function notification_private.emit(p_user uuid, p_type text, p_title text, p_body text, p_key text,
  p_page uuid default null, p_actor uuid default null, p_entity text default null, p_legacy uuid default null,
  p_priority text default 'normal', p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare prefs public.notification_preferences%rowtype; page_mode text; n_id uuid; workspace uuid;
begin
  if p_user is null or not exists(select 1 from auth.users where id = p_user) then return null; end if;
  if p_actor = p_user then return null; end if;
  if p_page is not null and not notification_private.can_access_page(p_user, p_page) then return null; end if;
  select * into prefs from public.notification_preferences where user_id = p_user;
  if found and (not prefs.enabled or not prefs.in_app_enabled or prefs.category_settings->p_type = 'false'::jsonb) then return null; end if;
  select mode into page_mode from public.notification_page_preferences where user_id = p_user and page_id = p_page;
  if page_mode = 'muted' or (page_mode = 'mentions' and p_type not in ('mention','reply','assignment','reminder')) then return null; end if;
  select w.id into workspace from public.pages p join public.workspaces w on w.id::text = p.workspace_id where p.id = p_page;
  insert into public.notifications(user_id, workspace_id, page_id, actor_id, type, category, title, body,
    source, entity_type, entity_id, action_url, grouping_key, deduplication_key, legacy_notification_id, priority, metadata)
  values(p_user, workspace, p_page, p_actor, p_type, p_type, left(p_title, 200), left(coalesce(p_body,''),2000),
    case when p_legacy is not null then 'admin' else 'server' end,
    case when p_type = 'reminder' then 'reminder' when p_type = 'invite' then 'invite' else 'comment' end,
    p_entity, case when p_page is not null then '/my-workspace/' || p_page::text else '/my-workspace' end,
    p_type || ':' || coalesce(p_page::text, p_entity, p_key), p_key, p_legacy, p_priority, p_metadata)
  on conflict(user_id, deduplication_key) do nothing returning id into n_id;
  if n_id is null then select id into n_id from public.notifications where user_id = p_user and deduplication_key = p_key; end if;
  return n_id;
end;
$$;

create function notification_private.enqueue_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare payload jsonb;
begin
  payload := jsonb_build_object('record', to_jsonb(new), 'old_record', case when tg_op = 'UPDATE' then jsonb_build_object('id',old.id,'is_read',old.is_read,'is_archived',old.is_archived) else null end, 'operation', tg_op);
  insert into public.notification_deliveries(notification_id, user_id, channel, operation, payload)
  values(new.id, new.user_id, 'broadcast', tg_op, payload);
  if tg_op = 'INSERT' then
    insert into public.notification_deliveries(notification_id, user_id, subscription_id, channel, available_at)
    select new.id, new.user_id, s.id, 'push', notification_private.next_delivery_at(new.user_id)
    from public.push_subscriptions s join public.notification_preferences p on p.user_id = s.user_id
    where s.user_id = new.user_id and s.disabled_at is null and (s.expiration_time is null or s.expiration_time > now())
      and p.enabled and p.push_enabled;
  end if;
  return new;
end;
$$;
create trigger notification_enqueue after insert or update on public.notifications for each row execute function notification_private.enqueue_notification();

create policy notification_broadcast_receive on realtime.messages for select to authenticated
using (extension = 'broadcast' and topic = 'notifications:user:' || (select notification_private.current_user_id())::text);
create policy notification_broadcast_isolate on realtime.messages as restrictive for select to authenticated
using (topic not like 'notifications:user:%' or topic = 'notifications:user:' || (select notification_private.current_user_id())::text);
create policy notification_broadcast_no_client_send on realtime.messages as restrictive for insert to authenticated
with check (topic not like 'notifications:user:%');

revoke all on all functions in schema notification_private from public, anon, authenticated;
grant execute on function notification_private.current_user_id(), notification_private.owns_page(uuid),
  notification_private.my_page_access(uuid), notification_private.can_comment(uuid), notification_private.is_me(text) to authenticated;

commit;
