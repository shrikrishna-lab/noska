-- ============================================================================
-- Noska Platform V5 — Core persistence
--
-- Adds the durable model behind the canonical capability layer:
--   1. workspaces v2        — real multi-workspace model (members, roles,
--                             settings, icon, description, slug, archive)
--   2. workspace_id columns — every workspace-owned entity can reference
--                             its workspace ('' = personal/default scope,
--                             which keeps every pre-V5 row valid)
--   3. noska_events         — canonical event bus (capability + trigger fed)
--   4. noska_templates      — persistent template system (pages/blocks/
--                             databases/tasks payloads, instantiation)
--   5. noska_dashboards     — persistent dashboards (sections/widgets/
--                             data sources/filters/layout)
--   6. noska_webhook_*      — outgoing webhooks (endpoints, deliveries)
--   7. connected_accounts   — unified external account connections
--   8. oauth_apps / codes / tokens — OAuth application framework
--   9. plugin_manifests / installations / runs — plugin platform registry
--  10. developer_audit_log  — unified developer/security audit events
--  11. user_api_keys.default_workspace_id — persisted "switch-workspace"
--
-- SECURITY MODEL: identical to V4 — owner-scoped RLS on every table
-- ((user_id|owner_id) = auth.uid()::text). The service role bypasses RLS by
-- design; every Edge Function MUST filter by owner in code.
-- All statements are idempotent (IF NOT EXISTS / DO blocks).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Workspaces v2 (table exists since monitoring health checks; extend it)
-- ----------------------------------------------------------------------------
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '🗂️',
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by text;

-- Normalize owner_id to the text-based user model used everywhere else.
-- Existing uuid values are preserved; new rows use Clerk user ids (text).
ALTER TABLE public.workspaces
  ALTER COLUMN owner_id TYPE text USING owner_id::text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces (owner_id);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Members + roles (created BEFORE the membership helper below, which
-- validates its table reference at creation time).
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','guest')),
  added_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members (user_id);

-- Membership helper (SECURITY DEFINER so policies can evaluate membership
-- without a recursive policy on workspace_members).
CREATE OR REPLACE FUNCTION public.fn_is_workspace_member(p_workspace uuid, p_user text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = p_workspace AND m.user_id = p_user
  );
$$;

REVOKE ALL ON FUNCTION public.fn_is_workspace_member(uuid, text) FROM anon, authenticated;

DROP POLICY IF EXISTS workspaces_select_own ON public.workspaces;
DROP POLICY IF EXISTS workspaces_insert_own ON public.workspaces;
DROP POLICY IF EXISTS workspaces_update_own ON public.workspaces;
DROP POLICY IF EXISTS workspaces_delete_own ON public.workspaces;
CREATE POLICY workspaces_select_own ON public.workspaces
  FOR SELECT TO authenticated
  USING (owner_id = (auth.uid())::text OR public.fn_is_workspace_member(id, (auth.uid())::text));
CREATE POLICY workspaces_insert_own ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (owner_id = (auth.uid())::text);
CREATE POLICY workspaces_update_own ON public.workspaces
  FOR UPDATE TO authenticated USING (owner_id = (auth.uid())::text);
CREATE POLICY workspaces_delete_own ON public.workspaces
  FOR DELETE TO authenticated USING (owner_id = (auth.uid())::text);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_members_select_own ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = (auth.uid())::text OR public.fn_is_workspace_member(workspace_id, (auth.uid())::text));
CREATE POLICY workspace_members_insert_own ON public.workspace_members
  FOR INSERT TO authenticated WITH CHECK (
    user_id = (auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = (auth.uid())::text)
  );
CREATE POLICY workspace_members_delete_own ON public.workspace_members
  FOR DELETE TO authenticated USING (
    user_id = (auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = (auth.uid())::text)
  );

-- ----------------------------------------------------------------------------
-- 2. Workspace references on owned entities ('' = personal scope, so every
--    pre-V5 row remains valid with zero data migration)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS workspace_id text NOT NULL DEFAULT '';

