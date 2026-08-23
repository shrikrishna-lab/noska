-- =====================================================================
-- P1 Developer Platform: API keys, rate limiting, idempotency
--
-- Real API key infrastructure backing the /api/v1 Edge Function:
--   * keys are stored as SHA-256 hashes — never raw
--   * a short display prefix is kept for lookup + UI ("nsk_ab12cd34…")
--   * owner-scoped RLS matches the pages table model (user_id text)
--   * rate limiting is a fixed-window counter per key (atomic RPC)
--   * Idempotency-Key replays are cached for 24h for POST endpoints
-- =====================================================================

-- ─── API keys ────────────────────────────────────────────────────────
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null default 'Untitled key',
  prefix text not null,
  key_hash text not null unique,
  scopes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_user_api_keys_user_id on public.user_api_keys(user_id);
create index if not exists idx_user_api_keys_prefix on public.user_api_keys(prefix);

alter table public.user_api_keys enable row level security;

create policy user_api_keys_select_own ON public.user_api_keys
  for select to authenticated using (user_id = (auth.uid())::text);
create policy user_api_keys_insert_own ON public.user_api_keys
  for insert to authenticated with check (user_id = (auth.uid())::text);
create policy user_api_keys_update_own ON public.user_api_keys
  for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy user_api_keys_delete_own ON public.user_api_keys
  for delete to authenticated using (user_id = (auth.uid())::text);

-- ─── Rate limiting (fixed 1-minute window, atomic via RPC) ──────────
create table if not exists public.api_rate_limits (
  api_key_id uuid not null references public.user_api_keys(id) on delete cascade,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (api_key_id, window_start)
);

alter table public.api_rate_limits enable row level security;
-- No policies: the table is written exclusively by the api-v1 Edge
-- Function through the service role (which bypasses RLS). Clients get
-- nothing.

-- Atomic increment-and-check. Returns the new window count; the caller
-- compares against the key's limit.
create or replace function public.consume_api_rate_limit(
  p_api_key_id uuid,
  p_window_start timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.api_rate_limits (api_key_id, window_start, count)
  values (p_api_key_id, p_window_start, 1)
  on conflict (api_key_id, window_start)
  do update set count = public.api_rate_limits.count + 1
  returning count into v_count;
  return v_count;
end;
$$;

revoke all on function public.consume_api_rate_limit(uuid, timestamptz) from anon, authenticated;

-- Housekeeping: drop windows older than an hour (best-effort, called by
-- the Edge Function occasionally).
create or replace function public.prune_api_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.api_rate_limits where window_start < now() - interval '1 hour';
$$;

revoke all on function public.prune_api_rate_limits() from anon, authenticated;

-- ─── Idempotency replay cache (POST endpoints, 24h TTL) ─────────────
create table if not exists public.api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references public.user_api_keys(id) on delete cascade,
  idempotency_key text not null,
  endpoint text not null,
  response_status integer not null,
  response_body jsonb,
  created_at timestamptz not null default now(),
  unique (api_key_id, idempotency_key)
);

create index if not exists idx_api_idempotency_created on public.api_idempotency_keys(created_at);

alter table public.api_idempotency_keys enable row level security;
-- Service-role only, same as rate limits.
