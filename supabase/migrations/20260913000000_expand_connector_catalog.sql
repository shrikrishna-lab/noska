-- =====================================================================
-- Connector Catalog v3 — six more first-party platform connectors
--
-- Seeds connectors whose OFFICIAL hosted MCP servers accept a plain
-- bearer token (personal access token / API key) over Streamable HTTP,
-- so users connect by pasting a token — no OAuth client setup needed:
--
--   supabase   https://mcp.supabase.com/mcp        (access token)
--   cloudflare https://mcp.cloudflare.com/mcp      (API token)
--   stripe     https://mcp.stripe.com              (restricted API key)
--   linear     https://mcp.linear.app/mcp          (API key)
--   posthog    https://mcp.posthog.com/mcp         (personal API key)
--   zapier     https://mcp.zapier.com/api/v1/connect (connection token)
--
-- All endpoints + auth schemes verified against each vendor's official
-- docs (September 2026). Figma / Vercel / Sentry are intentionally NOT
-- seeded: their hosted servers are OAuth-only or use a non-Bearer
-- scheme the gateway does not speak yet.
--
-- Deploy: supabase db push
-- =====================================================================

insert into public.connectors (slug, name, description, publisher, mcp_server_url, oauth_config, default_scopes, auth_modes, call_rate_limit)
values
  (
    'supabase',
    'Supabase',
    'Manage Supabase projects, tables, and edge functions, and run read-only SQL through Supabase''s official hosted MCP server. Paste a personal access token to connect.',
    'supabase',
    'https://mcp.supabase.com/mcp',
    '{}'::jsonb,
    array[]::text[],
    array['token'],
    60
  ),
  (
    'cloudflare',
    'Cloudflare',
    'Inspect and manage Workers, KV, R2, DNS and account settings through Cloudflare''s official hosted MCP server. Paste a Cloudflare API token to connect.',
    'cloudflare',
    'https://mcp.cloudflare.com/mcp',
    '{}'::jsonb,
    array[]::text[],
    array['token'],
    60
  ),
  (
    'stripe',
    'Stripe',
    'Inspect balances, customers, payments and invoices through Stripe''s official hosted MCP server. Paste a restricted API key (recommended) to connect.',
    'stripe',
    'https://mcp.stripe.com',
    '{}'::jsonb,
    array[]::text[],
    array['token'],
    60
  ),
  (
    'linear',
    'Linear',
    'Search issues, create and update work items, and inspect projects through Linear''s official hosted MCP server. Paste a Linear API key to connect.',
    'linear',
    'https://mcp.linear.app/mcp',
    '{}'::jsonb,
    array[]::text[],
    array['token'],
    60
  ),
  (
    'posthog',
    'PostHog',
    'Query product analytics, feature flags, experiments and session replays through PostHog''s official hosted MCP server. Paste a personal API key to connect.',
    'posthog',
    'https://mcp.posthog.com/mcp',
    '{}'::jsonb,
    array[]::text[],
    array['token'],
    60
  ),
  (
    'zapier',
    'Zapier',
    'Run Zapier workflows and connect to 8,000+ apps through Zapier''s official MCP server. Paste a Zapier connection token to connect.',
    'zapier',
    'https://mcp.zapier.com/api/v1/connect',
    '{}'::jsonb,
    array[]::text[],
    array['token'],
    60
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  publisher = excluded.publisher,
  mcp_server_url = excluded.mcp_server_url,
  default_scopes = excluded.default_scopes,
  auth_modes = excluded.auth_modes,
  call_rate_limit = excluded.call_rate_limit,
  is_active = true,
  updated_at = now();
