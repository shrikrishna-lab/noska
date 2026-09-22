-- =====================================================================
-- Connector Catalog v5 — coming-soon placeholders (INACTIVE)
--
-- Inserts catalog rows for the eight UI-registered providers that have
-- no verified hosted MCP server / OAuth client yet (jira, gitlab,
-- figma, asana, discord, trello, dropbox, zendesk). Linear is NOT here:
-- it is already live in the gateway (official hosted MCP + token and
-- OAuth DCR login) and was flipped to live in
-- src/lib/connections/registry.ts.
--
-- Safety:
-- * is_active = false, so the gateway catalog query (eq is_active true)
--   never serves these rows and resolveConnector() rejects them as
--   notFound. Connect / tools / callback all fail closed server-side.
-- * The settings UI independently gates coming_soon providers
--   (ConnectionsSettings handleConnect toasts "coming soon").
-- * mcp_server_url is '' (unknown — no verified official hosted MCP
--   server for these providers as of September 2026).
-- * oauth_config holds each vendor's PUBLIC OAuth2 endpoints only —
--   no secrets. client_id/secret come from env vars named here when a
--   row is eventually activated.
-- * on conflict do nothing: never touches an existing (live) row.
--
-- To take a provider live later: verify its hosted MCP server URL,
-- create the OAuth app, set the CONNECTOR_* env vars, update the row
-- (mcp_server_url, is_active = true), and flip the registry status.
--
-- Deploy: supabase db push
-- =====================================================================

insert into public.connectors (slug, name, description, publisher, mcp_server_url, oauth_config, default_scopes, auth_modes, call_rate_limit, is_active)
values
  (
    'jira',
    'Jira',
    'Coming soon — Jira issues, sprints and boards. Catalog placeholder: no verified hosted MCP server or OAuth client yet; connect is disabled until then.',
    'atlassian',
    '',
    '{
      "authorization_endpoint": "https://auth.atlassian.com/authorize",
      "token_endpoint": "https://auth.atlassian.com/oauth/token",
      "token_auth_style": "basic",
      "client_id_env": "CONNECTOR_JIRA_CLIENT_ID",
      "client_secret_env": "CONNECTOR_JIRA_CLIENT_SECRET"
    }'::jsonb,
    array['read:jira-work', 'read:jira-user', 'offline_access'],
    array['oauth', 'token'],
    60,
    false
  ),
  (
    'gitlab',
    'GitLab',
    'Coming soon — GitLab merge requests, issues and pipelines. Catalog placeholder: no verified hosted MCP server or OAuth client yet; connect is disabled until then.',
    'gitlab',
    '',
    '{
      "authorization_endpoint": "https://gitlab.com/oauth/authorize",
      "token_endpoint": "https://gitlab.com/oauth/token",
      "token_auth_style": "basic",
      "client_id_env": "CONNECTOR_GITLAB_CLIENT_ID",
      "client_secret_env": "CONNECTOR_GITLAB_CLIENT_SECRET"
    }'::jsonb,
    array['read_api', 'read_user'],
    array['oauth', 'token'],
    60,
    false
  ),
  (
    'figma',
    'Figma',
    'Coming soon — Figma files and frames via OAuth. Catalog placeholder: Figma''s hosted server is OAuth-only with a scheme the gateway does not speak yet; connect is disabled until then.',
    'figma',
    '',
    '{
      "authorization_endpoint": "https://www.figma.com/oauth",
      "token_endpoint": "https://www.figma.com/api/oauth/token",
      "client_id_env": "CONNECTOR_FIGMA_CLIENT_ID",
      "client_secret_env": "CONNECTOR_FIGMA_CLIENT_SECRET"
    }'::jsonb,
    array['file_read'],
    array['oauth', 'token'],
    60,
    false
  ),
  (
    'asana',
    'Asana',
    'Coming soon — Asana tasks, projects and portfolios. Catalog placeholder: no verified hosted MCP server or OAuth client yet; connect is disabled until then.',
    'asana',
    '',
    '{
      "authorization_endpoint": "https://app.asana.com/-/oauth_authorize",
      "token_endpoint": "https://app.asana.com/-/oauth_token",
      "client_id_env": "CONNECTOR_ASANA_CLIENT_ID",
      "client_secret_env": "CONNECTOR_ASANA_CLIENT_SECRET"
    }'::jsonb,
    array[]::text[],
    array['oauth', 'token'],
    60,
    false
  ),
  (
    'discord',
    'Discord',
    'Coming soon — Discord servers and channels via OAuth. Catalog placeholder: no verified hosted MCP server or OAuth client yet; connect is disabled until then.',
    'discord',
    '',
    '{
      "authorization_endpoint": "https://discord.com/oauth2/authorize",
      "token_endpoint": "https://discord.com/api/oauth2/token",
      "client_id_env": "CONNECTOR_DISCORD_CLIENT_ID",
      "client_secret_env": "CONNECTOR_DISCORD_CLIENT_SECRET"
    }'::jsonb,
    array['identify', 'guilds'],
    array['oauth'],
    60,
    false
  ),
  (
    'trello',
    'Trello',
    'Coming soon — Trello boards, cards and checklists. Catalog placeholder: Trello uses OAuth 1.0a + API key/token (not the gateway OAuth2 code flow); connect is disabled until then.',
    'trello',
    '',
    '{
      "authorization_endpoint": "https://trello.com/1/OAuthAuthorizeToken",
      "request_token_endpoint": "https://trello.com/1/OAuthGetRequestToken",
      "access_token_endpoint": "https://trello.com/1/OAuthGetAccessToken",
      "oauth_version": "1.0a",
      "client_id_env": "CONNECTOR_TRELLO_API_KEY",
      "client_secret_env": "CONNECTOR_TRELLO_TOKEN"
    }'::jsonb,
    array[]::text[],
    array['oauth', 'token'],
    60,
    false
  ),
  (
    'dropbox',
    'Dropbox',
    'Coming soon — Dropbox files and shared folders via OAuth. Catalog placeholder: no verified hosted MCP server or OAuth client yet; connect is disabled until then.',
    'dropbox',
    '',
    '{
      "authorization_endpoint": "https://www.dropbox.com/oauth2/authorize",
      "token_endpoint": "https://api.dropboxapi.com/oauth2/token",
      "client_id_env": "CONNECTOR_DROPBOX_CLIENT_ID",
      "client_secret_env": "CONNECTOR_DROPBOX_CLIENT_SECRET"
    }'::jsonb,
    array[]::text[],
    array['oauth', 'token'],
    60,
    false
  ),
  (
    'zendesk',
    'Zendesk',
    'Coming soon — Zendesk tickets and help-center articles. Catalog placeholder: endpoints are per-subdomain and no OAuth client exists yet; connect is disabled until then.',
    'zendesk',
    '',
    '{
      "authorization_endpoint": "https://{subdomain}.zendesk.com/oauth/authorizations/new",
      "token_endpoint": "https://{subdomain}.zendesk.com/oauth/tokens",
      "subdomain_required": true,
      "client_id_env": "CONNECTOR_ZENDESK_CLIENT_ID",
      "client_secret_env": "CONNECTOR_ZENDESK_CLIENT_SECRET"
    }'::jsonb,
    array['read'],
    array['oauth', 'token'],
    60,
    false
  )
on conflict (slug) do nothing;
