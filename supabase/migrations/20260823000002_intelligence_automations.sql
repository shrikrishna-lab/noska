-- ============================================================
-- Migration: Noska Intelligence — Automations & agent config
-- 1. agents.config jsonb — permissions/context/limits/notifications
-- 2. automations table — event/schedule-driven workflows
-- 3. automation_runs table — execution history with rich detail
-- All owner-scoped under the existing RLS model (owner_id = auth.uid()).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extend agents with a config jsonb column
--    Holds PermissionSpec, context scope, execution limits and
--    notification prefs without further schema churn.
-- ------------------------------------------------------------
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------
-- 2. Automations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automations (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  workspace_id text DEFAULT '',
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '⚡',
  -- TriggerSpec: { type, scopePageId?, schedule? } ("trigger" is a reserved
  -- SQL word, so the column is trigger_config)
  trigger_config jsonb NOT NULL DEFAULT '{"type":"manual"}'::jsonb,
  conditions jsonb NOT NULL DEFAULT '{"op":"and","conditions":[]}'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY automations_select_own ON public.automations
  FOR SELECT TO authenticated USING (owner_id = (auth.uid())::text);
CREATE POLICY automations_insert_own ON public.automations
  FOR INSERT TO authenticated WITH CHECK (owner_id = (auth.uid())::text);
CREATE POLICY automations_update_own ON public.automations
  FOR UPDATE TO authenticated
  USING (owner_id = (auth.uid())::text)
  WITH CHECK (owner_id = (auth.uid())::text);
CREATE POLICY automations_delete_own ON public.automations
  FOR DELETE TO authenticated USING (owner_id = (auth.uid())::text);

-- ------------------------------------------------------------
-- 3. Automation runs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY,
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  owner_id text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  trigger_type text DEFAULT 'manual',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  steps_taken integer DEFAULT 0,
  summary text,
  error text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY automation_runs_select_own ON public.automation_runs
  FOR SELECT TO authenticated USING (owner_id = (auth.uid())::text);
CREATE POLICY automation_runs_insert_own ON public.automation_runs
  FOR INSERT TO authenticated WITH CHECK (owner_id = (auth.uid())::text);
CREATE POLICY automation_runs_update_own ON public.automation_runs
  FOR UPDATE TO authenticated
  USING (owner_id = (auth.uid())::text)
  WITH CHECK (owner_id = (auth.uid())::text);
CREATE POLICY automation_runs_delete_own ON public.automation_runs
  FOR DELETE TO authenticated USING (owner_id = (auth.uid())::text);

CREATE INDEX IF NOT EXISTS idx_automations_owner_status
  ON public.automations (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation
  ON public.automation_runs (automation_id, started_at DESC);
