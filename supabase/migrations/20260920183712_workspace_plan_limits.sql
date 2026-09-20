begin;

create function notification_private.workspace_quota(p_owner_sub text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare canonical uuid; is_pro boolean; owned integer; max_allowed integer; owner_email text;
begin
  if p_owner_sub is null or length(p_owner_sub) = 0 then
    return jsonb_build_object('plan', 'free', 'limit', 1, 'used', 0);
  end if;
  canonical := notification_private.resolve_user(p_owner_sub);
  select email into owner_email from public.user_profiles
    where user_id = p_owner_sub or (canonical is not null and user_id = canonical::text) limit 1;
  select exists (
    select 1 from public.subscriptions s
    where s.status = 'active' and s.plan in ('pro', 'enterprise')
      and (s.renews_at is null or s.renews_at > now())
      and (s.user_id::text = p_owner_sub
        or (canonical is not null and s.user_id = canonical)
        or (owner_email is not null and s.email is not null and lower(s.email) = lower(owner_email)))
  ) into is_pro;
  max_allowed := case when is_pro then 3 else 1 end;
  select count(*) into owned from public.workspaces w
    where w.owner_id = p_owner_sub or (canonical is not null and w.owner_id = canonical::text);
  return jsonb_build_object('plan', case when is_pro then 'pro' else 'free' end,
    'limit', max_allowed, 'used', owned);
end;
$$;
revoke all on function notification_private.workspace_quota(text) from public, anon, authenticated;

create function public.my_workspace_quota()
returns jsonb language sql stable security definer set search_path = '' as $$
  select notification_private.workspace_quota(auth.jwt()->>'sub');
$$;
revoke all on function public.my_workspace_quota() from public, anon, authenticated;
grant execute on function public.my_workspace_quota() to authenticated;

create function public.enforce_workspace_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare quota jsonb;
begin
  if coalesce(current_setting('role', true), '') = 'service_role' then return NEW; end if;
  if NEW.owner_id is null or length(NEW.owner_id) = 0 then
    raise exception 'WORKSPACE_OWNER_REQUIRED' using errcode = '22023';
  end if;
  quota := notification_private.workspace_quota(NEW.owner_id);
  if (quota->>'used')::integer >= (quota->>'limit')::integer then
    raise exception 'WORKSPACE_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;
drop trigger if exists workspace_enforce_limit on public.workspaces;
create trigger workspace_enforce_limit before insert on public.workspaces
for each row execute function public.enforce_workspace_limit();

commit;
