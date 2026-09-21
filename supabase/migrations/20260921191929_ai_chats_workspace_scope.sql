begin;

alter table public.ai_chats add column if not exists workspace_id text not null default '';

update public.ai_chats c
set workspace_id = p.workspace_id
from public.pages p
where c.page_id is not null and c.page_id <> ''
  and p.id::text = c.page_id
  and p.workspace_id is not null and p.workspace_id <> ''
  and (c.workspace_id is null or c.workspace_id = '');

commit;
