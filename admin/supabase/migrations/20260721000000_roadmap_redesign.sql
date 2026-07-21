-- Roadmap Redesign: New tables and RPCs

-- 1. Extend roadmap_items with new columns
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'uncategorized';
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS target_date TIMESTAMPTZ;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS sprint_id UUID;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS release_id UUID;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS estimated_time TEXT;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS target_version TEXT;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS epic TEXT;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 2. Sprints table
CREATE TABLE IF NOT EXISTS roadmap_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','active','closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Releases table
CREATE TABLE IF NOT EXISTS roadmap_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  release_notes TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','in_progress','released','cancelled')),
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Comments table
CREATE TABLE IF NOT EXISTS roadmap_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'Unknown',
  author_id TEXT,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES roadmap_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Checklists table
CREATE TABLE IF NOT EXISTS roadmap_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  section TEXT DEFAULT 'General',
  completed BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Activity timeline
CREATE TABLE IF NOT EXISTS roadmap_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES roadmap_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  actor_name TEXT DEFAULT 'System',
  actor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Dependencies
CREATE TABLE IF NOT EXISTS roadmap_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'blocks' CHECK (dependency_type IN ('blocks','relates_to','duplicates')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(feature_id, depends_on_id)
);

-- 8. Attachments
CREATE TABLE IF NOT EXISTS roadmap_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'link' CHECK (type IN ('image','video','pdf','figma','github','link','supabase')),
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (all access via RPCs)
ALTER TABLE roadmap_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_attachments ENABLE ROW LEVEL SECURITY;

-- Insert default labels into platform_settings for now (labels stored as JSON)
INSERT INTO platform_settings (key, value) 
VALUES ('roadmap_labels', '["AI","Editor","Workspace","Database","Auth","Landing","Marketing","Email","Admin","Analytics","Mobile","Performance","Bug"]')
ON CONFLICT (key) DO NOTHING;

-- Insert a default sprint if none exist
INSERT INTO roadmap_sprints (name, status, start_date, end_date)
SELECT 'Current Sprint', 'planned', now(), now() + interval '14 days'
WHERE NOT EXISTS (SELECT 1 FROM roadmap_sprints);

-- Insert a default release if none exist
INSERT INTO roadmap_releases (name, version, status)
SELECT 'v1.0', '1.0', 'planned'
WHERE NOT EXISTS (SELECT 1 FROM roadmap_releases);

-- ─────────────────────────────────────────────
-- ROADMAP-SPECIFIC RPCS
-- ─────────────────────────────────────────────

-- roadmap_select: select with optional filter/sort/pagination
CREATE OR REPLACE FUNCTION roadmap_select(
  p_session_token TEXT,
  p_filters JSONB DEFAULT '{}',
  p_search TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_dir TEXT DEFAULT 'desc',
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 100
) RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_offset INT;
  v_where TEXT := '1=1';
  v_sql TEXT;
  v_result JSONB;
  v_count INT;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  v_offset := (p_page - 1) * p_page_size;

  -- Build WHERE from filters
  IF p_filters ? 'status' AND p_filters->>'status' != '' THEN
    IF p_filters->>'status' = 'all' THEN null;
    ELSE v_where := v_where || ' AND status = ' || quote_literal(p_filters->>'status');
    END IF;
  END IF;
  IF p_filters ? 'priority' AND p_filters->>'priority' != '' AND p_filters->>'priority' != 'all' THEN
    v_where := v_where || ' AND priority = ' || quote_literal(p_filters->>'priority');
  END IF;
  IF p_filters ? 'sprint_id' AND p_filters->>'sprint_id' != '' AND p_filters->>'sprint_id' != 'all' THEN
    v_where := v_where || ' AND sprint_id = ' || quote_literal(p_filters->>'sprint_id');
  END IF;
  IF p_filters ? 'release_id' AND p_filters->>'release_id' != '' AND p_filters->>'release_id' != 'all' THEN
    v_where := v_where || ' AND release_id = ' || quote_literal(p_filters->>'release_id');
  END IF;
  IF p_filters ? 'category' AND p_filters->>'category' != '' AND p_filters->>'category' != 'all' THEN
    v_where := v_where || ' AND category = ' || quote_literal(p_filters->>'category');
  END IF;
  IF p_filters ? 'owner' AND p_filters->>'owner' != '' THEN
    v_where := v_where || ' AND owner ILIKE ' || quote_literal('%' || p_filters->>'owner' || '%');
  END IF;

  IF p_search IS NOT NULL AND p_search != '' THEN
    v_where := v_where || ' AND (title ILIKE ' || quote_literal('%' || p_search || '%')
      || ' OR description ILIKE ' || quote_literal('%' || p_search || '%')
      || ' OR owner ILIKE ' || quote_literal('%' || p_search || '%')
      || ')';
  END IF;

  -- Count
  EXECUTE 'SELECT COUNT(*) FROM roadmap_items WHERE ' || v_where INTO v_count;

  -- Fetch
  v_sql := 'SELECT jsonb_agg(sub) FROM (SELECT * FROM roadmap_items WHERE ' || v_where
    || ' ORDER BY ' || quote_ident(p_sort_by) || ' ' || p_sort_dir
    || ' LIMIT ' || p_page_size || ' OFFSET ' || v_offset || ') sub';

  EXECUTE v_sql INTO v_result;

  RETURN jsonb_build_object(
    'data', COALESCE(v_result, '[]'::jsonb),
    'total', v_count,
    'page', p_page,
    'page_size', p_page_size
  );
