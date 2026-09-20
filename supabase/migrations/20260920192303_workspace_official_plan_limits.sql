begin;

create or replace function notification_private.workspace_quota(p_owner_sub text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare canonical uuid; plan_slug text := 'free'; max_allowed integer; owned integer;
  now_ts timestamptz := now(); sub record; v_plan_id uuid; ov record;
begin
  if p_owner_sub is null or length(p_owner_sub) = 0 then
    return jsonb_build_object('plan', 'free', 'limit', 1, 'used', 0);
  end if;
  canonical := notification_private.resolve_user(p_owner_sub);
  for sub in select * from public.billing_subscriptions s
    where s.user_id = p_owner_sub or (canonical is not null and s.user_id = canonical::text)
    order by s.created_at desc limit 5 loop
    if (sub.status = 'active' and (sub.current_period_end is null or sub.current_period_end > now_ts))
      or (sub.status = 'trialing' and (sub.trial_end is null or sub.trial_end > now_ts))
      or (sub.status = 'past_due' and (sub.grace_period_until is null or sub.grace_period_until > now_ts))
      or (sub.status = 'cancelled' and coalesce(sub.cancel_at_period_end, false)
        and (sub.current_period_end is null or sub.current_period_end > now_ts)) then
      v_plan_id := sub.plan_id;
      exit;
    end if;
  end loop;
  if v_plan_id is null then
    select id into v_plan_id from public.billing_plans where slug = 'free' limit 1;
  end if;
  select slug into plan_slug from public.billing_plans where id = v_plan_id;
  if plan_slug is null then plan_slug := 'free'; end if;
  select * into ov from public.billing_entitlement_overrides o
    where o.feature_key = 'max_workspaces'
      and (o.user_id = p_owner_sub or (canonical is not null and o.user_id = canonical::text))
      and (o.expires_at is null or o.expires_at > now_ts)
    order by o.created_at desc limit 1;
  if found and ov.limit_value is not null then
    max_allowed := ov.limit_value;
  else
    select limit_value into max_allowed from public.billing_plan_features f
      where f.plan_id = v_plan_id and f.feature_key = 'max_workspaces' limit 1;
  end if;
  if max_allowed is null or max_allowed < 0 then
    return jsonb_build_object('plan', plan_slug, 'limit', 0, 'used', 0);
  end if;
  select count(*) into owned from public.workspaces w
    where w.owner_id = p_owner_sub or (canonical is not null and w.owner_id = canonical::text);
  return jsonb_build_object('plan', plan_slug, 'limit', max_allowed, 'used', owned);
end;
$$;

commit;
