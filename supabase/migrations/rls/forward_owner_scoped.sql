-- =====================================================================
-- FORWARD MIGRATION: owner-scoped RLS  (Phase 4 + Phase 5 policy shapes)
-- Source: .kiro/specs/auth-rls-security-migration/design.md (verbatim)
-- Review only. Nothing runs until explicitly approved + staged.
-- =====================================================================
BEGIN;

-- ---------- Class A: owner CRUD ----------
-- pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on pages" ON public.pages;
CREATE POLICY pages_select_own ON public.pages
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY pages_insert_own ON public.pages
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY pages_update_own ON public.pages
  FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY pages_delete_own ON public.pages
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- ai_chats
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on ai_chats" ON public.ai_chats;
CREATE POLICY ai_chats_select_own ON public.ai_chats
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY ai_chats_insert_own ON public.ai_chats
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY ai_chats_update_own ON public.ai_chats
  FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY ai_chats_delete_own ON public.ai_chats
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- template_additions (owner col: added_by_user_id)
ALTER TABLE public.template_additions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on template_additions" ON public.template_additions;
CREATE POLICY template_additions_select_own ON public.template_additions
  FOR SELECT TO authenticated USING (added_by_user_id = (auth.uid())::text);
CREATE POLICY template_additions_insert_own ON public.template_additions
  FOR INSERT TO authenticated WITH CHECK (added_by_user_id = (auth.uid())::text);
CREATE POLICY template_additions_update_own ON public.template_additions
  FOR UPDATE TO authenticated
  USING (added_by_user_id = (auth.uid())::text)
  WITH CHECK (added_by_user_id = (auth.uid())::text);
CREATE POLICY template_additions_delete_own ON public.template_additions
  FOR DELETE TO authenticated USING (added_by_user_id = (auth.uid())::text);

-- agents (owner col: owner_id text)
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on agents" ON public.agents;
CREATE POLICY agents_select_own ON public.agents
  FOR SELECT TO authenticated USING (owner_id = (auth.uid())::text);
CREATE POLICY agents_insert_own ON public.agents
  FOR INSERT TO authenticated WITH CHECK (owner_id = (auth.uid())::text);
CREATE POLICY agents_update_own ON public.agents
  FOR UPDATE TO authenticated
  USING (owner_id = (auth.uid())::text)
  WITH CHECK (owner_id = (auth.uid())::text);
CREATE POLICY agents_delete_own ON public.agents
  FOR DELETE TO authenticated USING (owner_id = (auth.uid())::text);

-- creator_profiles (owner col: user_id) — class A shape; owner-only for v1
-- (public read of display fields intentionally NOT enabled per R2.5 decision)
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on creator_profiles" ON public.creator_profiles;
CREATE POLICY creator_profiles_select_own ON public.creator_profiles
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY creator_profiles_insert_own ON public.creator_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY creator_profiles_update_own ON public.creator_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY creator_profiles_delete_own ON public.creator_profiles
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- ---------- Class B: owner CRUD with delete constraints ----------
-- user_profiles: self SELECT/INSERT/UPDATE; NO client DELETE (delete via RPC)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for now" ON public.user_profiles;
CREATE POLICY user_profiles_select_own ON public.user_profiles
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY user_profiles_insert_own ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY user_profiles_update_own ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);
-- (no DELETE policy: client cannot delete; see delete_account() RPC)

-- page_versions: owner SELECT/INSERT only; append-only, no UPDATE/DELETE
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on page_versions" ON public.page_versions;
CREATE POLICY page_versions_select_own ON public.page_versions
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY page_versions_insert_own ON public.page_versions
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
-- (no UPDATE, no DELETE policies: immutable to end users)

-- ---------- Class C: indirect ownership via agents.owner_id ----------
ALTER TABLE public.agent_access_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on agent_access_grants" ON public.agent_access_grants;
CREATE POLICY agent_access_grants_all_own ON public.agent_access_grants
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_access_grants.agent_id
                   AND a.owner_id = (auth.uid())::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_access_grants.agent_id
                   AND a.owner_id = (auth.uid())::text));

