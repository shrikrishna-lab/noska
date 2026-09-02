-- Desktop browser-handoff authentication (one-time transactions).
--
-- Flow: desktop creates a transaction (with a PKCE code challenge) → the
-- user signs in at noska.me/desktop-auth in their BROWSER → the web page
-- "attaches" its Clerk identity to the transaction → the desktop consumes
-- the transaction (proving possession of the PKCE verifier) and receives a
-- session. The transaction id itself carries no tokens; it is single-use,
-- expires quickly, and is useless without the verifier.
--
-- Only the service role (desktop-auth edge function) touches this table:
-- RLS is enabled and no policies are created, and direct anon/authenticated
-- REST access is revoked.

create table if not exists public.desktop_auth_transactions (
  transaction_id text primary key
    check (transaction_id ~ '^[a-f0-9]{32}$'),
  code_challenge text not null
    check (code_challenge ~ '^[A-Za-z0-9_-]{43,128}$'),
  -- Random secret issued at consume time; required to refresh this session
  -- later. Legacy pairing sessions have no secret and keep the old path.
  refresh_secret text,
  status text not null default 'pending'
    check (status in ('pending', 'attached', 'consumed', 'cancelled')),
  clerk_sub text,
  sid text,
  email text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  attached_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz not null
);

alter table public.desktop_auth_transactions enable row level security;

-- No policies on purpose: the edge function uses the service role, which
-- bypasses RLS. Explicitly revoke direct client access anyway.
revoke all on public.desktop_auth_transactions from anon, authenticated;

create index if not exists desktop_auth_transactions_sid_idx
  on public.desktop_auth_transactions (sid)
  where sid is not null;

create index if not exists desktop_auth_transactions_expires_idx
  on public.desktop_auth_transactions (expires_at);