END;
$$;

-- roadmap_insert
CREATE OR REPLACE FUNCTION roadmap_insert(
  p_session_token TEXT,
  p_data JSONB
) RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_columns TEXT;
  v_values TEXT;
  v_id UUID;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT
    string_agg(quote_ident(key), ', '),
    string_agg(CASE WHEN value = 'null'::jsonb THEN 'NULL' ELSE quote_literal(value::text) END, ', ')
  INTO v_columns, v_values
  FROM jsonb_each(p_data);
  EXECUTE 'INSERT INTO roadmap_items (' || v_columns || ') VALUES (' || v_values || ') RETURNING id' INTO v_id;
  -- Log activity
  INSERT INTO roadmap_activity (feature_id, action, field_name, new_value, actor_name)
  VALUES (v_id, 'created', 'status', p_data->>'status', 'Admin');
  RETURN v_id;
END;
$$;

-- roadmap_update
CREATE OR REPLACE FUNCTION roadmap_update(
  p_session_token TEXT,
  p_id UUID,
  p_data JSONB
) RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_sets TEXT;
  v_result JSONB;
  v_key TEXT;
  v_old_val TEXT;
  v_new_val TEXT;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');

  -- Capture old values for activity log
  SELECT string_agg(
    quote_ident(key) || ' = ' || CASE WHEN value = 'null'::jsonb THEN 'NULL' ELSE quote_literal(value::text) END,
    ', '
  ) INTO v_sets
  FROM jsonb_each(p_data);

  -- Log activity for each changed field
  FOR v_key, v_new_val IN SELECT key, value::text FROM jsonb_each(p_data)
  LOOP
    EXECUTE format('SELECT %I::text FROM roadmap_items WHERE id = $1', v_key) INTO v_old_val USING p_id;
    IF v_old_val IS DISTINCT FROM v_new_val AND v_key NOT IN ('updated_at') THEN
      INSERT INTO roadmap_activity (feature_id, action, field_name, old_value, new_value, actor_name)
      VALUES (p_id, 'updated', v_key, v_old_val, v_new_val, 'Admin');
    END IF;
  END LOOP;

  EXECUTE 'UPDATE roadmap_items SET ' || v_sets || ', updated_at = now() WHERE id = $1 RETURNING row_to_json(roadmap_items)'
    INTO v_result USING p_id;
  RETURN v_result;
END;
$$;

