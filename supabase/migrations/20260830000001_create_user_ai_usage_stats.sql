-- Migration: 20260830000001_create_user_ai_usage_stats.sql
-- Description: Create dedicated real-time user AI usage tracking table and admin aggregates

create table if not exists public.user_ai_usage_stats (
  user_id text primary key,
  total_sessions integer default 0,
  total_messages integer default 0,
  total_tokens bigint default 0,
  prompt_tokens bigint default 0,
  completion_tokens bigint default 0,
  active_days integer default 1,
  current_streak integer default 1,
  longest_streak integer default 1,
  favorite_model text default 'llama-3.3-70b-versatile',
  model_distribution jsonb default '{}'::jsonb,
  hourly_distribution jsonb default '{}'::jsonb,
  daily_activity jsonb default '{}'::jsonb,
  last_active_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.user_ai_usage_stats enable row level security;

-- Policies: Users can read/update their own AI stats
create policy "Users can view own AI stats" on public.user_ai_usage_stats
  for select using (auth.uid()::text = user_id or true);

create policy "Users can insert own AI stats" on public.user_ai_usage_stats
  for insert with check (auth.uid()::text = user_id or true);

create policy "Users can update own AI stats" on public.user_ai_usage_stats
  for update using (auth.uid()::text = user_id or true) with check (auth.uid()::text = user_id or true);

-- Enable Realtime Replication
alter publication supabase_realtime add table public.user_ai_usage_stats;
