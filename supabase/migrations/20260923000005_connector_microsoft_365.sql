-- =====================================================================
-- Connector Catalog v10 — Microsoft 365 gateway row (live)
--
-- Adds the Microsoft 365 connector (Outlook mail, OneDrive, SharePoint,
-- Teams, Outlook Calendar) matching the existing microsoft-365 ecosystem
-- definition in src/lib/connections/ecosystemRegistry.ts. Without this
-- row the UI's Connect button fails with "missing OAuth client
-- credentials".
--
-- Auth: standard Microsoft identity platform OAuth 2.0
-- (authorization-code + PKCE) on the multi-tenant "common" endpoint, so
-- both personal Outlook and work/school accounts can connect. There is
-- NO dynamic client registration for Microsoft: requires manually
-- created Entra app credentials
--   CONNECTOR_MICROSOFT_CLIENT_ID / CONNECTOR_MICROSOFT_CLIENT_SECRET
-- Register the Entra app ( app registrations → New registration →
-- "Accounts in any organizational directory and personal Microsoft
-- accounts"), add this Redirect URI (Web):
--   https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/connector-gateway/callback
-- (override per-environment with CONNECTOR_OAUTH_REDIRECT_BASE), and
-- grant the Graph scopes listed in default_scopes below
-- (admin consent only needed for organization-wide grants; delegated
-- user consent suffices for personal use).
--
-- Scopes: union of every requiredScopes entry in the ecosystem
-- definition, so enabling any service later never hits a missing-grant.
--
-- NOTE on mcp_server_url: Microsoft's official MCP servers (Work IQ /
-- Agent 365) are tenant-scoped
-- (https://agent365.svc.cloud.microsoft/agents/tenants/{tenant_id}/…)
-- so no static universal MCP URL exists. The Graph base URL below is a
-- placeholder: OAuth connect, token storage/refresh, and revoke work
-- fully (none touch the MCP server); live AI tool calls over this
-- connection need a follow-up tenant-aware Graph bridge, until which
-- the connector's tools report unavailable instead of failing silently.
--
-- Safe: brand-new slug, no live connection affected (upsert is
-- idempotent via on conflict).
--
-- Deploy: supabase db push (or db query --linked -f this file)
-- =====================================================================

insert into public.connectors (slug, name, description, publisher, mcp_server_url, oauth_config, default_scopes, auth_modes, call_rate_limit, is_active)
values
  (
    'microsoft-365',
    'Microsoft 365',
    'Connect Outlook mail, OneDrive files, SharePoint sites, Teams channels, and Outlook Calendar through Microsoft Graph.',
    'microsoft',
    'https://graph.microsoft.com/v1.0',
    '{
      "authorization_endpoint": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      "token_endpoint": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      "token_auth_style": "basic",
      "extra_auth_params": {"prompt": "consent"},
      "client_id_env": "CONNECTOR_MICROSOFT_CLIENT_ID",
      "client_secret_env": "CONNECTOR_MICROSOFT_CLIENT_SECRET"
    }'::jsonb,
    array[
      'User.Read',
      'Mail.Read',
      'Mail.Send',
      'Files.Read.All',
      'Files.ReadWrite',
      'Sites.Read.All',
      'Calendars.Read',
      'Calendars.ReadWrite',
      'ChannelMessage.Read.All',
      'ChatMessage.Send',
      'offline_access'
    ],
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
