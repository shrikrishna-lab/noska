begin;

drop policy if exists workspaces_insert_own on public.workspaces;
create policy workspaces_insert_own on public.workspaces for insert to authenticated
with check (owner_id = (auth.jwt()->>'sub'));

drop policy if exists workspaces_update_own on public.workspaces;
create policy workspaces_update_own on public.workspaces for update to authenticated
using (owner_id = (auth.jwt()->>'sub')) with check (owner_id = (auth.jwt()->>'sub'));

drop policy if exists workspaces_delete_own on public.workspaces;
create policy workspaces_delete_own on public.workspaces for delete to authenticated
using (owner_id = (auth.jwt()->>'sub'));

drop policy if exists workspace_members_insert_own on public.workspace_members;
create policy workspace_members_insert_own on public.workspace_members for insert to authenticated
with check ((user_id = (auth.jwt()->>'sub')) or (exists (
  select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = (auth.jwt()->>'sub'))));

drop policy if exists workspace_members_delete_own on public.workspace_members;
create policy workspace_members_delete_own on public.workspace_members for delete to authenticated
using ((user_id = (auth.jwt()->>'sub')) or (exists (
  select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = (auth.jwt()->>'sub'))));

commit;
