-- =====================================================================
-- ROLLBACK: restore prior "Allow all" behavior. EMERGENCY USE ONLY.
-- Source: .kiro/specs/auth-rls-security-migration/design.md (verbatim)
-- This restores the prior INSECURE state and is itself a security regression
-- to be re-fixed. Use only if the forward migration locks out legitimate access.
-- =====================================================================
BEGIN;

-- Drop every policy created by the forward migration, then restore Allow all.
-- (Names are deterministic per the naming convention.)

-- Class A
DROP POLICY IF EXISTS pages_select_own ON public.pages;
DROP POLICY IF EXISTS pages_insert_own ON public.pages;
DROP POLICY IF EXISTS pages_update_own ON public.pages;
DROP POLICY IF EXISTS pages_delete_own ON public.pages;
CREATE POLICY "Allow all on pages" ON public.pages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ai_chats_select_own ON public.ai_chats;
DROP POLICY IF EXISTS ai_chats_insert_own ON public.ai_chats;
DROP POLICY IF EXISTS ai_chats_update_own ON public.ai_chats;
DROP POLICY IF EXISTS ai_chats_delete_own ON public.ai_chats;
CREATE POLICY "Allow all on ai_chats" ON public.ai_chats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS template_additions_select_own ON public.template_additions;
DROP POLICY IF EXISTS template_additions_insert_own ON public.template_additions;
DROP POLICY IF EXISTS template_additions_update_own ON public.template_additions;
DROP POLICY IF EXISTS template_additions_delete_own ON public.template_additions;
CREATE POLICY "Allow all on template_additions" ON public.template_additions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS agents_select_own ON public.agents;
DROP POLICY IF EXISTS agents_insert_own ON public.agents;
DROP POLICY IF EXISTS agents_update_own ON public.agents;
DROP POLICY IF EXISTS agents_delete_own ON public.agents;
CREATE POLICY "Allow all on agents" ON public.agents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS creator_profiles_select_own ON public.creator_profiles;
DROP POLICY IF EXISTS creator_profiles_insert_own ON public.creator_profiles;
DROP POLICY IF EXISTS creator_profiles_update_own ON public.creator_profiles;
DROP POLICY IF EXISTS creator_profiles_delete_own ON public.creator_profiles;
CREATE POLICY "Allow all on creator_profiles" ON public.creator_profiles FOR ALL USING (true) WITH CHECK (true);

-- Class B
DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
CREATE POLICY "Allow all operations for now" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS page_versions_select_own ON public.page_versions;
DROP POLICY IF EXISTS page_versions_insert_own ON public.page_versions;
CREATE POLICY "Allow all on page_versions" ON public.page_versions FOR ALL USING (true) WITH CHECK (true);

-- Class C
DROP POLICY IF EXISTS agent_access_grants_all_own ON public.agent_access_grants;
CREATE POLICY "Allow all on agent_access_grants" ON public.agent_access_grants FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS agent_triggers_all_own ON public.agent_triggers;
CREATE POLICY "Allow all on agent_triggers" ON public.agent_triggers FOR ALL USING (true) WITH CHECK (true);

-- Class E
DROP POLICY IF EXISTS marketplace_templates_select_published ON public.marketplace_templates;
DROP POLICY IF EXISTS marketplace_templates_select_own ON public.marketplace_templates;
DROP POLICY IF EXISTS marketplace_templates_insert_own ON public.marketplace_templates;
DROP POLICY IF EXISTS marketplace_templates_update_own ON public.marketplace_templates;
DROP POLICY IF EXISTS marketplace_templates_delete_own ON public.marketplace_templates;
CREATE POLICY "Allow all on marketplace_templates" ON public.marketplace_templates FOR ALL USING (true) WITH CHECK (true);

-- Class F / G
DROP POLICY IF EXISTS workspace_settings_select_auth ON public.workspace_settings;
CREATE POLICY "Allow all on workspace_settings" ON public.workspace_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ai_memory" ON public.ai_memory FOR ALL USING (true) WITH CHECK (true);

-- Class H
DROP POLICY IF EXISTS page_permissions_all_own ON public.page_permissions;
CREATE POLICY "Allow all on page_permissions" ON public.page_permissions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS collaboration_sessions_all_own ON public.collaboration_sessions;
CREATE POLICY "Allow all on collaboration_sessions" ON public.collaboration_sessions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS block_locks_all_own ON public.block_locks;
CREATE POLICY "Allow all on block_locks" ON public.block_locks FOR ALL USING (true) WITH CHECK (true);

-- Class D
DROP POLICY IF EXISTS audit_events_select_own ON public.audit_events;
DROP POLICY IF EXISTS audit_events_insert_interim ON public.audit_events;
CREATE POLICY "Allow all on audit_events" ON public.audit_events FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS template_refunds_select_own ON public.template_refunds;
DROP POLICY IF EXISTS template_refunds_insert_interim ON public.template_refunds;
CREATE POLICY "Allow all on template_refunds" ON public.template_refunds FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS agent_run_logs_select_own ON public.agent_run_logs;
DROP POLICY IF EXISTS agent_run_logs_write_interim ON public.agent_run_logs;
CREATE POLICY "Allow all on agent_run_logs" ON public.agent_run_logs FOR ALL USING (true) WITH CHECK (true);

COMMIT;