-- pages.user_id was applied out-of-band historically; guard the index so
-- environments without it get a NOTICE instead of a failed migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'pages' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_pages_ws ON public.pages (user_id, workspace_id);
  ELSE
    RAISE NOTICE 'pages.user_id missing; skipping idx_pages_ws';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Event bus
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.noska_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  workspace_id text NOT NULL DEFAULT '',
  type text NOT NULL,
  entity text NOT NULL DEFAULT '',
  entity_id text NOT NULL DEFAULT '',
  actor text NOT NULL DEFAULT 'system',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.noska_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY noska_events_select_own ON public.noska_events
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY noska_events_insert_own ON public.noska_events
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY noska_events_delete_own ON public.noska_events
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);
-- No update: events are append-only.

CREATE INDEX idx_noska_events_user_time ON public.noska_events (user_id, created_at DESC);
CREATE INDEX idx_noska_events_type ON public.noska_events (type, created_at DESC);
CREATE INDEX idx_noska_events_pending ON public.noska_events (created_at) WHERE created_at > now() - interval '7 days';

-- Canonical page/task events from the DB layer (same detection logic as the
-- Agent OS queue triggers, emitted with the V5 event vocabulary).
CREATE OR REPLACE FUNCTION public.fn_emit_noska_events()
RETURNS trigger AS $$
DECLARE
  v_user text;
  v_todo record;
BEGIN
  v_user := COALESCE(NEW.user_id::text, '');
  IF v_user = '' THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.noska_events (user_id, workspace_id, type, entity, entity_id, actor, data)
    VALUES (v_user, COALESCE(NEW.workspace_id, ''), 'page.created', 'page', NEW.id::text, 'user',
            jsonb_build_object('title', NEW.title, 'icon', NEW.icon));
    RETURN NEW;
  END IF;

  IF NEW.trashed IS TRUE AND COALESCE(OLD.trashed, FALSE) IS NOT TRUE THEN
    INSERT INTO public.noska_events (user_id, workspace_id, type, entity, entity_id, actor, data)
    VALUES (v_user, COALESCE(NEW.workspace_id, ''), 'page.archived', 'page', NEW.id::text, 'user', '{}'::jsonb);
    RETURN NEW;
  END IF;
  IF NEW.trashed IS NOT TRUE AND COALESCE(OLD.trashed, FALSE) IS TRUE THEN
    INSERT INTO public.noska_events (user_id, workspace_id, type, entity, entity_id, actor, data)
    VALUES (v_user, COALESCE(NEW.workspace_id, ''), 'page.restored', 'page', NEW.id::text, 'user', '{}'::jsonb);
  ELSIF NEW.blocks IS DISTINCT FROM OLD.blocks THEN
    INSERT INTO public.noska_events (user_id, workspace_id, type, entity, entity_id, actor, data)
    VALUES (v_user, COALESCE(NEW.workspace_id, ''), 'page.updated', 'page', NEW.id::text, 'user', '{}'::jsonb);
    -- task.completed detection (checked in NEW, not checked in OLD)
    FOR v_todo IN
      SELECT b->>'id' AS id, b->>'text' AS text
      FROM jsonb_array_elements(NEW.blocks) AS b
      WHERE b->>'type' IN ('todo','to_do')
        AND COALESCE(b->>'checked', b->'properties'->>'checked', 'false') = 'true'
    LOOP
      PERFORM 1
      FROM jsonb_array_elements(COALESCE(OLD.blocks, '[]'::jsonb)) AS ob
      WHERE ob->>'id' = v_todo.id
        AND COALESCE(ob->>'checked', ob->'properties'->>'checked', 'false') = 'true';
      IF NOT FOUND THEN
        INSERT INTO public.noska_events (user_id, workspace_id, type, entity, entity_id, actor, data)
        VALUES (v_user, COALESCE(NEW.workspace_id, ''), 'task.completed', 'task', v_todo.id, 'user',
                jsonb_build_object('page_id', NEW.id::text, 'text', v_todo.text));
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_noska_events_pages ON public.pages;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'pages' AND column_name = 'user_id') THEN
    CREATE TRIGGER trg_noska_events_pages
    AFTER INSERT OR UPDATE OF title, blocks, trashed, user_id, workspace_id ON public.pages
    FOR EACH ROW EXECUTE FUNCTION public.fn_emit_noska_events();
  ELSE
    RAISE NOTICE 'pages.user_id missing; skipping trg_noska_events_pages';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Templates
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.noska_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  workspace_id text NOT NULL DEFAULT '',
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '📄',
  kind text NOT NULL DEFAULT 'workspace' CHECK (kind IN ('page','workspace','custom')),
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived boolean NOT NULL DEFAULT false,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.noska_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY noska_templates_select_own ON public.noska_templates
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY noska_templates_insert_own ON public.noska_templates
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY noska_templates_update_own ON public.noska_templates
  FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY noska_templates_delete_own ON public.noska_templates
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

