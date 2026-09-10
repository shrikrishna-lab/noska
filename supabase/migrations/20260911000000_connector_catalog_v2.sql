-- =====================================================================
-- Connector Catalog v2 — platform connections for everyone
--
-- Extends the phase-1 connector gateway with:
--   * connectors.auth_modes          — which auth flows a connector
--                                      supports: 'oauth' and/or 'token'
--                                      (user-pasted API key / PAT /
--                                      internal integration secret)
--   * user_connections.auth_mode     — how THIS connection was made
--   * user_connections.server_url_override — per-connection MCP server
--                                      URL (powers the Custom MCP Server
--                                      connector and self-hosted servers)
--   * user_connections.label         — user-chosen display label
--
-- Seeds the first-party platform connectors: Notion, GitHub, Slack
-- (joining google-calendar and gmail from phase 1) plus a Custom MCP
-- Server entry for arbitrary user-supplied Streamable-HTTP servers.
--
-- Deploy: supabase db push
-- =====================================================================

alter table public.connectors
  add column if not exists auth_modes text[] not null default '{oauth}';

alter table public.user_connections
  add column if not exists auth_mode text not null default 'oauth';

alter table public.user_connections
  add column if not exists server_url_override text;

alter table public.user_connections
  add column if not exists label text not null default '';

-- ─── Seeds: first-party platform connectors ──────────────────────────
-- Notion + GitHub also accept a user-pasted token against their hosted
-- MCP servers (internal integration secret / personal access token),
-- so users can connect without creating an OAuth client first.
-- Slack's hosted MCP is OAuth-only. Custom MCP Server has no fixed
-- URL — the gateway requires server_url on connect.

insert into public.connectors (slug, name, description, publisher, mcp_server_url, oauth_config, default_scopes, auth_modes, call_rate_limit)
values
  (
    'notion',
    'Notion',
    'Search, read and create Notion pages and databases through Notion''s official hosted MCP server. Connect with OAuth, or paste an internal integration secret.',
    'notion',
    'https://mcp.notion.com/mcp',
    '{
      "authorization_endpoint": "https://api.notion.com/v1/oauth/authorize",
      "token_endpoint": "https://api.notion.com/v1/oauth/token",
      "token_auth_style": "basic",
      "client_id_env": "CONNECTOR_NOTION_CLIENT_ID",
      "client_secret_env": "CONNECTOR_NOTION_CLIENT_SECRET"
    }'::jsonb,
    array['read:page:all', 'read:database:all', 'read:user', 'read:comment:all', 'insert:content', 'update:content'],
    array['oauth', 'token'],
    60
  ),
  (
    'github',
    'GitHub',
    'List repos, read and create issues and pull requests, and search code through GitHub''s official hosted MCP server. Connect with OAuth, or paste a personal access token.',
    'github',
    'https://api.githubcopilot.com/mcp/',
    '{
      "authorization_endpoint": "https://github.com/login/oauth/authorize",
      "token_endpoint": "https://github.com/login/oauth/access_token",
      "token_auth_style": "basic",
      "client_id_env": "CONNECTOR_GITHUB_CLIENT_ID",
      "client_secret_env": "CONNECTOR_GITHUB_CLIENT_SECRET"
    }'::jsonb,
    array['repo', 'read:org'],
    array['oauth', 'token'],
    60
  ),
  (
    'slack',
    'Slack',
    'Read channels and send messages through Slack''s official hosted MCP server (OAuth sign-in with your Slack workspace).',
    'slack',
    'https://mcp.slack.com/mcp',
    '{
      "authorization_endpoint": "https://slack.com/oauth/v2/authorize",
      "token_endpoint": "https://slack.com/api/oauth.v2.access",
      "extra_auth_params": {"user_scope": "channels:history,channels:read,chat:write,users:read,im:history"},
      "client_id_env": "CONNECTOR_SLACK_CLIENT_ID",
      "client_secret_env": "CONNECTOR_SLACK_CLIENT_SECRET"
    }'::jsonb,
    array[]::text[],
    array['oauth'],
    60
  ),
  (
    'custom-mcp',
    'Custom MCP Server',
    'Connect any Streamable-HTTP MCP server by URL — self-hosted servers, Linear, Drive, Higgsfield, WisprFlow or anything else that speaks MCP. Paste the server URL and (optionally) a bearer token.',
    'noska',
    '',
    '{}'::jsonb,
    array[]::text[],
    array['token'],
    120
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
  updated_at = now();

-- Phase-1 rows keep working: they are OAuth-only.
update public.connectors set auth_modes = '{oauth}' where slug in ('google-calendar', 'gmail') and auth_modes = '{oauth}';
