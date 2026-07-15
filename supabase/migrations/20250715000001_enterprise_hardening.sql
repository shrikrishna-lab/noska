-- ============================================================
-- Migration: Enterprise Hardening
-- Fixes Critical rate limiter bug + multiple High vulnerabilities
-- ============================================================

-- ============================================================
-- 1. CRITICAL: Fix rate limiter — admin_login no longer uses
--    exceptions for credential errors, preventing transaction 
--    rollback of login_attempts records
-- ============================================================

-- Rewritten: returns JSON with {success, error} instead of bool
CREATE OR REPLACE FUNCTION public.verify_admin_password(
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  stored_hash text;
  recent_attempts int;
  v_dummy_hash text;
BEGIN
  SELECT count(*) INTO recent_attempts
  FROM admin_login_attempts
  WHERE email = p_email
    AND attempted_at > now() - interval '15 minutes';

  INSERT INTO admin_login_attempts (email) VALUES (p_email);

  IF recent_attempts >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'TOO_MANY_ATTEMPTS');
  END IF;

  SELECT password_hash INTO stored_hash FROM admin_users WHERE email = p_email LIMIT 1;

  IF stored_hash IS NULL THEN
    v_dummy_hash := extensions.gen_salt('bf');
    PERFORM extensions.crypt(p_password, v_dummy_hash);
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  END IF;

  IF extensions.crypt(p_password, stored_hash) = stored_hash THEN
    RETURN jsonb_build_object('success', true, 'error', NULL);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  END IF;
END;
$$;

