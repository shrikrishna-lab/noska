begin;

alter table public.notifications
  add column type_code text generated always as (upper(type)) stored,
  add column priority_code text generated always as (upper(priority)) stored;

alter function notification_private.create_event(jsonb) rename to create_core_event;
create function notification_private.create_event(p_event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare kind text := p_event->>'type'; v_source_id uuid; recipient uuid; n_id uuid; data jsonb;
  category text; title text; state text; workspace text; owner_id uuid;
begin
  if kind is null then raise exception 'EVENT_TYPE_REQUIRED' using errcode = '22023'; end if;
  if kind not in ('automation.run.updated','agent.run.updated','integration.updated') then
    return notification_private.create_core_event(p_event);
  end if;
  if p_event is null or jsonb_typeof(p_event) <> 'object' or
    exists (select 1 from jsonb_object_keys(p_event) k where k not in ('type','source_id')) then
    raise exception 'EVENT_REQUIRES_CANONICAL_SOURCE_ONLY' using errcode = '22023';
  end if;
  v_source_id := (p_event->>'source_id')::uuid;
  if kind = 'automation.run.updated' then
    select to_jsonb(r),notification_private.resolve_user(a.owner_id),a.workspace_id
      into data,owner_id,workspace
    from public.automation_runs r join public.automations a on a.id = r.automation_id where r.id = v_source_id;
    recipient := notification_private.resolve_user(data->>'owner_id');
    if recipient is distinct from owner_id then raise exception 'RUN_OWNER_MISMATCH' using errcode = '42501'; end if;
    category := 'automation';
  elsif kind = 'agent.run.updated' then
    select to_jsonb(r),r.workspace_id into data,workspace from public.agent_runs r where r.id = v_source_id;
    recipient := notification_private.resolve_user(data->>'user_id');
    category := case when data->>'source_kind' = 'automation' then 'automation' else 'ai' end;
    if data->>'source_kind' = 'automation' and not exists (
      select 1 from public.automations a where a.id::text = data->>'source_id'
        and notification_private.resolve_user(a.owner_id) = recipient
    ) then raise exception 'RUN_OWNER_MISMATCH' using errcode = '42501'; end if;
  else
    select jsonb_build_object('id',c.id,'status',c.status,'user_id',c.user_id) into data
    from public.user_connections c join public.connectors cat on cat.id = c.connector_id where c.id = v_source_id;
    recipient := notification_private.resolve_user(data->>'user_id');
    category := 'integration';
  end if;
  if data is null then raise exception 'SOURCE_NOT_FOUND' using errcode = '22023'; end if;
  state := data->>'status';
  if recipient is null then return '{"ids":[]}'::jsonb; end if;
  if nullif(workspace,'') is not null and not exists (
    select 1 from public.workspaces w where w.id::text = workspace and w.archived_at is null
      and (notification_private.resolve_user(w.owner_id) = recipient or exists (
        select 1 from public.workspace_members m where m.workspace_id = w.id
          and notification_private.resolve_user(m.user_id) = recipient))
  ) then return '{"ids":[]}'::jsonb; end if;
  if kind = 'integration.updated' then
    if state not in ('expired','revoked') then return '{"ids":[]}'::jsonb; end if;
    title := 'Integration connection ' || state;
  else
    if state not in ('completed','failed','timed_out','waiting_approval') then return '{"ids":[]}'::jsonb; end if;
    title := case when category = 'automation' then 'Automation' else 'AI run' end || ' ' || replace(state,'_',' ');
  end if;
  n_id := notification_private.emit(recipient,category,title,'Open the source to review its current status.',
    kind || ':' || v_source_id::text || ':' || state,null,null,v_source_id::text,null,
    case when state in ('failed','timed_out','waiting_approval','expired') then 'high' else 'normal' end,
    jsonb_build_object('source_type',kind,'source_id',v_source_id,'source_status',state));
  return jsonb_build_object('ids',case when n_id is null then '[]'::jsonb else jsonb_build_array(n_id) end);
end;
$$;
revoke all on function notification_private.create_event(jsonb),notification_private.create_core_event(jsonb) from public,anon,authenticated;

create function notification_private.persisted_source_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := notification_private.current_user_id(); owner_id uuid;
begin
  if tg_table_name = 'automation_runs' then
    owner_id := notification_private.resolve_user(new.owner_id);
  else
    owner_id := notification_private.resolve_user(new.user_id);
  end if;
  if actor is not null and actor is distinct from owner_id then return new; end if;
  if actor is null and coalesce(current_setting('role',true),'') not in ('service_role','none') then return new; end if;
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  perform notification_private.create_event(jsonb_build_object('type',tg_argv[0],'source_id',new.id));
  return new;
end;
$$;
revoke all on function notification_private.persisted_source_event() from public,anon,authenticated;
create trigger notification_automation_run after insert or update of status on public.automation_runs
for each row execute function notification_private.persisted_source_event('automation.run.updated');
create trigger notification_agent_run after insert or update of status on public.agent_runs
for each row execute function notification_private.persisted_source_event('agent.run.updated');
create trigger notification_integration after insert or update of status on public.user_connections
for each row execute function notification_private.persisted_source_event('integration.updated');

create function notification_private.page_source_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := notification_private.current_user_id(); owner_id uuid; block jsonb; previous jsonb;
  recipient uuid; category text; title text; key text;
begin
  if new.user_id is distinct from old.user_id or new.trashed or jsonb_typeof(new.blocks) <> 'array' then return new; end if;
  owner_id := notification_private.resolve_user(old.user_id);
  if actor is null then
    if coalesce(current_setting('role',true),'') not in ('service_role','none') then return new; end if;
    actor := owner_id;
  end if;
  if actor is null or not notification_private.can_access_page(actor,old.id) then return new; end if;
  if actor is distinct from owner_id and not exists (
    select 1 from public.page_permissions g where g.page_id = old.id and g.can_view and g.can_edit
      and notification_private.resolve_user(g.user_id) = actor
  ) then return new; end if;
  for block in select value from jsonb_array_elements(new.blocks) where value->>'type' in ('todo','to_do') loop
    if nullif(block->>'id','') is null then continue; end if;
    select value into previous from jsonb_array_elements(case when jsonb_typeof(old.blocks) = 'array' then old.blocks else '[]'::jsonb end)
      where value->>'id' = block->>'id' limit 1;
    recipient := notification_private.resolve_user(block->>'assignee');
    if recipient is null then continue; end if;
    if block->>'assignee' is distinct from previous->>'assignee' then
      category := 'assignment'; title := 'A task was assigned to you';
    elsif (block->'dueAt',block->'priority',block->'checked',block->'properties',block->'text') is distinct from
      (previous->'dueAt',previous->'priority',previous->'checked',previous->'properties',previous->'text') then
      category := 'task'; title := 'An assigned task was updated';
    else continue;
    end if;
    key := 'task:' || new.id::text || ':' || md5(block->>'id') || ':' || txid_current()::text;
    perform notification_private.emit(recipient,category,title,'Open the page to review the task.',key,new.id,actor,block->>'id',null,
      case when category = 'assignment' then 'high' else 'normal' end,
      jsonb_build_object('block_id',block->>'id','source_type','page.task.updated'));
  end loop;
  if new.title is distinct from old.title then
    for recipient in select p.user_id from public.notification_page_preferences p where p.page_id = new.id and p.mode = 'all' loop
      perform notification_private.emit(recipient,'page_update','A followed page was renamed','Open the page to view its new title.',
        'page-title:' || new.id::text || ':' || txid_current()::text,new.id,actor,new.id::text,null,'low',
        jsonb_build_object('source_type','page.title.updated'));
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function notification_private.page_source_event() from public,anon,authenticated;
create trigger notification_page_source after update of blocks,title on public.pages
for each row execute function notification_private.page_source_event();

commit;
