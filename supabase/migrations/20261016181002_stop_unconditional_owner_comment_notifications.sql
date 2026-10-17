-- Comments are collab-only now: a live Dynamic-Island-style indicator in the
-- editor shows new comments to whoever has the page open. Do not persist a
-- notification for every comment.
--
-- Previously `create_core_event('comment.created')` emitted an unconditional
-- "New comment on your page" notification to the page owner for EVERY comment
-- (plus an opt-in fan-out to followers). The owner row is removed here; the
-- directed events remain:
--   * 'mention' — someone @-mentioned you (targeted, high priority)
--   * 'reply'   — someone replied to your comment
--   * opt-in followers via notification_page_preferences (mode = 'all')
CREATE OR REPLACE FUNCTION notification_private.create_core_event(p_event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare kind text := p_event->>'type'; source_id uuid; c public.page_comments%rowtype;
  inv public.page_invites%rowtype; r public.reminders%rowtype; legacy public.user_notifications%rowtype;
  recipient uuid; actor uuid; result uuid; ids uuid[] := '{}'; mention jsonb;
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
$function$;