ALTER TABLE public.agent_triggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on agent_triggers" ON public.agent_triggers;
CREATE POLICY agent_triggers_all_own ON public.agent_triggers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_triggers.agent_id
                   AND a.owner_id = (auth.uid())::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_triggers.agent_id
                   AND a.owner_id = (auth.uid())::text));

-- ---------- Class E: public-read published, owner CRUD drafts ----------
ALTER TABLE public.marketplace_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on marketplace_templates" ON public.marketplace_templates;
-- Authenticated users may read PUBLISHED rows...
CREATE POLICY marketplace_templates_select_published ON public.marketplace_templates
  FOR SELECT TO authenticated USING (status = 'published');
-- ...and owners may always read their own (including drafts).
CREATE POLICY marketplace_templates_select_own ON public.marketplace_templates
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY marketplace_templates_insert_own ON public.marketplace_templates
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY marketplace_templates_update_own ON public.marketplace_templates
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY marketplace_templates_delete_own ON public.marketplace_templates
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ---------- Class F: authenticated read, service-role write ----------
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on workspace_settings" ON public.workspace_settings;
CREATE POLICY workspace_settings_select_auth ON public.workspace_settings
  FOR SELECT TO authenticated USING (true);
-- (no INSERT/UPDATE/DELETE policy: writes only via service-role, which bypasses RLS)

-- ---------- Class G: no client access (service-role only) ----------
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on ai_memory" ON public.ai_memory;
-- (no policies at all: anon + authenticated have zero access; service-role bypasses)

-- ---------- Class H: owner-only (collaboration revisit TODO) ----------
-- page_permissions
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on page_permissions" ON public.page_permissions;
CREATE POLICY page_permissions_all_own ON public.page_permissions
  FOR ALL TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- collaboration_sessions
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on collaboration_sessions" ON public.collaboration_sessions;
CREATE POLICY collaboration_sessions_all_own ON public.collaboration_sessions
  FOR ALL TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- block_locks  (WARNING: owner-only breaks cross-user lock visibility; revisit for collab)
ALTER TABLE public.block_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on block_locks" ON public.block_locks;
CREATE POLICY block_locks_all_own ON public.block_locks
  FOR ALL TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- ---------- Class D: trusted-write tables (Phase 5 DEFERRED) ----------
-- INTERIM (accepted): owner/subject may read; authenticated may write own rows
-- so current client code keeps working. Phase 5 (server-side relocation) is
-- deferred; revisit before these tables carry security-sensitive data at scale.
--
-- audit_events (subject: user_id)
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on audit_events" ON public.audit_events;
CREATE POLICY audit_events_select_own ON public.audit_events
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY audit_events_insert_interim ON public.audit_events
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
-- (no UPDATE/DELETE: audit integrity)

-- template_refunds (requester: requester_user_id)
ALTER TABLE public.template_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on template_refunds" ON public.template_refunds;
CREATE POLICY template_refunds_select_own ON public.template_refunds
  FOR SELECT TO authenticated USING (requester_user_id = (auth.uid())::text);
CREATE POLICY template_refunds_insert_interim ON public.template_refunds
  FOR INSERT TO authenticated WITH CHECK (requester_user_id = (auth.uid())::text);
-- (no UPDATE/DELETE from client: status transitions are service-role only)

-- agent_run_logs (owner via parent agent)
ALTER TABLE public.agent_run_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on agent_run_logs" ON public.agent_run_logs;
CREATE POLICY agent_run_logs_select_own ON public.agent_run_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_run_logs.agent_id
                   AND a.owner_id = (auth.uid())::text));
CREATE POLICY agent_run_logs_write_interim ON public.agent_run_logs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents a
                 WHERE a.id = agent_run_logs.agent_id
                   AND a.owner_id = (auth.uid())::text));

COMMIT;
