begin;

create or replace function notification_private.enqueue_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare payload jsonb; delivery_id uuid;
begin
  payload := jsonb_build_object('record', to_jsonb(new), 'old_record', case when tg_op = 'UPDATE' then jsonb_build_object('id',old.id,'is_read',old.is_read,'is_archived',old.is_archived) else null end, 'operation', tg_op);
  insert into public.notification_deliveries(notification_id, user_id, channel, operation, payload)
  values(new.id, new.user_id, 'broadcast', tg_op, payload) returning id into delivery_id;
  if new.page_id is null or notification_private.can_access_page(new.user_id,new.page_id) then
    begin
      perform realtime.send(payload,'notification','notifications:user:' || new.user_id::text,true);
      update public.notification_deliveries set status = 'sent', delivered_at = now(), updated_at = now()
      where id = delivery_id;
    exception when others then
      update public.notification_deliveries set last_error = 'BROADCAST_ENQUEUE_FAILED', updated_at = now()
      where id = delivery_id;
    end;
  else
    update public.notification_deliveries set status = 'suppressed', last_error = 'ACCESS_REVOKED' where id = delivery_id;
  end if;
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
revoke all on function notification_private.enqueue_notification() from public, anon, authenticated;

create function public.admin_notification_platform_send(p_session_token text, p_user_ids jsonb,
  p_title text, p_body text, p_type text, p_is_test boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare admin_id uuid; admin_email text; target text; recipient uuid; recipients uuid[] := '{}';
  legacy_id uuid; notification_id uuid; ids uuid[] := '{}'; title text;
begin
  admin_id := public.require_admin_role(p_session_token,'admin');
  if admin_id is null then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_user_ids is null or jsonb_typeof(p_user_ids) <> 'array' then
    raise exception 'EXPLICIT_TARGETS_REQUIRED' using errcode = '22023';
  end if;
  if jsonb_array_length(p_user_ids) not between 1 and (case when p_is_test then 10 else 500 end)
    or exists (select 1 from jsonb_array_elements(p_user_ids) v where jsonb_typeof(v) <> 'string') then
    raise exception 'INVALID_TARGETS' using errcode = '22023';
  end if;
  if p_is_test is null or p_title is null or length(btrim(p_title)) not between 1 and 200
    or p_body is null or length(p_body) > 1000 or p_type is null
    or lower(p_type) not in ('system','task','mention','ai','automation','invite','broadcast') then
    raise exception 'INVALID_NOTIFICATION' using errcode = '22023';
  end if;
  for target in select value from jsonb_array_elements_text(p_user_ids) loop
    recipient := notification_private.resolve_user(btrim(target));
    if recipient is null then raise exception 'UNKNOWN_NOTIFICATION_TARGET' using errcode = '22023'; end if;
    if not recipient = any(recipients) then recipients := array_append(recipients,recipient); end if;
  end loop;
  select email into admin_email from public.admin_users where id = admin_id;
  title := btrim(p_title);
  if p_is_test and left(title,6) <> '[TEST]' then title := '[TEST] ' || left(title,193); end if;
  foreach recipient in array recipients loop
    insert into public.user_notifications(user_id,title,body,category,severity,is_test,created_by,created_by_email)
    values(recipient,title,p_body,lower(p_type),'info',p_is_test,admin_id,admin_email) returning id into legacy_id;
    select id into notification_id from public.notifications where user_id = recipient and legacy_notification_id = legacy_id;
    if notification_id is not null then ids := array_append(ids,notification_id); end if;
  end loop;
  perform public.log_admin_action(admin_id,case when p_is_test then 'test_notification_platform' else 'send_notification_platform' end,
    'user_notification',null,title,jsonb_build_object('target_count',cardinality(recipients),'count',cardinality(ids),'type',lower(p_type),'is_test',p_is_test));
  return jsonb_build_object('ids',to_jsonb(ids),'count',cardinality(ids));
end;
$$;

create function public.admin_notification_platform_overview(p_session_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare admin_id uuid; generated timestamptz := now(); window_start timestamptz := now() - interval '30 days'; result jsonb;
begin
  admin_id := public.require_admin_role(p_session_token,'admin');
  if admin_id is null then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  with n as (select * from public.notifications where created_at >= window_start),
  d as (select * from public.notification_deliveries where created_at >= window_start)
  select jsonb_build_object(
    'generated_at',generated,'window_start',window_start,
    'kpis',jsonb_build_object(
      'notifications',(select count(*) from n),
      'deliveries',(select count(*) from d),
      'sent',(select count(*) from d where status = 'sent'),
      'failed',(select count(*) from d where status = 'failed'),
      'pending',(select count(*) from d where status in ('pending','processing')),
      'read',(select count(*) from n where is_read),
      'read_rate',(select round(100.0 * count(*) filter (where is_read) / nullif(count(*),0),2) from n),
      'reminders_pending',(select count(*) from public.reminders where status = 'pending')),
    'channels',jsonb_build_array(
      jsonb_build_object('channel','broadcast','available',true,'reason','Transactional database broadcast; sent means queued to Realtime, not device receipt'),
      jsonb_build_object('channel','push','available',false,'reason','Requires deployed worker, scheduler and VAPID; runtime readiness is not verified by this database'),
      jsonb_build_object('channel','email','available',false,'reason','No email delivery integration configured'),
      jsonb_build_object('channel','desktop','available',false,'reason','Client-managed; device permission and readiness are not observable by this database')),
    'recent',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from (
      select d.id,d.notification_id,d.user_id,n.title,n.type,d.channel,d.status,
        coalesce(n.metadata->'is_test' = 'true'::jsonb,false) as is_test,
        d.created_at,d.delivered_at,n.read_at,d.last_error as error
      from d join public.notifications n on n.id = d.notification_id
      order by d.created_at desc,d.id desc limit 100
    ) r),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_notification_platform_overview(text),
  public.admin_notification_platform_send(text,jsonb,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.admin_notification_platform_overview(text),
  public.admin_notification_platform_send(text,jsonb,text,text,text,boolean) to anon, authenticated, service_role;

commit;
