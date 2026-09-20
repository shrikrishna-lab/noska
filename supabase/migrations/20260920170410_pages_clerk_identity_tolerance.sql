begin;

drop policy if exists pages_select_own_or_shared on public.pages;
create policy pages_select_own_or_shared on public.pages for select to authenticated
using ((user_id = (auth.jwt()->>'sub'))
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
using ((user_id = (auth.jwt()->>'sub')) or fn_is_workspace_member(workspace_id, (auth.jwt()->>'sub')));

drop policy if exists workspaces_select_own on public.workspaces;
create policy workspaces_select_own on public.workspaces for select to authenticated
using ((owner_id = (auth.jwt()->>'sub')) or fn_is_workspace_member(id, (auth.jwt()->>'sub')));

drop policy if exists user_notifications_select_own_or_broadcast on public.user_notifications;
create policy user_notifications_select_own_or_broadcast on public.user_notifications
  for select to authenticated
  using (user_id::text = (auth.jwt()->>'sub') or user_id is null);

commit;
