-- Desktop browser-pairing auth (phase 2).
-- Codes are created by the BROWSER (claim, Clerk-authenticated) and consumed
-- by the DESKTOP (exchange). Service-role only access; clients never read it.

create table if not exists public.desktop_auth_pairs (
  code         text primary key,
  user_id      uuid,
  email        text,
  status       text not null default 'waiting', -- waiting | claimed | used
  attempts     int  not null default 0,
  created_at   timestamptz not null default now(),
  claimed_at   timestamptz,
  expires_at   timestamptz not null default now() + interval '10 minutes'
);

alter table public.desktop_auth_pairs enable row level security;

-- No policies: RLS denies all client access. Edge function uses service role.
