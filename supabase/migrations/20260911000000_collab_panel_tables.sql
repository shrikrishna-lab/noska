-- Collab Panel tables: comments, activity, notifications, invites
-- The CollabPanel UI (src/features/collab) queries these tables but they
-- were never created — Comments / Activity / Alerts tabs silently returned
-- empty results until now.

create extension if not exists "pgcrypto";

-- Threaded page comments
create table if not exists public.page_comments (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages(id) on delete cascade,
  block_id text,
  user_id text not null,
  user_name text not null default 'Anonymous',
  user_avatar text,
  content text not null,
  parent_comment_id uuid references public.page_comments(id) on delete cascade,
  resolved boolean default false,
  resolved_by text,
  resolved_at timestamptz,
  mentions jsonb default '[]'::jsonb,
  reactions jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_page_comments_page on public.page_comments(page_id);
create index if not exists idx_page_comments_block on public.page_comments(block_id);
create index if not exists idx_page_comments_created on public.page_comments(created_at desc);

-- Per-page activity feed
create table if not exists public.collab_activity (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages(id) on delete cascade,
  user_id text not null,
  user_name text default 'Anonymous',
  action text not null,
  detail text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_collab_activity_page on public.collab_activity(page_id);
create index if not exists idx_collab_activity_user on public.collab_activity(user_id);
create index if not exists idx_collab_activity_created on public.collab_activity(created_at desc);

-- In-app collab notifications (mentions, replies, invites, grants)
create table if not exists public.collab_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null default 'info',
  title text not null,
  body text,
  page_id uuid references public.pages(id) on delete cascade,
  comment_id uuid,
  from_user_id text,
  from_user_name text,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_collab_notifications_user on public.collab_notifications(user_id);
create index if not exists idx_collab_notifications_unread on public.collab_notifications(user_id, read);

-- Page-level invites (pending -> accepted / declined)
create table if not exists public.page_invites (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages(id) on delete cascade,
  page_title text,
  inviter_user_id text not null,
  inviter_username text,
  invitee_user_id text not null,
  invitee_username text,
  role text not null default 'viewer' check (role in ('owner','admin','editor','commenter','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','declined','revoked')),
  created_at timestamptz default now(),
  responded_at timestamptz
);
create index if not exists idx_page_invites_invitee on public.page_invites(invitee_user_id, status);
create index if not exists idx_page_invites_page on public.page_invites(page_id);

create or replace function public.update_collab_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_page_comments_updated_at on public.page_comments;
create trigger set_page_comments_updated_at before update on public.page_comments
  for each row execute function public.update_collab_updated_at();

-- Enable RLS (matches the allow-all convention of collaboration_core until
-- per-workspace auth policies land for these surfaces)
alter table public.page_comments enable row level security;
alter table public.collab_activity enable row level security;
alter table public.collab_notifications enable row level security;
alter table public.page_invites enable row level security;

create policy "Allow all on page_comments" on public.page_comments
  for all using (true) with check (true);
create policy "Allow all on collab_activity" on public.collab_activity
  for all using (true) with check (true);
create policy "Allow all on collab_notifications" on public.collab_notifications
  for all using (true) with check (true);
create policy "Allow all on page_invites" on public.page_invites
  for all using (true) with check (true);

-- Realtime so comments and notifications update live in the panel
alter publication supabase_realtime add table public.page_comments;
alter publication supabase_realtime add table public.collab_notifications;
