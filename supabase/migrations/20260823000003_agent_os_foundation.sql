-- ============================================================================
-- Migration: Noska Agent OS — durable runs, execution events, scoped memory
-- Phase A foundation:
--   1. agent_runs          — unified durable execution records (agent/automation/ai)
--   2. agent_run_events    — append-only execution trace per run
--   3. agent_memories      — scoped, bounded persistent memory
--   4. agent_execution_settings — opt-in encrypted BYOK for background runs
--   5. agent_event_queue   — server-side event triggers (populated by DB triggers)
--   6. automations columns — timezone, next_run_at, retries, health, missed-run policy
--   7. Realtime for runs/events, RLS owner-scoped everywhere, indexes.
--
-- SECURITY MODEL: all tables are owner-scoped (user_id = auth.uid()). The
-- server executor runs with the service role and MUST filter by user_id in
-- code — service-role writes bypass RLS by design, mirroring api-v1/mcp.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. agent_runs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  workspace_id text DEFAULT '',
  -- 'agent' | 'automation' | 'ai'
  source_kind text NOT NULL CHECK (source_kind IN ('agent','automation','ai')),
  -- agents.id / automations.id / 'noska-ai'
  source_id text NOT NULL,
  name text DEFAULT '',
  trigger_type text NOT NULL DEFAULT 'manual',
  trigger_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued','running','waiting_approval','waiting_retry',
    'completed','failed','cancelled','skipped','timed_out')),
  -- Deterministic dedup: e.g. '<automationId>:<scheduledForISO>'
  idempotency_key text UNIQUE,
  scheduled_for timestamptz,
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  max_retries integer NOT NULL DEFAULT 2,
  next_retry_at timestamptz,
  timeout_ms integer NOT NULL DEFAULT 180000,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  error_code text,
  error_message text,
  final_output text,
  -- Resume support: declarative plan + vars + cursor so a paused background
  -- run can continue after approval without the originating browser.
  plan_snapshot jsonb,
  vars jsonb,
  next_step_index integer NOT NULL DEFAULT 0,
  pending_approval jsonb,
  counts jsonb NOT NULL DEFAULT '{"modelCalls":0,"toolCalls":0,"delegations":0,"memoryWrites":0}'::jsonb,
  -- Delegation hierarchy
  parent_run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  -- Failure grouping / notification suppression
  failure_streak integer NOT NULL DEFAULT 0,
  failure_notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_runs_select_own ON public.agent_runs
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY agent_runs_insert_own ON public.agent_runs
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY agent_runs_update_own ON public.agent_runs
  FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY agent_runs_delete_own ON public.agent_runs
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

CREATE INDEX idx_agent_runs_user_started ON public.agent_runs (user_id, started_at DESC);
CREATE INDEX idx_agent_runs_source ON public.agent_runs (source_kind, source_id, started_at DESC);
CREATE INDEX idx_agent_runs_status ON public.agent_runs (status);
CREATE INDEX idx_agent_runs_parent ON public.agent_runs (parent_run_id);

-- ----------------------------------------------------------------------------
-- 2. agent_run_events (append-only trace)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  seq integer NOT NULL DEFAULT 0,
  -- RUN_STARTED | TRIGGER_RECEIVED | CONTEXT_LOADED | MEMORY_SEARCH |
  -- MEMORY_FOUND | TOOL_REQUESTED | TOOL_APPROVAL_REQUIRED | TOOL_APPROVED |
  -- TOOL_COMPLETED | TOOL_SKIPPED | TOOL_FAILED | MODEL_REQUEST |
  -- MODEL_RESPONSE | AGENT_DELEGATED | CHILD_RUN_LINKED | RETRY_STARTED |
  -- APPROVAL_REQUESTED | APPROVAL_RESOLVED | RUN_COMPLETED | RUN_FAILED |
  -- RUN_TIMED_OUT | RUN_CANCELLED | DRY_RUN_NOTICE
  type text NOT NULL,
  step text,
  status text,
  duration_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  parent_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_run_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_run_events_select_own ON public.agent_run_events
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY agent_run_events_insert_own ON public.agent_run_events
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY agent_run_events_delete_own ON public.agent_run_events
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

CREATE INDEX idx_agent_run_events_run_seq ON public.agent_run_events (run_id, seq);

