begin;

alter table public.notifications drop column type_code;
alter table public.notifications
  add column type_code text generated always as (
    case type
      when 'mention' then 'MENTION'
      when 'reply' then 'COMMENT_REPLY'
      when 'reaction' then 'COMMENT_REACTION'
      when 'comment' then 'COMMENT_REPLY'
      when 'invite' then 'PAGE_INVITE'
      when 'page_update' then 'PAGE_UPDATE'
      when 'assignment' then 'TASK_ASSIGNED'
      when 'task' then 'TASK_DUE'
      when 'reminder' then 'REMINDER'
      when 'automation' then 'AUTOMATION'
      when 'ai' then 'AI_COMPLETED'
      when 'integration' then 'INTEGRATION'
      when 'connector' then 'CONNECTOR_ERROR'
      when 'mcp' then 'MCP_EVENT'
      when 'security' then 'SECURITY'
      when 'system' then 'SYSTEM'
      when 'broadcast' then 'SYSTEM'
      else upper(type)
    end
  ) stored;

alter table public.notifications drop column priority_code;
alter table public.notifications
  add column priority_code text generated always as (
    case priority when 'urgent' then 'CRITICAL' else upper(priority) end
  ) stored;

create function public.notification_agent_message(p_run_id uuid, p_owner_id text, p_title text, p_body text,
  p_key text, p_action_url text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare run public.agent_runs%rowtype; recipient uuid; owner uuid; n_id uuid; title text; url text;
begin
  if p_run_id is null or p_owner_id is null or p_title is null or p_body is null or p_key is null
    or length(btrim(p_key)) not between 1 and 200 then
    raise exception 'INVALID_AGENT_MESSAGE' using errcode = '22023';
  end if;
  select * into run from public.agent_runs where id = p_run_id;
  if not found then raise exception 'SOURCE_NOT_FOUND' using errcode = '22023'; end if;
  recipient := notification_private.resolve_user(run.user_id::text);
  owner := notification_private.resolve_user(btrim(p_owner_id));
  if recipient is null or owner is null or recipient is distinct from owner then
    raise exception 'RUN_OWNER_MISMATCH' using errcode = '42501';
  end if;
  title := left(btrim(p_title), 200);
  if length(title) = 0 or length(p_body) > 2000 then
    raise exception 'INVALID_AGENT_MESSAGE' using errcode = '22023';
  end if;
  if p_action_url is not null and p_action_url ~ '^/[^/\\]' and p_action_url !~ '[\r\n]' then
    url := left(p_action_url, 300);
  end if;
  n_id := notification_private.emit(recipient, 'ai', title, p_body,
    'agent-message:' || p_run_id::text || ':' || btrim(p_key),
    null, null, p_run_id::text, null, 'normal',
    jsonb_build_object('source_type', 'agent.run.message', 'source_id', p_run_id));
  if url is not null and n_id is not null then
    update public.notifications set action_url = url where id = n_id;
  end if;
  return jsonb_build_object('ids', case when n_id is null then '[]'::jsonb else jsonb_build_array(n_id) end);
end;
$$;
revoke all on function public.notification_agent_message(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.notification_agent_message(uuid, text, text, text, text, text) to service_role;

commit;
