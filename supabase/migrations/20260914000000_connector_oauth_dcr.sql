-- =====================================================================
-- Connector Catalog v4 — OAuth ("connect with login") via dynamic
-- client registration for the six bearer-token connectors.
--
-- All six platforms advertise an OAuth registration_endpoint (RFC 7591),
-- so the connector gateway registers itself at connect time and persists
-- the issued client inside oauth_config (dcr_client_id / dcr_client_secret
-- / dcr_redirect_uris) — no pre-provisioned client secrets required.
-- Endpoints fetched live from each provider's authorization-server
-- metadata (September 2026).
--
-- Token/API-key connect stays available: auth_modes becomes
-- '{oauth, token}' so the UI offers "Connect" (login) AND "Connect Key".
--
-- Deploy: supabase db push
-- =====================================================================

update public.connectors set
  auth_modes = '{oauth, token}',
  default_scopes = array['organizations:read', 'projects:read', 'database:read', 'database:write', 'edge_functions:read'],
  oauth_config = jsonb_build_object(
    'authorization_endpoint', 'https://api.supabase.com/v1/oauth/authorize',
    'token_endpoint', 'https://api.supabase.com/v1/oauth/token',
    'registration_endpoint', 'https://api.supabase.com/platform/oauth/apps/register'
  )
where slug = 'supabase';

update public.connectors set
  auth_modes = '{oauth, token}',
  default_scopes = array['read', 'write', 'openid', 'email'],
  oauth_config = jsonb_build_object(
    'authorization_endpoint', 'https://mcp.linear.app/authorize',
    'token_endpoint', 'https://mcp.linear.app/token',
    'registration_endpoint', 'https://mcp.linear.app/register'
  )
where slug = 'linear';

update public.connectors set
  auth_modes = '{oauth, token}',
  default_scopes = array[]::text[],
  oauth_config = jsonb_build_object(
    'authorization_endpoint', 'https://mcp.cloudflare.com/authorize',
    'token_endpoint', 'https://mcp.cloudflare.com/token',
    'registration_endpoint', 'https://mcp.cloudflare.com/register'
  )
where slug = 'cloudflare';

update public.connectors set
  auth_modes = '{oauth, token}',
  default_scopes = array[]::text[],
  oauth_config = jsonb_build_object(
    'authorization_endpoint', 'https://access.stripe.com/mcp/oauth2/authorize',
    'token_endpoint', 'https://access.stripe.com/mcp/oauth2/token',
    'registration_endpoint', 'https://access.stripe.com/mcp/oauth2/register'
  )
where slug = 'stripe';

update public.connectors set
  auth_modes = '{oauth, token}',
  default_scopes = array[]::text[],
  oauth_config = jsonb_build_object(
    'authorization_endpoint', 'https://oauth.posthog.com/oauth/authorize/',
    'token_endpoint', 'https://oauth.posthog.com/oauth/token/',
    'registration_endpoint', 'https://oauth.posthog.com/oauth/register/'
  )
where slug = 'posthog';

update public.connectors set
  auth_modes = '{oauth, token}',
  default_scopes = array['openid', 'profile', 'email'],
  oauth_config = jsonb_build_object(
    'authorization_endpoint', 'https://mcp.zapier.com/oauth/authorize',
    'token_endpoint', 'https://mcp.zapier.com/api/v1/oauth/token',
    'registration_endpoint', 'https://mcp.zapier.com/api/v1/oauth/register'
  )
where slug = 'zapier';

-- Registered dynamic clients persist their credentials in oauth_config;
-- clear any stale ones so a re-deploy re-registers cleanly.
update public.connectors set oauth_config = oauth_config
  - 'dcr_client_id' - 'dcr_client_secret' - 'dcr_redirect_uris' - 'dcr_token_auth_method'
where slug in ('supabase', 'linear', 'cloudflare', 'stripe', 'posthog', 'zapier')
  and oauth_config ? 'dcr_client_id';