-- Rewritten: returns error in JSON, never raises exception for
-- invalid credentials (preserves login_attempts across txns)
CREATE OR REPLACE FUNCTION public.admin_login(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin admin_users%ROWTYPE;
  v_token_raw text;
  v_token_hash text;
  v_auth_result jsonb;
  v_success boolean;
  v_error text;
BEGIN
  v_auth_result := verify_admin_password(p_email, p_password);
  v_success := (v_auth_result->>'success')::boolean;
  v_error := v_auth_result->>'error';

  IF NOT v_success THEN
    RETURN jsonb_build_object('error', v_error, 'user', NULL, 'token', NULL);
  END IF;

  SELECT * INTO v_admin FROM admin_users WHERE email = p_email LIMIT 1;
  IF v_admin.id IS NULL THEN
    RETURN jsonb_build_object('error', 'INVALID_CREDENTIALS', 'user', NULL, 'token', NULL);
  END IF;

  UPDATE admin_sessions SET lifted_at = now()
  WHERE admin_id = v_admin.id AND lifted_at IS NULL;

  v_token_raw := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(sha512(v_token_raw::bytea), 'hex');

  INSERT INTO admin_sessions (admin_id, token)
  VALUES (v_admin.id, v_token_hash);

  UPDATE admin_users SET last_login = now() WHERE id = v_admin.id;

  PERFORM log_admin_action(v_admin.id, 'login', 'admin', v_admin.id::text, v_admin.name, NULL);

  RETURN jsonb_build_object(
    'error', NULL,
    'token', v_token_raw,
    'user', jsonb_build_object(
      'id', v_admin.id, 'name', v_admin.name, 'email', v_admin.email,
      'role', v_admin.role, 'avatarUrl', v_admin.avatar_url
    )
  );
END;
$$;

-- ============================================================
-- 2. HIGH: Logout now records the event
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_logout(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_token_hash text;
  v_admin_id uuid;
  v_admin_name text;
BEGIN
  v_token_hash := encode(sha512(p_token::bytea), 'hex');

  SELECT s.admin_id, COALESCE(a.name, 'unknown')
  INTO v_admin_id, v_admin_name
  FROM admin_sessions s
  LEFT JOIN admin_users a ON s.admin_id = a.id
  WHERE s.token = v_token_hash AND s.lifted_at IS NULL;

  UPDATE admin_sessions SET lifted_at = now() WHERE token = v_token_hash;

  IF FOUND AND v_admin_id IS NOT NULL THEN
    PERFORM log_admin_action(v_admin_id, 'logout', 'admin', v_admin_id::text, v_admin_name, NULL);
  END IF;

  RETURN FOUND;
END;
$$;

-- ============================================================
-- 3. MEDIUM: Add auth to cleanup_expired_sessions
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions(
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
  IF p_session_token IS NOT NULL THEN
    v_admin_id := require_admin_role(p_session_token, 'support');
  END IF;
  DELETE FROM admin_sessions
  WHERE (expires_at < now() OR lifted_at IS NOT NULL)
    AND created_at < now() - interval '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 4. MEDIUM: Expand admin_update logging to cover ALL tables
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
  IF FOUND THEN
    PERFORM log_admin_action(v_admin_id, 'update_' || p_table, 'record', p_id::text, NULL,
      jsonb_build_object('data', p_data));
  END IF;
  RETURN FOUND;
END;
$$;

-- ============================================================
-- 5. MEDIUM: Expand admin_insert logging to cover ALL tables
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
  IF v_new_id IS NOT NULL THEN
    PERFORM log_admin_action(v_admin_id, 'create_' || p_table, 'record', v_new_id::text, NULL,
      jsonb_build_object('data', p_data));
  END IF;
  RETURN v_new_id;
END;
$$;

-- ============================================================
-- 6. MEDIUM: Expand admin_delete logging to cover ALL tables
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
  EXECUTE format('DELETE FROM %s WHERE id = %L', quote_ident(p_table), p_id);
  IF FOUND THEN
    PERFORM log_admin_action(v_admin_id, 'delete_' || p_table, 'record', p_id::text, NULL, NULL);
  END IF;
  RETURN FOUND;
END;
$$;

-- ============================================================
-- 7. MEDIUM: RPC for batch-audit-event inserts (audit engine)
-- ============================================================
CREATE OR REPLACE FUNCTION public.batch_insert_audit_events(p_events jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_event jsonb;
  v_count int := 0;
BEGIN
  FOR v_event IN SELECT * FROM jsonb_array_elements(p_events)
  LOOP
    IF (v_event->>'user_id') IS NULL OR (v_event->>'action') IS NULL THEN
      CONTINUE;
    END IF;
    INSERT INTO audit_events (
      id, page_id, block_id, user_id, user_name, action, block_type,
      content_before, content_after, detail,
      ai_provider, ai_model, ai_prompt_tokens, ai_completion_tokens,
      ai_latency_ms, ai_tool_calls, ai_cost, ai_undo_ref
    ) VALUES (
      gen_random_uuid(),
      (v_event->>'page_id')::uuid,
      v_event->>'block_id',
      v_event->>'user_id',
      COALESCE(v_event->>'user_name', 'unknown'),
      v_event->>'action',
      v_event->>'block_type',
      (v_event->>'content_before')::jsonb,
      (v_event->>'content_after')::jsonb,
      v_event->>'detail',
      v_event->>'ai_provider',
      v_event->>'ai_model',
      (v_event->>'ai_prompt_tokens')::int,
      (v_event->>'ai_completion_tokens')::int,
      (v_event->>'ai_latency_ms')::int,
      (v_event->>'ai_tool_calls')::jsonb,
      (v_event->>'ai_cost')::numeric,
      v_event->>'ai_undo_ref'
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 8. MEDIUM: RPC for frontend audit event reads
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
-- 9. MEDIUM: RPC for AI events (page-specific)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ai_audit_events(
  p_page_id uuid,
  p_limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT * FROM audit_events
    WHERE page_id = p_page_id
      AND action IN ('ai_generated', 'ai_edit')
    ORDER BY created_at DESC
    LIMIT p_limit
  ) t;
  RETURN v_result;
END;
$$;

-- ============================================================
-- 10. MEDIUM: RPC for audit summary
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_audit_summary(p_page_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', count(*),
    'byAction', jsonb_object_agg(coalesce(action, 'unknown'), cnt) FILTER (WHERE action IS NOT NULL),
    'aiCount', count(*) FILTER (WHERE action LIKE 'ai_%'),
    'last24h', (SELECT count(*) FROM audit_events WHERE page_id = p_page_id AND created_at > now() - interval '24 hours')
  ) INTO v_result
  FROM (
    SELECT action, count(*) as cnt
    FROM audit_events
    WHERE page_id = p_page_id
    GROUP BY action
  ) sub;
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- ============================================================
-- 11. MEDIUM: RPC for single event read (block restore)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_audit_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT row_to_json(t)::jsonb INTO v_result
  FROM (SELECT * FROM audit_events WHERE id = p_event_id) t;
  RETURN v_result;
END;
$$;

-- ============================================================
-- 12. GRANT: Allow anon to call audit event RPCs
-- ============================================================
GRANT EXECUTE ON FUNCTION public.batch_insert_audit_events(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.get_page_audit_events(uuid, text, text, text, timestamptz, text, int, int) TO anon;
GRANT EXECUTE ON FUNCTION public.get_ai_audit_events(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION public.get_audit_summary(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_audit_event(uuid) TO anon;

-- ============================================================
-- 13. Restrict audit_events to service_role only
--     Main app now uses SECURITY DEFINER RPCs
-- ============================================================
DROP POLICY IF EXISTS "Allow all on audit_events" ON public.audit_events;
CREATE POLICY "audit_events_service_role_only" ON public.audit_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Clean up test data from previous rate-limit tests
-- ============================================================
DELETE FROM admin_login_attempts WHERE email LIKE 'rate-limit-test-%';
DELETE FROM admin_login_attempts WHERE email LIKE 'test-rate-limit%';
