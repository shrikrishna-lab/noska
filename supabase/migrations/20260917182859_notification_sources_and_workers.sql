begin;

do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('page_permissions','page_comments','page_invites','collab_notifications')
  loop execute format('drop policy %I on public.%I', p.policyname, p.tablename); end loop;
end;
$$;
alter table public.page_permissions enable row level security;
alter table public.page_comments enable row level security;
alter table public.page_invites enable row level security;
alter table public.collab_notifications enable row level security;
revoke all on public.page_permissions, public.page_comments, public.page_invites, public.collab_notifications from anon;
revoke all on public.collab_notifications from authenticated;
grant select on public.collab_notifications to authenticated;
grant update(read) on public.collab_notifications to authenticated;
create policy collab_notification_own_read on public.collab_notifications for select to authenticated
using (notification_private.is_me(user_id) and (page_id is null or notification_private.my_page_access(page_id)));
create policy collab_notification_own_update on public.collab_notifications for update to authenticated
using (notification_private.is_me(user_id)) with check (notification_private.is_me(user_id));
create policy page_permission_read on public.page_permissions for select to authenticated
using (notification_private.is_me(user_id) or notification_private.owns_page(page_id));
create policy page_permission_insert on public.page_permissions for insert to authenticated
with check (notification_private.owns_page(page_id));
create policy page_permission_update on public.page_permissions for update to authenticated
using (notification_private.owns_page(page_id)) with check (notification_private.owns_page(page_id));
create policy page_permission_delete on public.page_permissions for delete to authenticated
using (notification_private.owns_page(page_id));
create policy page_comment_read on public.page_comments for select to authenticated
using (notification_private.my_page_access(page_id));
create policy page_comment_insert on public.page_comments for insert to authenticated
with check (notification_private.is_me(user_id) and notification_private.can_comment(page_id));
create policy page_comment_update on public.page_comments for update to authenticated
using (notification_private.is_me(user_id) and notification_private.can_comment(page_id))
with check (notification_private.is_me(user_id) and notification_private.can_comment(page_id));
create policy page_comment_delete on public.page_comments for delete to authenticated
using ((notification_private.is_me(user_id) and notification_private.can_comment(page_id)) or notification_private.owns_page(page_id));
create policy page_invite_read on public.page_invites for select to authenticated
using (notification_private.is_me(invitee_user_id) or notification_private.owns_page(page_id));
create policy page_invite_insert on public.page_invites for insert to authenticated
with check (notification_private.is_me(inviter_user_id) and notification_private.owns_page(page_id) and status = 'pending' and role <> 'owner');
create policy page_invite_update on public.page_invites for update to authenticated
using (notification_private.is_me(invitee_user_id) or notification_private.owns_page(page_id))
with check (notification_private.is_me(invitee_user_id) or notification_private.owns_page(page_id));
create policy page_invite_delete on public.page_invites for delete to authenticated
using (notification_private.owns_page(page_id));

create function notification_private.validate_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.id, new.page_id, new.user_id, new.parent_comment_id) is distinct from (old.id, old.page_id, old.user_id, old.parent_comment_id) then
    raise exception 'COMMENT_IDENTITY_IMMUTABLE' using errcode = '22023';
  end if;
  if new.parent_comment_id is not null and not exists (
    select 1 from public.page_comments c where c.id = new.parent_comment_id and c.page_id = new.page_id
  ) then raise exception 'INVALID_COMMENT_PARENT' using errcode = '22023'; end if;
  if length(new.content) > 20000 or jsonb_typeof(new.mentions) <> 'array' or jsonb_array_length(new.mentions) > 50 then
    raise exception 'INVALID_COMMENT' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger notification_validate_comment before insert or update on public.page_comments
for each row execute function notification_private.validate_comment();

create function notification_private.validate_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.id, new.page_id, new.inviter_user_id, new.invitee_user_id, new.role) is distinct from
    (old.id, old.page_id, old.inviter_user_id, old.invitee_user_id, old.role) then
    raise exception 'INVITE_IDENTITY_IMMUTABLE' using errcode = '22023';
  end if;
  if new.status is distinct from old.status then
    if old.status <> 'pending' then raise exception 'INVITE_ALREADY_RESPONDED' using errcode = '22023'; end if;
    if notification_private.is_me(new.invitee_user_id) and new.status in ('accepted','declined') then
      new.responded_at := now();
    elsif notification_private.owns_page(new.page_id) and new.status = 'revoked' then
      new.responded_at := now();
    elsif current_setting('role', true) not in ('service_role','none') then
      raise exception 'INVALID_INVITE_TRANSITION' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger notification_validate_invite before update on public.page_invites
