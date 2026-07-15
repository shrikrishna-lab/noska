-- ============================================================
-- Migration: Grant audit RPCs to anon + restrict audit_events RLS
-- + password complexity, session invalidation, search limits, cleanup
-- ============================================================

-- ============================================================
-- 1. Password complexity + session invalidation on change
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
  IF length(p_password) < 8 THEN
    RAISE EXCEPTION 'PASSWORD_TOO_SHORT' USING ERRCODE = '42501';
  END IF;

  IF p_password !~ '[A-Za-z]' OR p_password !~ '[0-9]' THEN
    RAISE EXCEPTION 'PASSWORD_MUST_CONTAIN_LETTERS_AND_NUMBERS' USING ERRCODE = '42501';
  END IF;

  IF p_session_token IS NOT NULL THEN
    v_admin_id := require_admin_role(p_session_token, 'super_admin');
  ELSE
    IF EXISTS (SELECT 1 FROM admin_users LIMIT 1) THEN
      RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT id, COALESCE(name, p_email) INTO v_target_admin_id, v_target_name
  FROM admin_users WHERE email = p_email;

  IF v_target_admin_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE admin_users
  SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
  WHERE email = p_email;

  UPDATE admin_sessions SET lifted_at = now()
  WHERE admin_id = v_target_admin_id AND lifted_at IS NULL;

  IF v_admin_id IS NOT NULL THEN
    PERFORM log_admin_action(v_admin_id, 'set_password', 'admin', v_target_admin_id::text, v_target_name, NULL);
  END IF;

  RETURN TRUE;
END;
$$;

-- ============================================================
-- 2. Search length + limit/offset validation on get_page_audit_events
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_page_audit_events(
  p_page_id uuid,
  p_block_id text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_user_id text DEFAULT NULL,
  p_since timestamptz DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb;
  v_sql text;
BEGIN
  IF p_limit > 500 THEN
    RAISE EXCEPTION 'LIMIT_TOO_LARGE' USING ERRCODE = '42501';
  END IF;

  IF p_offset > 10000 THEN
    RAISE EXCEPTION 'OFFSET_TOO_LARGE' USING ERRCODE = '42501';
  END IF;

  v_sql := 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (SELECT * FROM audit_events WHERE true';

  IF p_page_id IS NOT NULL THEN
    v_sql := v_sql || ' AND page_id = ' || quote_literal(p_page_id::text);
  END IF;
  IF p_block_id IS NOT NULL THEN
    v_sql := v_sql || ' AND block_id = ' || quote_literal(p_block_id);
  END IF;
  IF p_action IS NOT NULL THEN
    v_sql := v_sql || ' AND action = ' || quote_literal(p_action);
  END IF;
  IF p_user_id IS NOT NULL THEN
    v_sql := v_sql || ' AND user_id = ' || quote_literal(p_user_id);
  END IF;
  IF p_since IS NOT NULL THEN
    v_sql := v_sql || ' AND created_at >= ' || quote_literal(p_since::text);
  END IF;
  IF p_search IS NOT NULL AND p_search != '' THEN
    IF length(p_search) > 200 THEN
      RAISE EXCEPTION 'SEARCH_TOO_LONG' USING ERRCODE = '42501';
    END IF;
    v_sql := v_sql || ' AND (detail ILIKE ' || quote_literal('%' || p_search || '%');
    v_sql := v_sql || ' OR (content_after->>''text'') ILIKE ' || quote_literal('%' || p_search || '%') || ')';
  END IF;

  v_sql := v_sql || ' ORDER BY created_at DESC LIMIT ' || p_limit;

  IF p_offset > 0 THEN
    v_sql := v_sql || ' OFFSET ' || p_offset;
  END IF;

  v_sql := v_sql || ') t';

  EXECUTE v_sql INTO v_result;
  RETURN v_result;
END;
$$;

-- ============================================================
-- 3. Audit log retention/cleanup function
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_admin_audit_log(
  p_retention_days int DEFAULT 365,
  p_session_token text DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_count int;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'admin');

  IF p_retention_days < 30 THEN
    RAISE EXCEPTION 'RETENTION_TOO_SHORT' USING ERRCODE = '42501';
  END IF;

  DELETE FROM admin_audit_log
  WHERE created_at < now() - (p_retention_days || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 4. GRANT EXECUTE for all audit RPCs + cleanup
-- ============================================================
GRANT EXECUTE ON FUNCTION public.batch_insert_audit_events(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.get_page_audit_events(uuid, text, text, text, timestamptz, text, int, int) TO anon;
GRANT EXECUTE ON FUNCTION public.get_ai_audit_events(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION public.get_audit_summary(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_audit_event(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_admin_audit_log(int, text) TO anon;

-- ============================================================
-- 5. Restrict audit_events to service_role only
-- ============================================================
DROP POLICY IF EXISTS "Allow all on audit_events" ON public.audit_events;
CREATE POLICY "audit_events_service_role_only" ON public.audit_events
  FOR ALL USING (auth.role() = 'service_role');
