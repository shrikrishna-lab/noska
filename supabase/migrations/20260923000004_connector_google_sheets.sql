-- =====================================================================
-- Connector Catalog v9 — Google Sheets gateway row (live)
--
-- Adds the official Sheets MCP server (developer preview):
-- https://sheetsmcp.googleapis.com/mcp/v1
--
-- Same pattern as the gmail / google-calendar / google-drive rows:
-- standard Google OAuth 2.0 (authorization-code + PKCE) reusing the
-- single "Noska Auth" GCP OAuth client. Requires
-- CONNECTOR_SHEETS_CLIENT_ID / CONNECTOR_SHEETS_CLIENT_SECRET env vars
-- (same client ID + secret as the other Google connectors).
--
-- Scope (least privilege covering read + write + append — the Drive
-- scopes do NOT cover spreadsheet contents):
--   https://www.googleapis.com/auth/spreadsheets
--
-- Deploy: supabase db push (or db query --linked -f this file)
-- =====================================================================

insert into public.connectors (slug, name, description, publisher, mcp_server_url, oauth_config, default_scopes, auth_modes, call_rate_limit, is_active)
values
  (
    'google-sheets',
    'Google Sheets',
    'Read, write, and append rows in Google Sheets spreadsheets through Google''s official Sheets MCP server.',
    'google',
    'https://sheetsmcp.googleapis.com/mcp/v1',
    '{
      "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
      "token_endpoint": "https://oauth2.googleapis.com/token",
      "revocation_endpoint": "https://oauth2.googleapis.com/revoke",
      "extra_auth_params": {"access_type": "offline", "prompt": "consent"},
      "client_id_env": "CONNECTOR_SHEETS_CLIENT_ID",
      "client_secret_env": "CONNECTOR_SHEETS_CLIENT_SECRET"
    }'::jsonb,
    array['https://www.googleapis.com/auth/spreadsheets'],
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
