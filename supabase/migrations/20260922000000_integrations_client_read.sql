-- =====================================================================
-- Integrations table — client read access + catalog sync
--
-- The integrations table already exists (platform product config used by
-- the admin Integrations page and the Integrations Hub widget) but its
-- only RLS policy is integrations_rpc_only (service_role). Authenticated
-- clients therefore always received "permission denied", so the widget
-- degraded to the connect prompt even when rows existed.
--
-- Product config (name/status/category/last_sync_at) is not secret —
-- grant authenticated SELECT. Writes stay RPC / service-role only.
--
-- Also seeds any missing first-party connector rows so the catalog
-- matches the live connectors table (Gmail, Slack, Notion, Linear, …).
-- =====================================================================

-- Allow authenticated users to read product integration config.
drop policy if exists integrations_select_authenticated on public.integrations;
create policy integrations_select_authenticated
  on public.integrations
  for select
  to authenticated
  using (true);

-- Keep the service-role RPC policy for writes (no-op if already present).
-- (integrations_rpc_only remains as-is for non-SELECT commands.)

-- ─── Sync missing rows from the live connector catalog ───────────────
-- Maps connector slug → product category used by the admin UI.
insert into public.integrations (name, description, category, status)
select
  c.name,
  left(coalesce(nullif(c.description, ''), 'Connected via the connector gateway'), 280),
  case c.slug
    when 'github' then 'auth'
    when 'gmail' then 'auth'
    when 'google-calendar' then 'auth'
    when 'slack' then 'auth'
    when 'notion' then 'auth'
    when 'linear' then 'auth'
    when 'stripe' then 'billing'
    when 'posthog' then 'analytics'
    when 'supabase' then 'auth'
    when 'cloudflare' then 'deployment'
    when 'zapier' then 'ai'
    else 'auth'
  end,
  case when c.is_active then 'connected' else 'disconnected' end
from public.connectors c
where c.is_active
  and not exists (
    select 1 from public.integrations i
    where lower(i.name) = lower(c.name)
  );

-- Touch last_sync_at on rows that have never synced so the admin UI
-- shows a real timestamp instead of "Never" for live catalog entries.
update public.integrations i
set last_sync_at = now()
where i.last_sync_at is null
  and exists (
    select 1 from public.connectors c
    where lower(c.name) = lower(i.name) and c.is_active
  );

-- ─── Figma widget is a pure URL embed — clear the unsatisfiable gate ──
-- (figma has no gateway catalog row; required_integration='figma' could
-- never be satisfied. The embed needs no OAuth.)
update public.widget_catalog
set required_integration = null,
    version = '2.1.0'
where id = 'figma-preview'
  and required_integration is distinct from null;