-- roadmap_delete
CREATE OR REPLACE FUNCTION roadmap_delete(
  p_session_token TEXT,
  p_id UUID
) RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  DELETE FROM roadmap_items WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- roadmap_update_status (drag-and-drop helper)
CREATE OR REPLACE FUNCTION roadmap_update_status(
  p_session_token TEXT,
  p_id UUID,
  p_status TEXT,
  p_sort_order INT DEFAULT NULL
) RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_old_status TEXT;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT status INTO v_old_status FROM roadmap_items WHERE id = p_id;
  IF p_sort_order IS NOT NULL THEN
    UPDATE roadmap_items SET status = p_status, sort_order = p_sort_order, updated_at = now() WHERE id = p_id;
  ELSE
    UPDATE roadmap_items SET status = p_status, updated_at = now() WHERE id = p_id;
  END IF;
  INSERT INTO roadmap_activity (feature_id, action, field_name, old_value, new_value, actor_name)
  VALUES (p_id, 'moved', 'status', v_old_status, p_status, 'Admin');
  RETURN FOUND;
END;
$$;

-- roadmap_get_stats (dashboard analytics)
CREATE OR REPLACE FUNCTION roadmap_get_stats(p_session_token TEXT)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_total INT;
  v_planned INT;
  v_in_progress INT;
  v_review INT;
  v_blocked INT;
  v_released INT;
  v_backlog INT;
  v_overdue INT;
  v_completion_pct NUMERIC;
  v_current_sprint TEXT;
  v_upcoming_release TEXT;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');

  SELECT COUNT(*) INTO v_total FROM roadmap_items;
  SELECT COUNT(*) INTO v_backlog FROM roadmap_items WHERE status = 'backlog';
  SELECT COUNT(*) INTO v_planned FROM roadmap_items WHERE status IN ('planned', 'design');
  SELECT COUNT(*) INTO v_in_progress FROM roadmap_items WHERE status = 'in_progress';
  SELECT COUNT(*) INTO v_review FROM roadmap_items WHERE status IN ('review', 'testing');
  SELECT COUNT(*) INTO v_blocked FROM roadmap_items WHERE status = 'blocked';
  SELECT COUNT(*) INTO v_released FROM roadmap_items WHERE status = 'shipped';

  SELECT COUNT(*) INTO v_overdue FROM roadmap_items
    WHERE target_date < now() AND status NOT IN ('shipped', 'archived', 'cancelled');

  SELECT COALESCE(ROUND(v_released::NUMERIC / NULLIF(v_total, 0) * 100), 0) INTO v_completion_pct;

  SELECT name INTO v_current_sprint FROM roadmap_sprints WHERE status = 'active' LIMIT 1;
  v_current_sprint := COALESCE(v_current_sprint, (SELECT name FROM roadmap_sprints WHERE status = 'planned' LIMIT 1), 'No active sprint');

  SELECT name || ' (' || version || ')' INTO v_upcoming_release
  FROM roadmap_releases WHERE status IN ('planned', 'in_progress') ORDER BY created_at ASC LIMIT 1;
  v_upcoming_release := COALESCE(v_upcoming_release, 'No upcoming release');

  RETURN jsonb_build_object(
    'total', v_total,
    'backlog', v_backlog,
    'planned', v_planned,
    'in_progress', v_in_progress,
    'review', v_review,
    'blocked', v_blocked,
    'released', v_released,
    'overdue', v_overdue,
    'completion_pct', v_completion_pct,
    'current_sprint', v_current_sprint,
    'upcoming_release', v_upcoming_release
  );
END;
$$;

-- roadmap_get_labels
CREATE OR REPLACE FUNCTION roadmap_get_labels(p_session_token TEXT)
RETURNS TEXT[]
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_value TEXT;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT value::text INTO v_value FROM platform_settings WHERE key = 'roadmap_labels';
  RETURN COALESCE(v_value::text[], '{}'::text[]);
END;
$$;