for each row execute function notification_private.validate_invite();

create function notification_private.create_event(p_event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare kind text := p_event->>'type'; source_id uuid; c public.page_comments%rowtype;
  inv public.page_invites%rowtype; r public.reminders%rowtype; legacy public.user_notifications%rowtype;
  recipient uuid; actor uuid; result uuid; ids uuid[] := '{}'; mention jsonb; owner_id uuid;
begin
  if jsonb_typeof(p_event) <> 'object' or p_event ?| array['recipients','recipient_ids','user_id','title','body','actor_id'] then
    raise exception 'EVENT_REQUIRES_CANONICAL_SOURCE_ONLY' using errcode = '22023';
  end if;
  source_id := (p_event->>'source_id')::uuid;
  if source_id is null then raise exception 'SOURCE_ID_REQUIRED' using errcode = '22023'; end if;
  if kind = 'comment.created' then
    select * into c from public.page_comments where id = source_id;
    if not found then raise exception 'SOURCE_NOT_FOUND' using errcode = '22023'; end if;
    actor := notification_private.resolve_user(c.user_id);
    if actor is null or not notification_private.can_access_page(actor, c.page_id) then return jsonb_build_object('ids',ids); end if;
    select notification_private.resolve_user(p.user_id) into owner_id from public.pages p where p.id = c.page_id;
    for mention in select value from jsonb_array_elements(coalesce(c.mentions,'[]')) loop
      if jsonb_typeof(mention) = 'object' then
        recipient := notification_private.resolve_user(mention->>'user_id');
      else
        recipient := notification_private.resolve_user(mention #>> '{}');
      end if;
      if recipient is not null then
        result := notification_private.emit(recipient,'mention','You were mentioned in a comment',c.content,
          'comment:' || c.id::text, c.page_id,actor,c.id::text,null,'high');
        if result is not null then ids := array_append(ids,result); end if;
      end if;
    end loop;
    if c.parent_comment_id is not null then
      select notification_private.resolve_user(p.user_id) into recipient from public.page_comments p
      where p.id = c.parent_comment_id and p.page_id = c.page_id;
      result := notification_private.emit(recipient,'reply','New reply to your comment',c.content,
        'comment:' || c.id::text,c.page_id,actor,c.id::text);
      if result is not null then ids := array_append(ids,result); end if;
    end if;
    result := notification_private.emit(owner_id,'comment','New comment on your page',c.content,
      'comment:' || c.id::text,c.page_id,actor,c.id::text);
    if result is not null then ids := array_append(ids,result); end if;
    for recipient in select pp.user_id from public.notification_page_preferences pp
      where pp.page_id = c.page_id and pp.mode = 'all' loop
      result := notification_private.emit(recipient,'comment','New comment on a followed page',c.content,
        'comment:' || c.id::text,c.page_id,actor,c.id::text);
      if result is not null then ids := array_append(ids,result); end if;
    end loop;
  elsif kind = 'invite.created' then
    select * into inv from public.page_invites where id = source_id and status = 'pending';
    if not found then return jsonb_build_object('ids',ids); end if;
    actor := notification_private.resolve_user(inv.inviter_user_id);
    if not exists (select 1 from public.pages p where p.id = inv.page_id and not coalesce(p.trashed,false)
      and notification_private.resolve_user(p.user_id) = actor) then return jsonb_build_object('ids',ids); end if;
    recipient := notification_private.resolve_user(inv.invitee_user_id);
    result := notification_private.emit(recipient,'invite','You have a page invitation','Open your invitations to respond.',
      'invite:' || inv.id::text,null,actor,inv.id::text,null,'high',jsonb_build_object('invite_id',inv.id));
    if result is not null then ids := array_append(ids,result); end if;
  elsif kind = 'reminder.due' then
    select * into r from public.reminders where id = source_id and status = 'pending' and remind_at <= now() for update;
    if not found then return jsonb_build_object('ids',ids); end if;
    result := notification_private.emit(r.user_id,'reminder',r.title,r.body,'reminder:' || r.id::text,
      r.page_id,null,r.id::text,null,'high',jsonb_build_object('block_id',r.block_id));
    update public.reminders set status = case when result is null then 'cancelled' else 'sent' end,
      delivered_at = case when result is null then null else now() end, updated_at = now() where id = r.id;
    if result is not null then ids := array_append(ids,result); end if;
  elsif kind = 'admin.sent' then
    select * into legacy from public.user_notifications where id = source_id;
    if not found then raise exception 'SOURCE_NOT_FOUND' using errcode = '22023'; end if;
    for recipient in select u.id from auth.users u where legacy.user_id is null or u.id = legacy.user_id loop
      result := notification_private.emit(recipient,legacy.category,legacy.title,legacy.body,'admin:' || legacy.id::text,
        legacy.page_id,null,legacy.id::text,legacy.id,case when legacy.severity = 'critical' then 'urgent' else 'normal' end,
        jsonb_build_object('is_test',legacy.is_test));
      if result is not null then
        update public.notifications set severity = legacy.severity where id = result and severity is distinct from legacy.severity;
        ids := array_append(ids,result);
      end if;
    end loop;
  else raise exception 'UNSUPPORTED_EVENT_TYPE' using errcode = '22023';
  end if;
  return jsonb_build_object('ids',coalesce((select jsonb_agg(distinct v) from unnest(ids) v),'[]'::jsonb));
end;
$$;

create function public.create_notification_event(p_event jsonb)
returns jsonb language sql security definer set search_path = '' as $$
  select notification_private.create_event(p_event);
$$;
revoke all on function public.create_notification_event(jsonb) from public, anon, authenticated;
grant execute on function public.create_notification_event(jsonb) to service_role;

create function notification_private.source_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform notification_private.create_event(jsonb_build_object('type',tg_argv[0],'source_id',new.id));
  return new;
end;
$$;
create trigger notification_comment_created after insert on public.page_comments
for each row execute function notification_private.source_event('comment.created');
create trigger notification_invite_created after insert on public.page_invites
for each row execute function notification_private.source_event('invite.created');
create trigger notification_admin_sent after insert on public.user_notifications
for each row execute function notification_private.source_event('admin.sent');

create function public.notification_process_reminders(p_limit integer default 100)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; affected integer := 0;
begin
  for r in select id from public.reminders where status = 'pending' and remind_at <= now()
    order by remind_at, id limit least(greatest(p_limit,1),500) for update skip locked loop
    perform notification_private.create_event(jsonb_build_object('type','reminder.due','source_id',r.id));
    affected := affected + 1;
  end loop;
  return affected;
end;
$$;

create function notification_private.delivery_allowed(p_notification uuid, p_push boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.notifications n
    left join public.notification_preferences p on p.user_id = n.user_id
    left join public.notification_page_preferences pp on pp.user_id = n.user_id and pp.page_id = n.page_id
    where n.id = p_notification and (n.page_id is null or notification_private.can_access_page(n.user_id,n.page_id))
      and (not p_push or (not n.is_read and not n.is_archived and coalesce(p.enabled,true) and coalesce(p.push_enabled,false)
        and coalesce(p.category_settings->n.category,'true'::jsonb) <> 'false'::jsonb
        and coalesce(pp.mode,'all') <> 'muted'
        and (coalesce(pp.mode,'all') <> 'mentions' or n.type in ('mention','reply','assignment','reminder'))))
  );
$$;

create function public.notification_claim_deliveries(p_limit integer default 50)
returns setof public.notification_deliveries language plpgsql security definer set search_path = '' as $$
declare d public.notification_deliveries%rowtype; next_time timestamptz;
begin
  for d in select * from public.notification_deliveries where
    (status = 'pending' and available_at <= now()) or (status = 'processing' and locked_until < now())
    order by available_at,id limit least(greatest(p_limit,1),200) for update skip locked loop
    if d.attempts >= 8 then
      update public.notification_deliveries set status = 'failed', last_error = 'ATTEMPTS_EXHAUSTED', updated_at = now() where id = d.id;
      continue;
    end if;
    if not notification_private.delivery_allowed(d.notification_id,d.channel = 'push') or
      (d.channel = 'push' and not exists (select 1 from public.push_subscriptions s where s.id = d.subscription_id
        and s.user_id = d.user_id and s.disabled_at is null and (s.expiration_time is null or s.expiration_time > now()))) then
      update public.notification_deliveries set status = 'suppressed', updated_at = now() where id = d.id;
      continue;
    end if;
    if d.channel = 'push' then
      next_time := notification_private.next_delivery_at(d.user_id);
      if next_time > now() then
        update public.notification_deliveries set status = 'pending', available_at = next_time, locked_until = null, claim_token = null, updated_at = now() where id = d.id;
        continue;
      end if;
    end if;
    update public.notification_deliveries set status = 'processing', attempts = attempts + 1,
      locked_until = now() + interval '5 minutes', claim_token = gen_random_uuid(), updated_at = now()
      where id = d.id returning * into d;
    return next d;
  end loop;
end;
$$;

create function public.notification_finish_delivery(p_id uuid, p_claim_token uuid, p_success boolean,
  p_error text default null, p_permanent boolean default false)
returns boolean language plpgsql security definer set search_path = '' as $$
declare d public.notification_deliveries%rowtype;
begin
  select * into d from public.notification_deliveries where id = p_id and status = 'processing'
    and claim_token = p_claim_token and locked_until > now() for update;
  if not found then return false; end if;
  update public.notification_deliveries set
    status = case when p_success then 'sent' when p_permanent or attempts >= 8 then 'failed' else 'pending' end,
    delivered_at = case when p_success then now() else null end,
    last_error = case when p_success then null else left(p_error,500) end,
    available_at = now() + make_interval(secs => least(3600, (15 * power(2,attempts))::integer)),
    claim_token = null, locked_until = null, updated_at = now() where id = d.id;
  return true;
end;
$$;

create function public.notification_broadcast_delivery(p_id uuid, p_claim_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare d public.notification_deliveries%rowtype; n public.notifications%rowtype;
begin
  select * into d from public.notification_deliveries where id = p_id and channel = 'broadcast' and status = 'processing'
    and claim_token = p_claim_token and locked_until > now() for update;
  if not found then return false; end if;
  if not notification_private.delivery_allowed(d.notification_id,false) then
    update public.notification_deliveries set status = 'suppressed', locked_until = null, claim_token = null where id = d.id;
    return false;
  end if;
  select * into n from public.notifications where id = d.notification_id;
  perform realtime.send(jsonb_build_object('record',to_jsonb(n),'old_record',d.payload->'old_record','operation',d.operation),
    'notification','notifications:user:' || d.user_id::text,true);
  return public.notification_finish_delivery(d.id,d.claim_token,true);
end;
$$;
revoke all on function public.notification_process_reminders(integer), public.notification_claim_deliveries(integer),
  public.notification_finish_delivery(uuid,uuid,boolean,text,boolean), public.notification_broadcast_delivery(uuid,uuid) from public, anon, authenticated;
grant execute on function public.notification_process_reminders(integer), public.notification_claim_deliveries(integer),
  public.notification_finish_delivery(uuid,uuid,boolean,text,boolean), public.notification_broadcast_delivery(uuid,uuid) to service_role;

create function notification_private.sync_legacy_read()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.notifications set is_read = true where legacy_notification_id = new.notification_id
    and user_id = new.user_id and not is_read;
  return new;
end;
$$;
create trigger notification_legacy_read after insert on public.user_notification_reads
for each row execute function notification_private.sync_legacy_read();

insert into public.notifications(user_id,page_id,type,category,title,body,severity,priority,source,entity_type,entity_id,
  deduplication_key,legacy_notification_id,is_read,read_at,created_at)
select u.id, n.page_id,n.category,n.category,left(n.title,200),left(n.body,2000),n.severity,
  case when n.severity = 'critical' then 'urgent' else 'normal' end,'admin','notification',n.id::text,
  'admin:' || n.id::text,n.id,r.read_at is not null,r.read_at,n.created_at
from public.user_notifications n join auth.users u on n.user_id is null or n.user_id = u.id
left join public.user_notification_reads r on r.notification_id = n.id and r.user_id = u.id
where n.page_id is null or notification_private.can_access_page(u.id,n.page_id)
on conflict(user_id,deduplication_key) do nothing;
update public.notification_deliveries set status = 'suppressed',last_error = 'HISTORICAL_BACKFILL'
where notification_id in (select id from public.notifications where legacy_notification_id is not null);

revoke all on all functions in schema notification_private from public, anon, authenticated;
grant execute on function notification_private.current_user_id(), notification_private.owns_page(uuid),
  notification_private.my_page_access(uuid), notification_private.can_comment(uuid), notification_private.is_me(text) to authenticated;

commit;
