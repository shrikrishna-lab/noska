-- Detailed patch notes / updates page (read-only for end users)
create table if not exists public.patch_notes (
  id uuid primary key default gen_random_uuid(),
  version text,
  title text not null,
  summary text,
  features jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  fixes jsonb not null default '[]'::jsonb,
  known_issues jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patch_notes_published_idx
  on public.patch_notes (published_at desc) where published = true;

alter table public.patch_notes enable row level security;

-- Anyone (anon or authenticated) can READ published notes only
create policy patch_notes_read_published
  on public.patch_notes
  for select
  to public
  using (published = true);

-- No write access for anyone via client APIs (service role / admin backend only)
create policy patch_notes_writes_denied
  on public.patch_notes
  for all
  to public
  using (false)
  with check (false);

-- Defense-in-depth: drop client write privileges entirely
revoke insert, update, delete, truncate on public.patch_notes from anon, authenticated;
