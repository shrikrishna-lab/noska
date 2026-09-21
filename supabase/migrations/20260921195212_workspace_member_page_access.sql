begin;

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
  or (visibility = 'public')
  or (workspace_id is not null and workspace_id <> '' and exists (
    select 1 from public.workspace_members m join public.workspaces w on w.id = m.workspace_id
    where w.id::text = pages.workspace_id and m.user_id = (auth.jwt()->>'sub'))));

commit;
