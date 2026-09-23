-- =====================================================================
-- Connector Catalog v11 — Asana / Dropbox / Discord gateway rows (live)
--
-- Activates three "coming soon" placeholders with verified configs:
--
--   asana    Official MCP https://mcp.asana.com/v2/mcp (requires OAuth
--            with a registered client ID + secret; PKCE supported).
--            Endpoints: app.asana.com/-/oauth_authorize|token.
--            Requires CONNECTOR_ASANA_CLIENT_ID / _SECRET. Register the
--            app at console.asana.com and add this Redirect URL:
--              https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/connector-gateway/callback
--            (override per-environment with CONNECTOR_OAUTH_REDIRECT_BASE).
--            Scope "default" is what Asana's API requires.
--
--   dropbox  Official MCP https://mcp.dropbox.com/mcp (OAuth).
--            Endpoints: dropbox.com/oauth2/authorize +
--            api.dropboxapi.com/oauth2/token (Basic auth) + revoke.
--            token_access_type=offline is required, otherwise Dropbox
--            issues refresh-token-less short-lived tokens.
--            Requires CONNECTOR_DROPBOX_CLIENT_ID / _SECRET. Register at
--            dropbox.com/developers/apps with the same Redirect URI.
--
--   discord  OAuth-only activation. Discord has NO official hosted MCP
--            server (bot-token self-hosted community servers only), so
--            mcp_server_url stays '' per the coming-soon precedent:
--            OAuth connect + token storage/refresh/revoke work fully;
--            live AI tool calls need a follow-up bot-based flow, until
--            which the connector's tools report unavailable. User-OAuth
--            scopes (identify/email/guilds) cannot post messages — that
--            needs a bot token, also follow-up territory.
--            Requires CONNECTOR_DISCORD_CLIENT_ID / _SECRET. Register at
--            discord.com/developers/applications → OAuth2 with the same
--            Redirect URI.
--
-- NOT covered here (honest blockers, not config gaps):
--   trello   OAuth 1.0a only — the gateway speaks OAuth2
--            authorization-code, so one-click OAuth is impossible
--            without an OAuth1 bridge (follow-up).
--   zendesk  OAuth2 endpoints are per-customer-subdomain
--            ({sub}.zendesk.com) — a static catalog row cannot cover
--            all customers without connect-time subdomain input
--            (follow-up). API-token paste is the current path.
--
-- Safe: upserts by slug (placeholders exist inactive); idempotent.
--
-- Deploy: supabase db push (or db query --linked -f this file)
-- =====================================================================

insert into public.connectors (slug, name, description, publisher, mcp_server_url, oauth_config, default_scopes, auth_modes, call_rate_limit, is_active)
values
  (
    'asana',
    'Asana',
    'Search tasks, track projects, and manage work in Asana through Asana''s official MCP server.',
    'asana',
    'https://mcp.asana.com/v2/mcp',
    '{
      "authorization_endpoint": "https://app.asana.com/-/oauth_authorize",
      "token_endpoint": "https://app.asana.com/-/oauth_token",
      "extra_auth_params": {"prompt": "consent"},
      "client_id_env": "CONNECTOR_ASANA_CLIENT_ID",
      "client_secret_env": "CONNECTOR_ASANA_CLIENT_SECRET"
    }'::jsonb,
    array['default'],
    array['oauth'],
    60,
    true
  ),
  (
    'dropbox',
    'Dropbox',
    'Browse, search, read, and manage Dropbox files and folders through Dropbox''s official MCP server.',
    'dropbox',
    'https://mcp.dropbox.com/mcp',
    '{
      "authorization_endpoint": "https://www.dropbox.com/oauth2/authorize",
      "token_endpoint": "https://api.dropboxapi.com/oauth2/token",
      "revocation_endpoint": "https://api.dropboxapi.com/2/auth/token/revoke",
      "token_auth_style": "basic",
      "extra_auth_params": {"token_access_type": "offline"},
      "client_id_env": "CONNECTOR_DROPBOX_CLIENT_ID",
      "client_secret_env": "CONNECTOR_DROPBOX_CLIENT_SECRET"
    }'::jsonb,
    array['account_info.read', 'files.metadata.read', 'files.content.read'],
    array['oauth'],
    60,
    true
  ),
  (
    'discord',
    'Discord',
    'Connect Discord servers and identity via OAuth. (Live AI tools need a follow-up bot-based flow — see migration header.)',
    'discord',
    '',
    '{
      "authorization_endpoint": "https://discord.com/oauth2/authorize",
      "token_endpoint": "https://discord.com/api/oauth2/token",
      "revocation_endpoint": "https://discord.com/api/oauth2/token/revoke",
      "extra_auth_params": {"prompt": "consent"},
      "client_id_env": "CONNECTOR_DISCORD_CLIENT_ID",
      "client_secret_env": "CONNECTOR_DISCORD_CLIENT_SECRET"
    }'::jsonb,
    array['identify', 'email', 'guilds'],
    array['oauth'],
    60,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  publisher = excluded.publisher,
  mcp_server_url = excluded.mcp_server_url,
  oauth_config = excluded.oauth_config,
  default_scopes = excluded.default_scopes,
  auth_modes = excluded.auth_modes,
  call_rate_limit = excluded.call_rate_limit,
  is_active = true,
  updated_at = now();
