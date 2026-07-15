-- ============================================================
-- Migration: Security Hardening
-- 
-- 1. Column validation for admin_select (injection prevention)
-- 2. Expired session cleanup function
-- 3. RPC for dashboard AI metrics (removes direct anon-key query)
-- 4. Admin security audit log table + read/write functions
-- 5. Audit logging added to ban_user, hard_ban_user, unban_user
-- 6. Added audit logging to admin_insert/update/delete for admin_users
-- 7. Fixed admin_update whitelist (missing admin_users)
-- 8. RPC for audit event inserts (future migration path)
-- ============================================================

-- ============================================================
-- 1. Column validation helper for admin_select
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_select_columns(p_select text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
DECLARE
  v_col text;
  v_cols text[];
BEGIN
  IF p_select IS NULL OR p_select = '' THEN
    RAISE EXCEPTION 'INVALID_COLUMN: select list cannot be empty' USING ERRCODE = '42501';
  END IF;
  IF p_select = '*' THEN
    RETURN;
  END IF;
  v_cols := string_to_array(p_select, ',');
  FOR i IN 1..array_length(v_cols, 1) LOOP
    v_col := trim(v_cols[i]);
    IF v_col = '' THEN
      RAISE EXCEPTION 'INVALID_COLUMN: empty column name in select list' USING ERRCODE = '42501';
    END IF;
    IF v_col !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
      RAISE EXCEPTION 'INVALID_COLUMN: "%" contains invalid characters or is not a valid column name', v_col USING ERRCODE = '42501';
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 2. Updated admin_select with column validation
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_select(
  p_session_token text,
  p_table text,
  p_select text DEFAULT '*',
  p_order_col text DEFAULT NULL,
  p_order_dir text DEFAULT 'desc',
  p_limit int DEFAULT NULL,
  p_eq_col text DEFAULT NULL,
  p_eq_val text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_sql text;
  v_result jsonb;
  v_allowed_tables text[] := ARRAY[
    'admin_users', 'user_profiles', 'pages', 'audit_events', 'ai_chats',
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'subscriptions', 'payments', 'email_campaigns', 'roadmap_items',
    'integrations', 'api_keys', 'notifications', 'teams', 'workspace_settings',
    'webhook_endpoints', 'webhook_deliveries', 'collaboration_sessions',
    'banned_users', 'support_messages', 'platform_settings'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  PERFORM validate_select_columns(p_select);
  v_sql := 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (SELECT ' || p_select || ' FROM ' || quote_ident(p_table) || ' WHERE true';
  IF p_eq_col IS NOT NULL AND p_eq_val IS NOT NULL THEN
    v_sql := v_sql || ' AND ' || quote_ident(p_eq_col) || ' = ' || quote_literal(p_eq_val);
  END IF;
  IF p_order_col IS NOT NULL THEN
    v_sql := v_sql || ' ORDER BY ' || quote_ident(p_order_col) || ' ' || CASE WHEN p_order_dir = 'asc' THEN 'ASC' ELSE 'DESC' END;
  END IF;
  IF p_limit IS NOT NULL THEN
    v_sql := v_sql || ' LIMIT ' || p_limit;
  END IF;
  v_sql := v_sql || ') t';
  EXECUTE v_sql INTO v_result;
  RETURN v_result;
END;
$$;

-- ============================================================
-- 3. Expired session cleanup function
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  DELETE FROM admin_sessions
  WHERE (expires_at < now() OR lifted_at IS NOT NULL)
    AND created_at < now() - interval '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 4. RPC: AI events today (replaces direct anon-key query)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ai_events_today_count(p_session_token text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_count int;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');
  SELECT count(*) INTO v_count
  FROM audit_events
  WHERE action IN ('ai_edit', 'ai_generated')
    AND created_at >= now()::date;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 5. RPC: Insert audit event (future migration path for main app)
-- ============================================================
CREATE OR REPLACE FUNCTION public.insert_audit_event(
  p_page_id uuid DEFAULT NULL,
  p_block_id text DEFAULT NULL,
  p_user_id text DEFAULT NULL,
  p_user_name text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_block_type text DEFAULT NULL,
  p_content_before jsonb DEFAULT NULL,
  p_content_after jsonb DEFAULT NULL,
  p_detail text DEFAULT NULL,
  p_ai_provider text DEFAULT NULL,
  p_ai_model text DEFAULT NULL,
  p_ai_prompt_tokens int DEFAULT NULL,
  p_ai_completion_tokens int DEFAULT NULL,
  p_ai_latency_ms int DEFAULT NULL,
  p_ai_tool_calls jsonb DEFAULT NULL,
  p_ai_cost numeric DEFAULT NULL,
  p_ai_undo_ref text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_user_name IS NULL OR p_action IS NULL THEN
    RAISE EXCEPTION 'user_id, user_name, and action are required' USING ERRCODE = '42501';
  END IF;
  IF p_action !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
    RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE = '42501';
  END IF;
  v_id := gen_random_uuid();
  INSERT INTO audit_events (
    id, page_id, block_id, user_id, user_name, action, block_type,
    content_before, content_after, detail,
    ai_provider, ai_model, ai_prompt_tokens, ai_completion_tokens,
    ai_latency_ms, ai_tool_calls, ai_cost, ai_undo_ref
  ) VALUES (
    v_id, p_page_id, p_block_id, p_user_id, p_user_name, p_action, p_block_type,
    p_content_before, p_content_after, p_detail,
    p_ai_provider, p_ai_model, p_ai_prompt_tokens, p_ai_completion_tokens,
    p_ai_latency_ms, p_ai_tool_calls, p_ai_cost, p_ai_undo_ref
  );
  RETURN v_id;
END;
$$;

-- ============================================================
-- 6. Admin security audit log table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_users(id),
  admin_name text NOT NULL DEFAULT 'unknown',
  action text NOT NULL,
  target_type text,
  target_id text,
  target_name text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_audit_log_rpc_only" ON public.admin_audit_log FOR ALL USING (false);

-- ============================================================
-- 7. Helper: log_admin_action (SECURITY DEFINER bypasses RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id uuid,
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_target_name text DEFAULT NULL,
  p_detail jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_id uuid;
  v_admin_name text;
BEGIN
  SELECT COALESCE(name, 'unknown') INTO v_admin_name
  FROM admin_users WHERE id = p_admin_id;
  INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, target_name, detail)
  VALUES (p_admin_id, v_admin_name, p_action, p_target_type, p_target_id, p_target_name, p_detail)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================
-- 8. RPC: Read admin audit log (authorized)
-- ============================================================
CREATE OR REPLACE FUNCTION public.read_admin_audit_log(
  p_session_token text,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_result jsonb;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'admin');
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT id, admin_id, admin_name, action, target_type, target_id, target_name, detail, created_at
    FROM admin_audit_log
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  RETURN v_result;
END;
$$;

-- ============================================================
-- 9. Updated ban_user with audit logging
-- ============================================================
CREATE OR REPLACE FUNCTION public.ban_user(
  p_user_id uuid,
  p_reason text,
  p_ban_type text,
  p_expires_at timestamptz DEFAULT NULL,
  p_session_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_email text;
  v_name text;
  v_user_id_text text;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'admin');
  v_user_id_text := p_user_id::text;
  SELECT email, user_name INTO v_email, v_name
  FROM user_profiles WHERE user_id = v_user_id_text LIMIT 1;
  INSERT INTO banned_users (user_id, email, user_name, reason, ban_type, expires_at, banned_by)
  VALUES (p_user_id, COALESCE(v_email, 'unknown'), COALESCE(v_name, 'Unknown'), p_reason, p_ban_type, p_expires_at, v_admin_id);
  PERFORM log_admin_action(v_admin_id, 'ban_user', 'user', v_user_id_text, v_name,
    jsonb_build_object('reason', p_reason, 'ban_type', p_ban_type, 'expires_at', p_expires_at::text));
  RETURN TRUE;
END;
$$;

-- ============================================================
-- 10. Updated hard_ban_user with audit logging
-- ============================================================
CREATE OR REPLACE FUNCTION public.hard_ban_user(
  p_user_id uuid,
  p_reason text,
  p_session_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_email text;
  v_name text;
  v_user_id_text text;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'admin');
  v_user_id_text := p_user_id::text;
  SELECT email, user_name INTO v_email, v_name
  FROM user_profiles WHERE user_id = v_user_id_text LIMIT 1;
  INSERT INTO banned_users (user_id, email, user_name, reason, ban_type, banned_by)
  VALUES (p_user_id, COALESCE(v_email, 'unknown'), COALESCE(v_name, 'Unknown'), p_reason, 'hard', v_admin_id);
  DELETE FROM collaboration_sessions WHERE user_id = v_user_id_text;
  DELETE FROM block_locks WHERE user_id = v_user_id_text;
  DELETE FROM page_permissions WHERE user_id = v_user_id_text;
  DELETE FROM page_versions WHERE user_id = v_user_id_text;
  DELETE FROM ai_chats WHERE user_id = v_user_id_text;
  DELETE FROM audit_events WHERE user_id = v_user_id_text;
  PERFORM log_admin_action(v_admin_id, 'hard_ban_user', 'user', v_user_id_text, v_name,
    jsonb_build_object('reason', p_reason));
  RETURN TRUE;
END;
$$;

-- ============================================================
-- 11. Updated unban_user with audit logging
-- ============================================================
CREATE OR REPLACE FUNCTION public.unban_user(
  p_user_id uuid,
  p_session_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_name text;
  v_user_id_text text;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'admin');
  v_user_id_text := p_user_id::text;
  SELECT user_name INTO v_name FROM banned_users WHERE user_id = p_user_id AND lifted_at IS NULL LIMIT 1;
  UPDATE banned_users SET lifted_at = now()
  WHERE user_id = p_user_id AND lifted_at IS NULL;
  IF FOUND THEN
    PERFORM log_admin_action(v_admin_id, 'unban_user', 'user', v_user_id_text, v_name, NULL);
  END IF;
  RETURN FOUND;
END;
$$;

-- ============================================================
-- 12. Updated set_admin_password with audit logging
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_admin_password(
  p_email text,
  p_password text,
  p_session_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_target_admin_id uuid;
  v_target_name text;
BEGIN
  IF p_session_token IS NOT NULL THEN
    v_admin_id := require_admin_role(p_session_token, 'super_admin');
  ELSE
    IF EXISTS (SELECT 1 FROM admin_users LIMIT 1) THEN
      RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
    END IF;
  END IF;
  SELECT id, COALESCE(name, p_email) INTO v_target_admin_id, v_target_name
  FROM admin_users WHERE email = p_email;
  UPDATE admin_users
  SET password_hash = crypt(p_password, gen_salt('bf'))
  WHERE email = p_email;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  IF v_admin_id IS NOT NULL THEN
    PERFORM log_admin_action(v_admin_id, 'set_password', 'admin', v_target_admin_id::text, v_target_name, NULL);
  END IF;
  RETURN TRUE;
END;
$$;

-- ============================================================
-- 13. Updated admin_update (added admin_users to whitelist + audit logging)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_update(
  p_session_token text,
  p_table text,
  p_id uuid,
  p_data jsonb,
  p_min_role text DEFAULT 'support'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_sql text;
  v_key text;
  v_val text;
  v_allowed_tables text[] := ARRAY[
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'webhook_endpoints', 'platform_settings', 'email_campaigns',
    'notifications', 'api_keys', 'admin_users'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  FOR v_key, v_val IN SELECT * FROM jsonb_each_text(p_data)
  LOOP
    IF v_sql IS NULL THEN
      v_sql := format('UPDATE %s SET %s = %L', quote_ident(p_table), quote_ident(v_key), v_val);
    ELSE
      v_sql := v_sql || format(', %s = %L', quote_ident(v_key), v_val);
    END IF;
  END LOOP;
  IF v_sql IS NULL THEN RETURN FALSE; END IF;
  v_sql := v_sql || format(' WHERE id = %L', p_id);
  EXECUTE v_sql;
  IF FOUND AND p_table = 'admin_users' THEN
    PERFORM log_admin_action(v_admin_id, 'update_admin', 'admin', p_id::text, NULL,
      jsonb_build_object('data', p_data));
  END IF;
  RETURN FOUND;
END;
$$;

-- ============================================================
-- 14. Updated admin_insert with audit logging for admin_users
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_insert(
  p_session_token text,
  p_table text,
  p_data jsonb,
  p_min_role text DEFAULT 'support'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_keys text;
  v_vals text;
  v_new_id uuid;
  v_allowed_tables text[] := ARRAY[
    'feature_flags', 'webhook_endpoints', 'email_campaigns',
    'admin_users', 'subscriptions', 'support_tickets'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  v_new_id := gen_random_uuid();
  SELECT string_agg(quote_ident(key), ', '),
         string_agg(CASE WHEN value IS NULL THEN 'NULL' ELSE quote_literal(value::text) END, ', ')
  INTO v_keys, v_vals
  FROM jsonb_each_text(p_data);
  EXECUTE format('INSERT INTO %s (id, %s) VALUES (%L, %s) RETURNING id',
    quote_ident(p_table), v_keys, v_new_id, v_vals) INTO v_new_id;
  IF p_table = 'admin_users' AND v_new_id IS NOT NULL THEN
    PERFORM log_admin_action(v_admin_id, 'create_admin', 'admin', v_new_id::text, NULL,
      jsonb_build_object('data', p_data));
  END IF;
  RETURN v_new_id;
END;
$$;

-- ============================================================
-- 15. Updated admin_delete with audit logging for admin_users
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_delete(
  p_session_token text,
  p_table text,
  p_id uuid,
  p_min_role text DEFAULT 'support'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_target_name text;
  v_allowed_tables text[] := ARRAY[
    'feature_flags', 'waitlist_entries', 'feedback', 'support_tickets',
    'webhook_endpoints', 'email_campaigns', 'notifications', 'api_keys',
    'admin_users'
  ];
BEGIN
  v_admin_id := require_admin_role(p_session_token, p_min_role);
  IF NOT (p_table = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  IF p_table = 'admin_users' THEN
    SELECT name INTO v_target_name FROM admin_users WHERE id = p_id;
  END IF;
  EXECUTE format('DELETE FROM %s WHERE id = %L', quote_ident(p_table), p_id);
  IF FOUND AND p_table = 'admin_users' THEN
    PERFORM log_admin_action(v_admin_id, 'delete_admin', 'admin', p_id::text, v_target_name, NULL);
  END IF;
  RETURN FOUND;
END;
$$;
