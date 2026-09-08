-- =====================================================================
-- Connector Gateway (extensibility platform, phase 1)
--
-- Backs the connector-gateway Edge Function: Noska acts as an MCP
-- CLIENT to external services (Gmail, Calendar, Slack, ...):
--
--   * connectors          — admin-managed catalog of MCP servers
--   * user_connections    — one row per user per connector; OAuth tokens
--                           are AES-GCM encrypted at rest
--                           (CONNECTOR_ENCRYPTION_KEY — never stored
--                           readable, never returned by any API)
--   * connector_call_logs — per-tool-call audit trail (user, connector,
--                           tool, timestamp, success/failure)
--   * connector_rate_limits + consume_connector_rate_limit()
--                           — fixed-window per-user/per-connector limit,
--                           mirrors the api_rate_limits pattern
--
-- Ownership model: user_ids are raw Clerk ids (text), matching
-- workspaces/user_api_keys/connected_accounts. Server-only tables
-- enable RLS with deliberately no client policies; the gateway
-- functions use the service role and scope EVERY query by user_id.
-- =====================================================================

-- ─── Connector catalog (admin-managed; no client policies on purpose —
-- ─── oauth_config carries endpoint URLs, never client secrets; those
-- ─── live in env vars named in oauth_config.client_*_env) ───────────
create table if not exists public.connectors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  publisher text not null default 'noska',
  icon_url text,
  mcp_server_url text not null,
  oauth_config jsonb not null default '{}'::jsonb,
  default_scopes text[] not null default '{}',
  -- Optional MCP tool name → required OAuth scope(s). When a tool is
  -- absent from the map, an active connection is the only requirement.
  tool_scope_map jsonb not null default '{}'::jsonb,
  call_rate_limit integer not null default 60,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.connectors enable row level security;
-- No policies: the catalog is served (sanitized) by the connector-gateway
-- function only, so a leaked anon key cannot enumerate server URLs.

-- ─── Per-user connections (tokens encrypted at rest) ─────────────────
create table if not exists public.user_connections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  connector_id uuid not null references public.connectors(id) on delete cascade,
  status text not null default 'connected' check (status in ('connected','expired','revoked')),
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  external_account_label text not null default '',
  token_hint text,
  connected_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

-- One live connection per user per connector; revoked rows are kept for
-- audit and a reconnect inserts a fresh row.
create unique index if not exists uq_user_connections_active
  on public.user_connections (user_id, connector_id)
  where status <> 'revoked';

create index if not exists idx_user_connections_user
  on public.user_connections (user_id, status);

alter table public.user_connections enable row level security;

create policy user_connections_select_own ON public.user_connections
  for select to authenticated using (user_id = (auth.uid())::text);
create policy user_connections_delete_own ON public.user_connections
  for delete to authenticated using (user_id = (auth.uid())::text);
-- No insert/update policies: tokens are written exclusively by the
-- gateway (service role) after a verified OAuth exchange.

-- ─── Audit log for tool calls (main DB, chosen over an external store;
-- ─── service-role only — Phase 3 automations and the Phase 5 review
-- ─── pipeline read it via the gateway, never the client) ─────────────
create table if not exists public.connector_call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  connector_id uuid not null references public.connectors(id) on delete cascade,
  connection_id uuid references public.user_connections(id) on delete set null,
  tool_name text not null default '',
  status text not null check (status in ('success','failure')),
  error text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_connector_call_logs_user
  on public.connector_call_logs (user_id, created_at desc);
create index if not exists idx_connector_call_logs_connector
  on public.connector_call_logs (connector_id, created_at desc);

alter table public.connector_call_logs enable row level security;
-- Service-role only, same convention as api_rate_limits.

-- ─── Rate limiting (fixed 1-minute window per user + connector) ──────
create table if not exists public.connector_rate_limits (
  user_id text not null,
  connector_id uuid not null references public.connectors(id) on delete cascade,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, connector_id, window_start)
);

alter table public.connector_rate_limits enable row level security;
-- Service-role only.

create or replace function public.consume_connector_rate_limit(
  p_user_id text,
  p_connector_id uuid,
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
  insert into public.connector_rate_limits (user_id, connector_id, window_start, count)
  values (p_user_id, p_connector_id, p_window_start, 1)
  on conflict (user_id, connector_id, window_start)
  do update set count = public.connector_rate_limits.count + 1
  returning count into v_count;
  return v_count;
end;
$$;

revoke all on function public.consume_connector_rate_limit(text, uuid, timestamptz) from anon, authenticated;

create or replace function public.prune_connector_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.connector_rate_limits where window_start < now() - interval '1 hour';
$$;

revoke all on function public.prune_connector_rate_limits() from anon, authenticated;

-- ─── Seeds: two real connectors for end-to-end testing ───────────────
-- Google hosts official remote MCP servers for Workspace (developer
-- preview): https://developers.google.com/workspace/guides/configure-mcp-servers
-- Both use standard Google OAuth 2.0 (authorization-code + PKCE), so a
-- single GCP OAuth client (Web application) covers both once its
-- redirect URIs include <function-origin>/connector-gateway/callback.
-- Client id/secret come from env vars (CONNECTOR_*_CLIENT_ID/_SECRET);
-- access_type=offline + prompt=consent make Google issue refresh tokens.

insert into public.connectors (slug, name, description, publisher, mcp_server_url, oauth_config, default_scopes, call_rate_limit)
values
  (
    'google-calendar',
    'Google Calendar',
    'List calendars, check free/busy and read events through Google''s official Calendar MCP server.',
    'google',
    'https://calendarmcp.googleapis.com/mcp/v1',
    '{
      "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
      "token_endpoint": "https://oauth2.googleapis.com/token",
      "revocation_endpoint": "https://oauth2.googleapis.com/revoke",
      "extra_auth_params": {"access_type": "offline", "prompt": "consent"},
      "client_id_env": "CONNECTOR_GOOGLE_CALENDAR_CLIENT_ID",
      "client_secret_env": "CONNECTOR_GOOGLE_CALENDAR_CLIENT_SECRET"
    }'::jsonb,
    array[
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.freebusy',
      'https://www.googleapis.com/auth/calendar.events.readonly'
    ],
    60
  ),
  (
    'gmail',
    'Gmail',
    'Read mail through Google''s official Gmail MCP server (developer preview).',
    'google',
    'https://gmailmcp.googleapis.com/mcp/v1',
    '{
      "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
      "token_endpoint": "https://oauth2.googleapis.com/token",
      "revocation_endpoint": "https://oauth2.googleapis.com/revoke",
      "extra_auth_params": {"access_type": "offline", "prompt": "consent"},
      "client_id_env": "CONNECTOR_GMAIL_CLIENT_ID",
      "client_secret_env": "CONNECTOR_GMAIL_CLIENT_SECRET"
    }'::jsonb,
    array['https://www.googleapis.com/auth/gmail.readonly'],
    60
  )
on conflict (slug) do nothing;
