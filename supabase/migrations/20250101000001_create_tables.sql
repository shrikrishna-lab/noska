-- Create extension for UUID generation
create extension if not exists "pgcrypto";

-- Pages table: stores all pages with their blocks as JSONB
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled',
  icon text default '📝',
  cover text default 'linear-gradient(135deg,#0f7b6c,#2dd4bf,#f4d35e)',
  parent_id uuid references public.pages(id) on delete set null,
  favorite boolean default false,
  trashed boolean default false,
  tags jsonb default '[]'::jsonb,
  hidden_from_recents boolean default false,
  offline boolean default false,
  is_encrypted boolean default false,
  encrypted_blocks text,
  iv text,
  salt text,
  is_locked boolean default false,
  blocks jsonb default '[]'::jsonb,
  lineage jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workspace settings table
create table if not exists public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  value jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(key)
);

-- AI chats table
create table if not exists public.ai_chats (
  id uuid primary key default gen_random_uuid(),
  name text default 'New chat',
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.pages enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.ai_chats enable row level security;

-- Create policies for anon access (single-user mode)
create policy "Allow all on pages" on public.pages
  for all using (true) with check (true);

create policy "Allow all on workspace_settings" on public.workspace_settings
  for all using (true) with check (true);

create policy "Allow all on ai_chats" on public.ai_chats
  for all using (true) with check (true);

-- Indexes for performance
create index if not exists idx_pages_trashed on public.pages(trashed);
create index if not exists idx_pages_parent_id on public.pages(parent_id);
create index if not exists idx_pages_updated_at on public.pages(updated_at desc);
create index if not exists idx_pages_favorite on public.pages(favorite);
create index if not exists idx_workspace_settings_key on public.workspace_settings(key);
create index if not exists idx_ai_chats_updated_at on public.ai_chats(updated_at desc);

-- Auto-update updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.pages
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.workspace_settings
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.ai_chats
  for each row execute function public.update_updated_at();
