-- Desktop pairing v2: identity = raw Clerk user id (same as web).
alter table desktop_auth_pairs
  add column if not exists clerk_sub text,
  add column if not exists refresh_hash text,
  add column if not exists refresh_expires_at timestamptz;
