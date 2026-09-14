-- ============================================================
-- Migration: Widget Platform V2 (Connected, Analytics, AI, & Views)
-- Adds catalog definitions for analytics, connected, and AI widgets
-- Adds widget_views table for persisted view queries & filter state
-- Strict RLS and user isolation
-- ============================================================

-- 1. Create widget_views table for saved widget query views
CREATE TABLE IF NOT EXISTS public.widget_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text NOT NULL DEFAULT 'personal',
  name text NOT NULL,
  data_source_id text NOT NULL DEFAULT 'workspace-tasks',
  visualization text NOT NULL DEFAULT 'table',
  filter_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  sorts jsonb NOT NULL DEFAULT '[]'::jsonb,
  "group" jsonb DEFAULT NULL,
  aggregations jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widget_views_user_workspace
  ON public.widget_views (user_id, workspace_id);

ALTER TABLE public.widget_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "widget_views_owner_select" ON public.widget_views;
CREATE POLICY "widget_views_owner_select" ON public.widget_views
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "widget_views_owner_insert" ON public.widget_views;
CREATE POLICY "widget_views_owner_insert" ON public.widget_views
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "widget_views_owner_update" ON public.widget_views;
CREATE POLICY "widget_views_owner_update" ON public.widget_views
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "widget_views_owner_delete" ON public.widget_views;
CREATE POLICY "widget_views_owner_delete" ON public.widget_views
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.widget_views TO authenticated;

-- 2. Populate new catalog entries for Phase-2 widgets
INSERT INTO public.widget_catalog
  (id, name, description, category, status, rollout_percent, default_enabled, default_size, allowed_sizes, platforms, required_integration, default_config, version)
VALUES
  (
    'ai-insights',
    'AI Workspace Insights',
    'Autonomous synthesis of recent docs, project velocity, and key blockers.',
    'ai',
    'enabled',
    100,
    true,
    'medium',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    NULL,
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'ai-health',
    'AI Health Diagnostic',
    'Real-time sprint velocity score and risk radar for workspace projects.',
    'ai',
    'enabled',
    100,
    true,
    'small',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    NULL,
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'workspace-kpi',
    'Tasks KPI Metric',
    'Weekly completion progress with delta trend and explainability provenance.',
    'analytics',
    'enabled',
    100,
    true,
    'small',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    NULL,
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'task-velocity-chart',
    'Task Velocity Chart',
    'Animated daily velocity bar chart tracking completion volume.',
    'analytics',
    'enabled',
    100,
    true,
    'medium',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    NULL,
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'project-distribution-donut',
    'Project Work Donut',
    'Breakdown of tasks and pages categorized across workspace projects.',
    'analytics',
    'enabled',
    100,
    false,
    'medium',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    NULL,
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'weather',
    'Live Weather',
    'Local temperature, forecast and atmospheric conditions.',
    'analytics',
    'enabled',
    100,
    false,
    'small',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    NULL,
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'daily-quote',
    'Daily Motivation',
    'Handpicked philosophical quote with one-click copy.',
    'analytics',
    'enabled',
    100,
    false,
    'small',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    NULL,
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'quick-calculator',
    'Quick Calculator',
    'Interactive arithmetic calculator with instantaneous evaluation.',
    'analytics',
    'enabled',
    100,
    false,
    'small',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    NULL,
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'github-prs',
    'GitHub Pull Requests',
    'Open pull requests, review statuses and CI checks from connected repositories.',
    'integrations',
    'enabled',
    100,
    true,
    'medium',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    'github',
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'github-issues',
    'GitHub Issues',
    'Assigned issues, milestone trackers and priority bug triage.',
    'integrations',
    'enabled',
    100,
    false,
    'medium',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    'github',
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'google-calendar',
    'Google Calendar',
    'Upcoming meetings, team events and 1-click Google Meet joins.',
    'integrations',
    'enabled',
    100,
    true,
    'medium',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    'google',
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'google-drive',
    'Google Drive Recent',
    'Recently modified Docs, Sheets, and Presentations.',
    'integrations',
    'enabled',
    100,
    false,
    'medium',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    'google',
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'figma-preview',
    'Figma Live Canvas',
    'Interactive Figma prototype and design canvas embed.',
    'integrations',
    'enabled',
    100,
    false,
    'large',
    ARRAY['medium','large','wide'],
    ARRAY['web','macos','windows','linux'],
    'figma',
    '{"url":"https://www.figma.com"}'::jsonb,
    '2.0.0'
  ),
  (
    'action-buttons',
    'Action Hub',
    'Custom workflow triggers, build webhooks, and AI prompt shortcuts.',
    'automation',
    'enabled',
    100,
    true,
    'medium',
    ARRAY['small','medium','large'],
    ARRAY['web','macos','windows','linux'],
    NULL,
    '{}'::jsonb,
    '2.0.0'
  ),
  (
    'external-embed',
    'Sandboxed Web Embed',
    'Secure CSP-isolated iframe for external tools, dashboards and prototypes.',
    'embed',
    'enabled',
    100,
    false,
    'medium',
    ARRAY['medium','large','wide'],
    ARRAY['web','macos','windows','linux'],
    NULL,
    '{"url":"https://example.com"}'::jsonb,
    '2.0.0'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  required_integration = EXCLUDED.required_integration,
  version = EXCLUDED.version,
  updated_at = now();
