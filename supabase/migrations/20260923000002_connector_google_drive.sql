-- =====================================================================
-- Connector Catalog v7 — Google Drive gateway row (fixes broken-live UI)
--
-- The settings registry already advertises google-drive as live, but no
-- gateway row existed, so Connect failed server-side with notFound.
-- Adds the official Drive MCP server (developer preview):
-- https://drivemcp.googleapis.com/mcp/v1
--
-- Same pattern as the gmail / google-calendar rows: standard Google
-- OAuth 2.0 (authorization-code + PKCE) with a single GCP OAuth client.
-- Requires CONNECTOR_GOOGLE_DRIVE_CLIENT_ID / _SECRET env vars —
-- same action already needed for gmail and google-calendar.
--
-- Deploy: supabase db push (or db query --linked -f this file)
-- =====================================================================

insert into public.connectors (slug, name, description, publisher, mcp_server_url, oauth_config, default_scopes, auth_modes, call_rate_limit, is_active)
values
  (
    'google-drive',
    'Google Drive',
    'Browse, preview, and embed Google Docs, Sheets, Slides, and Drive files through Google''s official Drive MCP server.',
    'google',
    'https://drivemcp.googleapis.com/mcp/v1',
    '{
      "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
      "token_endpoint": "https://oauth2.googleapis.com/token",
      "revocation_endpoint": "https://oauth2.googleapis.com/revoke",
      "extra_auth_params": {"access_type": "offline", "prompt": "consent"},
      "client_id_env": "CONNECTOR_GOOGLE_DRIVE_CLIENT_ID",
      "client_secret_env": "CONNECTOR_GOOGLE_DRIVE_CLIENT_SECRET"
    }'::jsonb,
    array['https://www.googleapis.com/auth/drive.readonly'],
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