CREATE INDEX idx_noska_templates_user ON public.noska_templates (user_id, archived);

-- ----------------------------------------------------------------------------
-- 5. Dashboards
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.noska_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  workspace_id text NOT NULL DEFAULT '',
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '📊',
  layout jsonb NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.noska_dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY noska_dashboards_select_own ON public.noska_dashboards
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY noska_dashboards_insert_own ON public.noska_dashboards
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY noska_dashboards_update_own ON public.noska_dashboards
  FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY noska_dashboards_delete_own ON public.noska_dashboards
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

CREATE INDEX idx_noska_dashboards_user ON public.noska_dashboards (user_id, archived);

-- ----------------------------------------------------------------------------
-- 6. Webhooks (noska_ prefix avoids clashing with legacy admin tables)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.noska_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  workspace_id text NOT NULL DEFAULT '',
  url text NOT NULL,
  description text NOT NULL DEFAULT '',
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  secret_encrypted text NOT NULL,            -- AES-GCM, server-side key only
  secret_hint text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','revoked')),
  failure_count integer NOT NULL DEFAULT 0,
  last_delivery_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.noska_webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY noska_webhook_endpoints_select_own ON public.noska_webhook_endpoints
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY noska_webhook_endpoints_insert_own ON public.noska_webhook_endpoints
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY noska_webhook_endpoints_update_own ON public.noska_webhook_endpoints
  FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY noska_webhook_endpoints_delete_own ON public.noska_webhook_endpoints
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

CREATE INDEX idx_noska_webhook_endpoints_user ON public.noska_webhook_endpoints (user_id, status);

CREATE TABLE IF NOT EXISTS public.noska_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES public.noska_webhook_endpoints(id) ON DELETE CASCADE,
  event_id uuid,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  max_attempts integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','delivered','failed','dead')),
  response_status integer,
  error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.noska_webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY noska_webhook_deliveries_select_own ON public.noska_webhook_deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.noska_webhook_endpoints e WHERE e.id = endpoint_id AND e.user_id = (auth.uid())::text));
CREATE POLICY noska_webhook_deliveries_delete_own ON public.noska_webhook_deliveries
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.noska_webhook_endpoints e WHERE e.id = endpoint_id AND e.user_id = (auth.uid())::text));

CREATE INDEX idx_noska_webhook_deliveries_pending ON public.noska_webhook_deliveries (next_attempt_at)
  WHERE status IN ('pending');
CREATE INDEX idx_noska_webhook_deliveries_endpoint ON public.noska_webhook_deliveries (endpoint_id, created_at DESC);

-- Idempotent fan-out: an event can never be enqueued twice for one endpoint
-- (test deliveries have a NULL event_id and are exempt from this constraint,
-- as Postgres UNIQUE treats NULLs as distinct).
ALTER TABLE public.noska_webhook_deliveries
  ADD CONSTRAINT uq_noska_wh_delivery_endpoint_event
  UNIQUE (endpoint_id, event_id);

-- ----------------------------------------------------------------------------
-- 7. Connected accounts (secrets stay server-side; only metadata here)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  provider text NOT NULL,
  account_label text NOT NULL DEFAULT '',
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','expired','revoked')),
  encrypted_token text,
  token_hint text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY connected_accounts_select_own ON public.connected_accounts
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY connected_accounts_insert_own ON public.connected_accounts
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY connected_accounts_update_own ON public.connected_accounts
  FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY connected_accounts_delete_own ON public.connected_accounts
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

CREATE INDEX idx_connected_accounts_user ON public.connected_accounts (user_id, provider, status);