-- ----------------------------------------------------------------------------
-- 3. agent_memories (scoped, bounded, auditable)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  agent_id text,            -- null = cross-agent (workspace/user scope)
  page_id text,             -- set when scope='page'
  -- run | agent | page | workspace | user
  scope text NOT NULL CHECK (scope IN ('run','agent','page','workspace','user')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  summary text,
  source_type text DEFAULT 'agent_observation',
  source_id text,
  -- 1=low 2=medium 3=high 4=critical
  importance smallint NOT NULL DEFAULT 2 CHECK (importance BETWEEN 1 AND 4),
  confidence numeric(3,2) NOT NULL DEFAULT 0.80 CHECK (confidence BETWEEN 0 AND 1),
  keywords text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer NOT NULL DEFAULT 0,
  -- active | stale | forgotten
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','stale','forgotten')),
  superseded_by uuid REFERENCES public.agent_memories(id) ON DELETE SET NULL,
  created_by_run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_memories_select_own ON public.agent_memories
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY agent_memories_insert_own ON public.agent_memories
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY agent_memories_update_own ON public.agent_memories
  FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY agent_memories_delete_own ON public.agent_memories
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

CREATE INDEX idx_agent_memories_scope ON public.agent_memories (user_id, scope, status);
CREATE INDEX idx_agent_memories_agent ON public.agent_memories (agent_id, status);
CREATE INDEX idx_agent_memories_keywords ON public.agent_memories USING gin (keywords);
CREATE INDEX idx_agent_memories_expiry ON public.agent_memories (expires_at) WHERE expires_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. agent_execution_settings — opt-in encrypted BYOK for BACKGROUND runs.
--    The plaintext key is sent once over HTTPS to the save_key action and
--    stored AES-GCM encrypted with the server-side AGENT_ENCRYPTION_KEY.
--    Only the last 4 chars are ever displayed back to the user.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_execution_settings (
  user_id text PRIMARY KEY,
  allow_background boolean NOT NULL DEFAULT false,
  provider text DEFAULT 'openrouter',
  model_class text NOT NULL DEFAULT 'default' CHECK (model_class IN ('fast','default','reasoning')),
  encrypted_key text,
  key_hint text,             -- e.g. "sk-or-…ab12"
  timezone text NOT NULL DEFAULT 'UTC',
  max_runs_per_hour integer NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_execution_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_execution_settings_select_own ON public.agent_execution_settings
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY agent_execution_settings_insert_own ON public.agent_execution_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY agent_execution_settings_update_own ON public.agent_execution_settings
  FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY agent_execution_settings_delete_own ON public.agent_execution_settings
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- ----------------------------------------------------------------------------
-- 5. agent_event_queue — server-side event triggers.
--    Populated by the pg triggers below; drained by the event dispatcher job.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_event_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'page_created','page_updated','page_trashed','title_changed','task_completed')),
  page_id text,
  page_title text,
  block_id text,
  block_text text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  process_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_event_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_event_queue_select_own ON public.agent_event_queue
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY agent_event_queue_delete_own ON public.agent_event_queue
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

CREATE INDEX idx_agent_event_queue_pending ON public.agent_event_queue (created_at) WHERE processed_at IS NULL;

-- Helper: extract checked todos present in NEW but absent/unchecked in OLD.
CREATE OR REPLACE FUNCTION public.fn_emit_agent_events()
RETURNS trigger AS $$
DECLARE
  v_user text;
  v_todo Record;
  v_old_checked jsonb;
BEGIN
  v_user := COALESCE(NEW.user_id::text, '');
  IF v_user = '' THEN RETURN NEW; END IF;

  -- Page lifecycle events
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agent_event_queue (user_id, event_type, page_id, page_title, payload)
    VALUES (v_user, 'page_created', NEW.id::text, NEW.title, jsonb_build_object('icon', NEW.icon));
    RETURN NEW;
  END IF;

  IF NEW.trashed IS TRUE AND COALESCE(OLD.trashed, FALSE) IS NOT TRUE THEN
    INSERT INTO public.agent_event_queue (user_id, event_type, page_id, page_title, payload)
    VALUES (v_user, 'page_trashed', NEW.id::text, NEW.title, '{}'::jsonb);
    RETURN NEW;
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title THEN
    INSERT INTO public.agent_event_queue (user_id, event_type, page_id, page_title, payload)
    VALUES (v_user, 'title_changed', NEW.id::text, NEW.title, jsonb_build_object('previousTitle', OLD.title));
  END IF;

  -- Content changed → page_updated + task_completed detection
  IF NEW.blocks IS DISTINCT FROM OLD.blocks THEN
    INSERT INTO public.agent_event_queue (user_id, event_type, page_id, page_title, payload)
    VALUES (v_user, 'page_updated', NEW.id::text, NEW.title, '{}'::jsonb);

    FOR v_todo IN
      SELECT b->>'id' AS id, b->>'text' AS text
      FROM jsonb_array_elements(NEW.blocks) AS b
      WHERE b->>'type' = 'todo'
        AND COALESCE(b->'properties'->>'checked', 'false') = 'true'
    LOOP
      SELECT COUNT(*) INTO v_old_checked
      FROM jsonb_array_elements(COALESCE(OLD.blocks, '[]'::jsonb)) AS ob
      WHERE ob->>'id' = v_todo.id
        AND COALESCE(ob->'properties'->>'checked', 'false') = 'true';
      IF v_old_checked = 0 THEN
        INSERT INTO public.agent_event_queue (user_id, event_type, page_id, page_title, block_id, block_text, payload)
        VALUES (v_user, 'task_completed', NEW.id::text, NEW.title, v_todo.id, v_todo.text, '{}'::jsonb);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_agent_events_pages ON public.pages;
CREATE TRIGGER trg_agent_events_pages
AFTER INSERT OR UPDATE OF title, blocks, trashed, user_id ON public.pages
FOR EACH ROW EXECUTE FUNCTION public.fn_emit_agent_events();

-- ----------------------------------------------------------------------------
-- 6. automations: scheduling & reliability columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS missed_policy text NOT NULL DEFAULT 'run_once_latest'
    CHECK (missed_policy IN ('run_immediately','skip','run_once_latest','catch_up')),
  ADD COLUMN IF NOT EXISTS timeout_ms integer NOT NULL DEFAULT 180000,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS last_status text,
  ADD COLUMN IF NOT EXISTS failure_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health text NOT NULL DEFAULT 'healthy'
    CHECK (health IN ('healthy','warning','failing','disabled','waiting_approval'));

-- ----------------------------------------------------------------------------
-- 7. Realtime for live run updates
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'agent_runs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'agent_run_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_run_events;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'realtime publication adjust skipped: %', SQLERRM;
END $$;