-- roadmap_get_sprints
CREATE OR REPLACE FUNCTION roadmap_get_sprints(p_session_token TEXT)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_result JSONB;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT jsonb_agg(row_to_json(rs)) INTO v_result FROM (SELECT * FROM roadmap_sprints ORDER BY created_at DESC) rs;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- roadmap_get_releases
CREATE OR REPLACE FUNCTION roadmap_get_releases(p_session_token TEXT)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_result JSONB;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT jsonb_agg(row_to_json(rr)) INTO v_result FROM (SELECT * FROM roadmap_releases ORDER BY created_at DESC) rr;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- roadmap_comments_get
CREATE OR REPLACE FUNCTION roadmap_comments_get(p_session_token TEXT, p_feature_id UUID)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_result JSONB;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT jsonb_agg(row_to_json(rc)) INTO v_result
  FROM (SELECT * FROM roadmap_comments WHERE feature_id = p_feature_id ORDER BY created_at ASC) rc;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- roadmap_comment_add
CREATE OR REPLACE FUNCTION roadmap_comment_add(
  p_session_token TEXT,
  p_feature_id UUID,
  p_content TEXT,
  p_parent_id UUID DEFAULT NULL
) RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_id UUID;
  v_admin_name TEXT;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT name INTO v_admin_name FROM admin_users WHERE id = v_admin_id;
  INSERT INTO roadmap_comments (feature_id, content, parent_id, author_name, author_id)
  VALUES (p_feature_id, p_content, p_parent_id, COALESCE(v_admin_name, 'Admin'), v_admin_id::text)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- roadmap_checklists_get
CREATE OR REPLACE FUNCTION roadmap_checklists_get(p_session_token TEXT, p_feature_id UUID)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_result JSONB;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT jsonb_agg(row_to_json(rc)) INTO v_result
  FROM (SELECT * FROM roadmap_checklists WHERE feature_id = p_feature_id ORDER BY sort_order ASC) rc;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- roadmap_checklist_toggle
CREATE OR REPLACE FUNCTION roadmap_checklist_toggle(p_session_token TEXT, p_id UUID, p_completed BOOLEAN)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  UPDATE roadmap_checklists SET completed = p_completed WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- roadmap_checklist_add
CREATE OR REPLACE FUNCTION roadmap_checklist_add(
  p_session_token TEXT,
  p_feature_id UUID,
  p_title TEXT,
  p_section TEXT DEFAULT 'General'
) RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_id UUID;
  v_order INT;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_order FROM roadmap_checklists WHERE feature_id = p_feature_id;
  INSERT INTO roadmap_checklists (feature_id, title, section, sort_order)
  VALUES (p_feature_id, p_title, p_section, v_order) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- roadmap_get_activity
CREATE OR REPLACE FUNCTION roadmap_get_activity(p_session_token TEXT, p_feature_id UUID)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_result JSONB;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT jsonb_agg(row_to_json(ra)) INTO v_result
  FROM (SELECT * FROM roadmap_activity WHERE feature_id = p_feature_id ORDER BY created_at DESC) ra;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- roadmap_add_dependency
CREATE OR REPLACE FUNCTION roadmap_add_dependency(
  p_session_token TEXT,
  p_feature_id UUID,
  p_depends_on_id UUID,
  p_type TEXT DEFAULT 'blocks'
) RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  INSERT INTO roadmap_dependencies (feature_id, depends_on_id, dependency_type)
  VALUES (p_feature_id, p_depends_on_id, p_type)
  ON CONFLICT DO NOTHING;
  RETURN FOUND;
END;
$$;

-- roadmap_get_dependencies
CREATE OR REPLACE FUNCTION roadmap_get_dependencies(p_session_token TEXT, p_feature_id UUID)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_result JSONB;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT jsonb_agg(row_to_json(rd)) INTO v_result
  FROM (SELECT rd.*, ri.title as depends_on_title
    FROM roadmap_dependencies rd
    JOIN roadmap_items ri ON ri.id = rd.depends_on_id
    WHERE rd.feature_id = p_feature_id) rd;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- roadmap_sprint CRUD
