-- Extend ai_chats table with management fields
alter table if exists public.ai_chats
  add column if not exists pinned boolean default false,
  add column if not exists archived boolean default false,
  add column if not exists chat_type text default 'private',
  add column if not exists page_id text,
  add column if not exists page_title text,
  add column if not exists collaborators jsonb default '[]'::jsonb;

create index if not exists idx_ai_chats_pinned on public.ai_chats(pinned);
create index if not exists idx_ai_chats_archived on public.ai_chats(archived);
create index if not exists idx_ai_chats_chat_type on public.ai_chats(chat_type);
create index if not exists idx_ai_chats_page_id on public.ai_chats(page_id);
