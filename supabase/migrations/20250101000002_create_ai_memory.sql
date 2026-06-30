-- AI Memory table: stores persistent AI memory entries
-- Supports key-value storage with categories, TTL, and vector embeddings
create table if not exists public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  value jsonb not null,
  category text not null default 'general',
  importance real default 0.5,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique index on key for upsert operations
create unique index if not exists idx_ai_memory_key on public.ai_memory(key);

-- Index for category-based lookups
create index if not exists idx_ai_memory_category on public.ai_memory(category);

-- Index for importance ordering
create index if not exists idx_ai_memory_importance on public.ai_memory(importance desc);

-- Index for expiration cleanup
create index if not exists idx_ai_memory_expires on public.ai_memory(expires_at) where expires_at is not null;

-- Enable RLS
alter table public.ai_memory enable row level security;

-- Permissive policy for single-user mode
create policy "Allow all on ai_memory" on public.ai_memory
  for all using (true) with check (true);

-- Auto-update trigger
create trigger set_updated_at before update on public.ai_memory
  for each row execute function public.update_updated_at();