CREATE OR REPLACE FUNCTION roadmap_sprint_create(
  p_session_token TEXT,
  p_name TEXT,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_id UUID;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'admin');
  INSERT INTO roadmap_sprints (name, start_date, end_date) VALUES (p_name, p_start_date, p_end_date) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION roadmap_sprint_close(p_session_token TEXT, p_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'admin');
  UPDATE roadmap_sprints SET status = 'closed', updated_at = now() WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- roadmap_release CRUD
CREATE OR REPLACE FUNCTION roadmap_release_create(
  p_session_token TEXT,
  p_name TEXT,
  p_version TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_id UUID;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'admin');
  INSERT INTO roadmap_releases (name, version, description) VALUES (p_name, p_version, p_description) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION roadmap_release_publish(
  p_session_token TEXT,
  p_id UUID,
  p_release_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'admin');
  UPDATE roadmap_releases SET status = 'released', released_at = now(), release_notes = COALESCE(p_release_notes, release_notes), updated_at = now() WHERE id = p_id;
  UPDATE roadmap_items SET status = 'shipped', completed_at = now(), updated_at = now() WHERE release_id = p_id AND status NOT IN ('shipped', 'archived', 'cancelled');
  RETURN FOUND;
END;
$$;

-- Add new tables to existing admin RPC allow-lists
-- First drop and recreate admin_insert if it doesn't have roadmap_items
DROP FUNCTION IF EXISTS admin_insert(TEXT, TEXT, JSONB, TEXT);
CREATE OR REPLACE FUNCTION admin_insert(p_session_token TEXT, p_table TEXT, p_data JSONB, p_min_role TEXT DEFAULT 'support')
RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_columns TEXT;
  v_values TEXT;
  v_id UUID;
  v_allowed_tables TEXT[] := ARRAY[
    'admin_users', 'user_profiles', 'pages', 'audit_events', 'ai_chats',
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'subscriptions', 'payments', 'email_campaigns', 'email_events', 'roadmap_items',
    'integrations', 'api_keys', 'notifications', 'teams', 'workspace_settings',
    'webhook_endpoints', 'webhook_deliveries', 'collaboration_sessions',
    'banned_users', 'support_messages', 'platform_settings',
    'workspaces',
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings', 'launch_audit_log',
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'admin_broadcasts', 'referrals', 'referral_rewards', 'referral_tiers',
    'referral_codes', 'user_referrals',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'roadmap_sprints', 'roadmap_releases', 'roadmap_comments',
    'roadmap_checklists', 'roadmap_activity', 'roadmap_dependencies', 'roadmap_attachments'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  SELECT string_agg(quote_ident(key), ', '),
    string_agg(CASE WHEN value = 'null'::jsonb THEN 'NULL' ELSE quote_literal(value::text) END, ', ')
  INTO v_columns, v_values
  FROM jsonb_each(p_data);
  EXECUTE 'INSERT INTO ' || quote_ident(p_table) || ' (' || v_columns || ') VALUES (' || v_values || ') RETURNING id' INTO v_id;
  RETURN v_id;
END;
$$;

-- Recreate admin_select with new tables
CREATE OR REPLACE FUNCTION admin_select(
  p_session_token TEXT,
  p_table TEXT,
  p_select TEXT DEFAULT '*',
  p_order_col TEXT DEFAULT 'created_at',
  p_order_dir TEXT DEFAULT 'desc',
  p_limit INT DEFAULT NULL,
  p_eq_col TEXT DEFAULT NULL,
  p_eq_val TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_sql TEXT;
  v_result JSONB;
  v_allowed_tables TEXT[] := ARRAY[
    'admin_users', 'user_profiles', 'pages', 'audit_events', 'ai_chats',
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'subscriptions', 'payments', 'email_campaigns', 'email_events', 'roadmap_items',
    'integrations', 'api_keys', 'notifications', 'teams', 'workspace_settings',
    'webhook_endpoints', 'webhook_deliveries', 'collaboration_sessions',
    'banned_users', 'support_messages', 'platform_settings',
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings', 'launch_audit_log',
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'admin_broadcasts', 'referrals', 'referral_rewards', 'referral_tiers',
    'referral_codes', 'user_referrals',
    'changelog_entries', 'blog_posts', 'legal_pages', 'webhook_deliveries', 'webhook_endpoints',
    'collaboration_sessions', 'workspaces', 'deleted_accounts',
    'roadmap_sprints', 'roadmap_releases'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  v_sql := 'SELECT jsonb_agg(sub) FROM (SELECT ' || p_select || ' FROM ' || quote_ident(p_table);
  IF p_eq_col IS NOT NULL AND p_eq_val IS NOT NULL THEN
    v_sql := v_sql || ' WHERE ' || quote_ident(p_eq_col) || ' = ' || quote_literal(p_eq_val);
  END IF;
  v_sql := v_sql || ' ORDER BY ' || quote_ident(p_order_col) || ' ' || p_order_dir;
  IF p_limit IS NOT NULL THEN v_sql := v_sql || ' LIMIT ' || p_limit; END IF;
  v_sql := v_sql || ') sub';
  EXECUTE v_sql INTO v_result;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Recreate admin_update with new tables
CREATE OR REPLACE FUNCTION admin_update(
  p_session_token TEXT,
  p_table TEXT,
  p_id TEXT,
  p_data JSONB,
  p_min_role TEXT DEFAULT 'support'
) RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_sets TEXT;
  v_result JSONB;
  v_allowed_tables TEXT[] := ARRAY[
    'admin_users', 'user_profiles', 'pages', 'audit_events', 'ai_chats',
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'subscriptions', 'payments', 'email_campaigns', 'email_events', 'roadmap_items',
    'integrations', 'api_keys', 'notifications', 'teams', 'workspace_settings',
    'webhook_endpoints', 'webhook_deliveries', 'collaboration_sessions',
    'banned_users', 'support_messages', 'platform_settings',
    'workspaces',
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings', 'launch_audit_log',
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'admin_broadcasts', 'referrals', 'referral_rewards', 'referral_tiers',
    'referral_codes', 'user_referrals',
    'changelog_entries', 'blog_posts', 'legal_pages'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  SELECT string_agg(
    quote_ident(key) || ' = ' || CASE WHEN value = 'null'::jsonb THEN 'NULL' ELSE quote_literal(value::text) END,
    ', '
  ) INTO v_sets
  FROM jsonb_each(p_data);
  EXECUTE 'UPDATE ' || quote_ident(p_table) || ' SET ' || v_sets
    || ' WHERE id = ' || quote_literal(p_id)
    || ' RETURNING row_to_json(' || quote_ident(p_table) || ')' INTO v_result;
  RETURN v_result;
END;
$$;

-- Recreate admin_delete with new tables
CREATE OR REPLACE FUNCTION admin_delete(
  p_session_token TEXT,
  p_table TEXT,
  p_id TEXT,
  p_min_role TEXT DEFAULT 'support'
) RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id UUID;
  v_result JSONB;
  v_allowed_tables TEXT[] := ARRAY[
    'admin_users', 'user_profiles', 'pages', 'audit_events', 'ai_chats',
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'subscriptions', 'payments', 'email_campaigns', 'email_events', 'roadmap_items',
    'integrations', 'api_keys', 'notifications', 'teams', 'workspace_settings',
    'webhook_endpoints', 'webhook_deliveries', 'collaboration_sessions',
    'banned_users', 'support_messages', 'platform_settings',
    'workspaces',
    'launch_settings', 'cta_buttons', 'landing_content',
    'announcement_bar', 'seo_settings', 'social_links',
    'waitlist_settings', 'launch_audit_log',
    'email_templates', 'email_branding', 'email_segments',
    'email_versions', 'email_history', 'newsletter_subscribers',
    'admin_broadcasts', 'referrals', 'referral_rewards', 'referral_tiers',
    'referral_codes', 'user_referrals',
    'changelog_entries', 'blog_posts', 'legal_pages'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  EXECUTE 'DELETE FROM ' || quote_ident(p_table) || ' WHERE id = ' || quote_literal(p_id)
    || ' RETURNING row_to_json(' || quote_ident(p_table) || ')' INTO v_result;
  RETURN v_result;
END;
$$;
