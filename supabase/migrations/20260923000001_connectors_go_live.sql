-- =====================================================================
-- Connector Catalog v6 — six connectors go live via OAuth DCR
--
-- Activates official hosted MCP servers that all support OAuth 2.0
-- Dynamic Client Registration (RFC 7591), so "connect with login" works
-- with ZERO pre-provisioned client secrets — the gateway registers
-- itself at connect time (same pattern as catalog v4):
--
--   jira        https://mcp.atlassian.com/v2/mcp      (register …/v1/register)
--   confluence  https://mcp.atlassian.com/v2/mcp      (same Atlassian server)
--   figma       https://mcp.figma.com/mcp            (register api.figma.com/…/register)
--   gitlab      https://gitlab.com/api/v4/mcp        (register gitlab.com/oauth/register)
--   vercel      https://mcp.vercel.com               (register api.vercel.com/…/register)
--   sentry      https://mcp.sentry.dev/mcp           (register mcp.sentry.dev/oauth/register)
--
-- All endpoints + DCR support verified against each vendor's official
-- docs / OAuth metadata (September 2026). Default scopes are read-first.
--
-- Staying inactive: asana (no DCR — needs a user-registered OAuth app),
-- discord / dropbox / trello / zendesk (no official hosted MCP server).
--
-- Deploy: supabase db push (or db query --linked -f this file)
-- =====================================================================

-- ─── jira: placeholder row → live ────────────────────────────────────
update public.connectors set
  description = 'Search Jira issues, track sprints and update work items through Atlassian''s official Rovo MCP server. Connect with login.',
  publisher = 'atlassian',
  mcp_server_url = 'https://mcp.atlassian.com/v2/mcp',
  oauth_config = jsonb_build_object(
    'authorization_endpoint', 'https://mcp.atlassian.com/v1/authorize',
    'token_endpoint', 'https://mcp.atlassian.com/v1/token',
    'registration_endpoint', 'https://mcp.atlassian.com/v1/register'
  ),
  default_scopes = array['read_jira', 'search_jira', 'write_jira'],
  auth_modes = '{oauth}',
  call_rate_limit = 60,
  is_active = true,
  updated_at = now()
where slug = 'jira';

-- ─── figma: placeholder row → live ───────────────────────────────────
update public.connectors set
  description = 'Read Figma files, frames and design context through Figma''s official remote MCP server. Connect with login.',
  publisher = 'figma',
  mcp_server_url = 'https://mcp.figma.com/mcp',
  oauth_config = jsonb_build_object(
    'authorization_endpoint', 'https://www.figma.com/oauth/mcp',
    'token_endpoint', 'https://api.figma.com/v1/oauth/token',
    'registration_endpoint', 'https://api.figma.com/v1/oauth/mcp/register'
  ),
  default_scopes = array['mcp:connect'],
  auth_modes = '{oauth}',
  call_rate_limit = 60,
  is_active = true,
  updated_at = now()
where slug = 'figma';

-- ─── gitlab: placeholder row → live ──────────────────────────────────
update public.connectors set
  description = 'Browse GitLab projects, issues and merge requests through GitLab''s official MCP server. Connect with login.',
  publisher = 'gitlab',
  mcp_server_url = 'https://gitlab.com/api/v4/mcp',
  oauth_config = jsonb_build_object(
    'authorization_endpoint', 'https://gitlab.com/oauth/authorize',
    'token_endpoint', 'https://gitlab.com/oauth/token',
    'registration_endpoint', 'https://gitlab.com/oauth/register'
  ),
  default_scopes = array['mcp', 'read_api'],
  auth_modes = '{oauth}',
  call_rate_limit = 60,
  is_active = true,
  updated_at = now()
where slug = 'gitlab';

-- ─── brand-new live rows ─────────────────────────────────────────────
insert into public.connectors (slug, name, description, publisher, mcp_server_url, oauth_config, default_scopes, auth_modes, call_rate_limit, is_active)
values
  (
    'confluence',
    'Confluence',
    'Search Confluence spaces and read pages through Atlassian''s official Rovo MCP server. Connect with login.',
    'atlassian',
    'https://mcp.atlassian.com/v2/mcp',
    jsonb_build_object(
      'authorization_endpoint', 'https://mcp.atlassian.com/v1/authorize',
      'token_endpoint', 'https://mcp.atlassian.com/v1/token',
      'registration_endpoint', 'https://mcp.atlassian.com/v1/register'
    ),
    array['read_confluence', 'search_confluence', 'write_confluence'],
    array['oauth'],
    60,
    true
  ),
  (
    'vercel',
    'Vercel',
    'Inspect Vercel projects, deployments and settings through Vercel''s official MCP server. Connect with login.',
    'vercel',
    'https://mcp.vercel.com',
    jsonb_build_object(
      'authorization_endpoint', 'https://vercel.com/oauth/authorize',
      'token_endpoint', 'https://api.vercel.com/login/oauth/token',
      'registration_endpoint', 'https://api.vercel.com/login/oauth/register'
    ),
    array['openid', 'email', 'offline_access'],
    array['oauth'],
    60,
    true
  ),
  (
    'sentry',
    'Sentry',
    'Search Sentry errors, triage issues and inspect projects through Sentry''s official MCP server. Connect with login.',
    'sentry',
    'https://mcp.sentry.dev/mcp',
    jsonb_build_object(
      'authorization_endpoint', 'https://mcp.sentry.dev/oauth/authorize',
      'token_endpoint', 'https://mcp.sentry.dev/oauth/token',
      'registration_endpoint', 'https://mcp.sentry.dev/oauth/register'
    ),
    array['org:read'],
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
