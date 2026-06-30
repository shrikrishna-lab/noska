-- Real-Time Collaboration Core
-- Adds tables for presence, block locking, audit, versions, and permissions

create extension if not exists "pgcrypto";

-- Active collaboration sessions per page
create table if not exists public.collaboration_sessions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages(id) on delete cascade,
  user_id text not null,
  user_name text not null,
  user_avatar text default '👤',
  user_color text not null default '#7c3aed',
  status text default 'viewing' check (status in ('viewing','editing','idle')),
  current_block_id text,
  last_activity timestamptz default now(),
  started_at timestamptz default now()
);
create index if not exists idx_collab_sessions_page on public.collaboration_sessions(page_id);
create index if not exists idx_collab_sessions_user on public.collaboration_sessions(user_id);
create index if not exists idx_collab_sessions_active on public.collaboration_sessions(last_activity desc);

-- Block locks prevent edit conflicts
create table if not exists public.block_locks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages(id) on delete cascade,
  block_id text not null,
  user_id text not null,
  user_name text not null,
  user_color text not null default '#7c3aed',
  acquired_at timestamptz default now(),
  expires_at timestamptz default now() + interval '30 seconds',
  constraint unique_block_lock unique (block_id)
);
create index if not exists idx_block_locks_page on public.block_locks(page_id);
create index if not exists idx_block_locks_expires on public.block_locks(expires_at);

-- Auto-release expired locks
create or replace function public.release_expired_locks()
returns trigger as $$
begin
  delete from public.block_locks where expires_at < now();
  return new;
end;
$$ language plpgsql;

create trigger release_expired_locks_trigger after insert or update on public.block_locks
  for each statement execute function public.release_expired_locks();

-- Audit events: word-by-word editing history
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages(id) on delete cascade,
  block_id text,
  user_id text not null,
  user_name text not null,
  action text not null,
  -- action: 'insert'|'delete'|'edit'|'move'|'ai_generated'|'ai_edit'|'rename'|'format'|'create'|'duplicate'|'trash'|'restore'|'permission_change'|'comment'
  block_type text,
  content_before jsonb,
  content_after jsonb,
  detail text,
  -- AI metadata
  ai_provider text,
  ai_model text,
  ai_prompt_tokens integer default 0,
  ai_completion_tokens integer default 0,
  ai_latency_ms integer default 0,
  ai_tool_calls jsonb,
  ai_cost numeric(10,6) default 0,
  ai_undo_ref text,
  created_at timestamptz default now()
);
create index if not exists idx_audit_page on public.audit_events(page_id);
create index if not exists idx_audit_user on public.audit_events(user_id);
create index if not exists idx_audit_action on public.audit_events(action);
create index if not exists idx_audit_block on public.audit_events(block_id);
create index if not exists idx_audit_created on public.audit_events(created_at desc);
create index if not exists idx_audit_ai on public.audit_events(action) where action like 'ai_%';

-- Page versions for time travel
create table if not exists public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages(id) on delete cascade,
  version_number integer not null,
  title text,
  blocks jsonb,
  page_snapshot jsonb,
  user_id text not null,
  user_name text not null,
  description text,
  created_at timestamptz default now()
);
create index if not exists idx_page_versions_page on public.page_versions(page_id);
create index if not exists idx_page_versions_number on public.page_versions(page_id, version_number desc);

-- Page permissions
create table if not exists public.page_permissions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages(id) on delete cascade,
  user_id text not null,
  user_name text not null,
  role text not null default 'editor' check (role in ('owner','admin','editor','commenter','viewer','custom')),
  can_view boolean default true,
  can_edit boolean default true,
  can_comment boolean default true,
  can_share boolean default false,
  can_delete boolean default false,
  can_audit boolean default false,
  can_manage_collaborators boolean default false,
  can_export boolean default false,
  can_use_ai boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_page_user_permission unique (page_id, user_id)
);
create index if not exists idx_page_permissions_page on public.page_permissions(page_id);
create index if not exists idx_page_permissions_user on public.page_permissions(user_id);

-- Enable RLS
alter table public.collaboration_sessions enable row level security;
alter table public.block_locks enable row level security;
alter table public.audit_events enable row level security;
alter table public.page_versions enable row level security;
alter table public.page_permissions enable row level security;

-- RLS policies (single-user/anon mode for now)
create policy "Allow all on collaboration_sessions" on public.collaboration_sessions
  for all using (true) with check (true);
create policy "Allow all on block_locks" on public.block_locks
  for all using (true) with check (true);
create policy "Allow all on audit_events" on public.audit_events
  for all using (true) with check (true);
create policy "Allow all on page_versions" on public.page_versions
  for all using (true) with check (true);
create policy "Allow all on page_permissions" on public.page_permissions
  for all using (true) with check (true);

-- Auto-update updated_at triggers
create trigger set_collab_sessions_updated_at before update on public.collaboration_sessions
  for each row execute function public.update_updated_at();
create trigger set_page_permissions_updated_at before update on public.page_permissions
  for each row execute function public.update_updated_at();

-- Clean stale sessions function (run via pg_cron or manually)
create or replace function public.clean_stale_sessions()
returns void as $$
begin
  delete from public.collaboration_sessions
  where last_activity < now() - interval '5 minutes';
  delete from public.block_locks
  where expires_at < now();
end;
$$ language plpgsql;

-- Enable realtime for these tables
alter publication supabase_realtime add table public.block_locks;
alter publication supabase_realtime add table public.audit_events;
alter publication supabase_realtime add table public.page_versions;
