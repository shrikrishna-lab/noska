begin;

create function notification_private.my_canonical_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select notification_private.resolve_user(auth.jwt()->>'sub');
$$;
revoke all on function notification_private.my_canonical_id() from public, anon, authenticated;
grant execute on function notification_private.my_canonical_id() to authenticated;

create or replace function notification_private.can_access_page(p_user uuid, p_page uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_sub text := auth.jwt()->>'sub'; found boolean;
begin
  if p_page is null then return false; end if;
  if p_user is null then p_user := notification_private.my_canonical_id(); end if;
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

create or replace function notification_private.is_me(p_user text)
returns boolean language sql stable security definer set search_path = '' as $$
  select notification_private.resolve_user(p_user) = notification_private.current_user_id()
    or (notification_private.current_user_id() is null and p_user = auth.jwt()->>'sub')
    or (notification_private.my_canonical_id() is not null
      and notification_private.resolve_user(p_user) = notification_private.my_canonical_id());
$$;

create or replace function notification_private.owns_page(p_page uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pages p where p.id = p_page
    and (notification_private.resolve_user(p.user_id) = notification_private.current_user_id()
      or (notification_private.current_user_id() is null and p.user_id = auth.jwt()->>'sub')
      or (notification_private.my_canonical_id() is not null
        and notification_private.resolve_user(p.user_id) = notification_private.my_canonical_id())));
$$;

drop policy if exists pages_select_own_or_shared on public.pages;
create policy pages_select_own_or_shared on public.pages for select to authenticated
using ((user_id = (auth.jwt()->>'sub'))
  or (notification_private.my_canonical_id() is not null and user_id = notification_private.my_canonical_id()::text)
  or (organization_id is not null and visibility in ('company','team') and public.fn_is_org_member(organization_id, (auth.jwt()->>'sub')))
  or (team_id is not null and visibility = 'team' and exists (
    select 1 from company_team_members ctm join company_teams ct on ct.id = ctm.team_id
    where ctm.team_id = pages.team_id
      and ctm.organization_member_id in (
        select om.id from organization_members om
        where om.user_id = (auth.jwt()->>'sub') and om.organization_id = pages.organization_id)
      and ctm.left_at is null))
  or (exists (select 1 from page_permissions pp where pp.page_id = pages.id and pp.user_id = (auth.jwt()->>'sub')))
  or (visibility = 'public'));

drop policy if exists workspace_members_select_own on public.workspace_members;
create policy workspace_members_select_own on public.workspace_members for select to authenticated
using ((user_id = (auth.jwt()->>'sub'))
  or (notification_private.my_canonical_id() is not null and user_id = notification_private.my_canonical_id()::text)
  or fn_is_workspace_member(workspace_id, (auth.jwt()->>'sub')));

drop policy if exists workspaces_select_own on public.workspaces;
create policy workspaces_select_own on public.workspaces for select to authenticated
using ((owner_id = (auth.jwt()->>'sub'))
  or (notification_private.my_canonical_id() is not null and owner_id = notification_private.my_canonical_id()::text)
  or fn_is_workspace_member(id, (auth.jwt()->>'sub')));

drop policy if exists user_notifications_select_own_or_broadcast on public.user_notifications;
create policy user_notifications_select_own_or_broadcast on public.user_notifications
  for select to authenticated
  using (user_id::text = (auth.jwt()->>'sub')
    or user_id = notification_private.my_canonical_id()
    or user_id is null);

commit;