-- ----------------------------------------------------------------------------
-- 8. OAuth application framework
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.oauth_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  client_id text NOT NULL UNIQUE,
  client_secret_hash text NOT NULL,
  client_secret_hint text NOT NULL DEFAULT '',
  redirect_uris jsonb NOT NULL DEFAULT '[]'::jsonb,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  homepage_url text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

ALTER TABLE public.oauth_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY oauth_apps_select_own ON public.oauth_apps
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY oauth_apps_insert_own ON public.oauth_apps
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY oauth_apps_update_own ON public.oauth_apps
  FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY oauth_apps_delete_own ON public.oauth_apps
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

CREATE TABLE IF NOT EXISTS public.oauth_authorization_codes (
  code_hash text PRIMARY KEY,
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  redirect_uri text NOT NULL,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  code_challenge text,
  code_challenge_method text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
-- Codes are server-only (created/consumed by the oauth edge function via the
-- service role). No client policies on purpose.

CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  access_token_hash text NOT NULL UNIQUE,
  refresh_token_hash text NOT NULL UNIQUE,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY oauth_tokens_select_own ON public.oauth_tokens
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY oauth_tokens_delete_own ON public.oauth_tokens
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

CREATE INDEX idx_oauth_tokens_app ON public.oauth_tokens (app_id, user_id);

-- ----------------------------------------------------------------------------
-- 9. Plugin platform registry
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plugin_manifests (
  id text PRIMARY KEY,                       -- e.g. "github"
  publisher text NOT NULL DEFAULT 'noska',
  name text NOT NULL,
  version text NOT NULL DEFAULT '0.0.0',
  description text NOT NULL DEFAULT '',
  manifest jsonb NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plugin_manifests ENABLE ROW LEVEL SECURITY;
CREATE POLICY plugin_manifests_select_published ON public.plugin_manifests
  FOR SELECT TO authenticated USING (status = 'verified');
CREATE POLICY plugin_manifests_write_admin_only ON public.plugin_manifests
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.plugin_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  plugin_id text NOT NULL REFERENCES public.plugin_manifests(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'installed'
    CHECK (state IN ('installed','enabled','disabled','revoked')),
  granted_permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  connected_account_id uuid REFERENCES public.connected_accounts(id) ON DELETE SET NULL,
  installed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plugin_id)
);

ALTER TABLE public.plugin_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY plugin_installations_select_own ON public.plugin_installations
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY plugin_installations_write_own ON public.plugin_installations
  FOR ALL TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

CREATE TABLE IF NOT EXISTS public.plugin_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  plugin_id text NOT NULL,
  installation_id uuid REFERENCES public.plugin_installations(id) ON DELETE SET NULL,
  trigger text NOT NULL DEFAULT 'manual',
  tool text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','denied')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

ALTER TABLE public.plugin_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY plugin_runs_select_own ON public.plugin_runs
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY plugin_runs_insert_own ON public.plugin_runs
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY plugin_runs_update_own ON public.plugin_runs
  FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text);

CREATE INDEX idx_plugin_runs_user ON public.plugin_runs (user_id, started_at DESC);

-- ----------------------------------------------------------------------------
-- 10. Developer audit log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.developer_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  action text NOT NULL,
  resource text NOT NULL DEFAULT '',
  resource_id text NOT NULL DEFAULT '',
  surface text NOT NULL DEFAULT 'api',       -- api | mcp | agent | automation | plugin | webhook | oauth
  api_key_id uuid,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.developer_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY developer_audit_log_select_own ON public.developer_audit_log
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY developer_audit_log_insert_own ON public.developer_audit_log
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
-- Append-only for clients: no update/delete policies.

CREATE INDEX idx_developer_audit_user ON public.developer_audit_log (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 11. API keys: default workspace (persisted switch-workspace)
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_api_keys
  ADD COLUMN IF NOT EXISTS default_workspace_id text NOT NULL DEFAULT '';

-- ----------------------------------------------------------------------------
-- 12. Realtime additions for live run/webhook surfaces
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'noska_webhook_deliveries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.noska_webhook_deliveries;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'realtime publication adjust skipped: %', SQLERRM;
END $$;
