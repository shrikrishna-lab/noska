-- Fix: Add missing updated_at column to collaboration_sessions (trigger references it)
alter table if exists public.collaboration_sessions
  add column if not exists updated_at timestamptz default now();

-- Fix: Add IF NOT EXISTS to alter publication statements for resilience
alter publication supabase_realtime add table if not exists public.block_locks;
alter publication supabase_realtime add table if not exists public.audit_events;
alter publication supabase_realtime add table if not exists public.page_versions;

-- Fix: Add IF NOT EXISTS to indexes in extend_chats migration
create index if not exists idx_ai_chats_pinned on public.ai_chats(pinned);
create index if not exists idx_ai_chats_archived on public.ai_chats(archived);
create index if not exists idx_ai_chats_chat_type on public.ai_chats(chat_type);
create index if not exists idx_ai_chats_page_id on public.ai_chats(page_id);

-- Add unique constraint on page_versions to prevent duplicate version_number race condition
create unique index if not exists idx_page_versions_unique_version
  on public.page_versions(page_id, version_number);
