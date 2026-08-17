-- User detail page: database storage usage + admin actions on a specific user.
-- Adds two SECURITY DEFINER RPCs used by the admin UserDetail page:
--   1. admin_user_storage        -> per-table byte usage for one user (clerk id)
--   2. read_admin_user_audit     -> admin_audit_log rows whose target_id = a profile uuid

-- ── 1. admin_user_storage ──
CREATE OR REPLACE FUNCTION public.admin_user_storage(p_session_token text, p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_pages_rows bigint;     v_pages_bytes bigint;
  v_chats_rows bigint;     v_chats_bytes bigint;
  v_audit_rows bigint;     v_audit_bytes bigint;
  v_versions_rows bigint;  v_versions_bytes bigint;
  v_sessions_rows bigint;  v_sessions_bytes bigint;
  v_perms_rows bigint;     v_perms_bytes bigint;
  v_locks_rows bigint;     v_locks_bytes bigint;
  v_profile_bytes bigint;
  v_total bigint;
  v_tables jsonb;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');

  SELECT count(*), COALESCE(sum(
      coalesce(pg_column_size(blocks),0) + coalesce(pg_column_size(tags),0) + coalesce(pg_column_size(lineage),0) +
      coalesce(octet_length(encrypted_blocks),0) + coalesce(octet_length(title),0) +
      coalesce(octet_length(cover),0) + coalesce(octet_length(icon),0)),0)
    INTO v_pages_rows, v_pages_bytes
  FROM pages WHERE user_id = p_user_id;

  SELECT count(*), COALESCE(sum(
      coalesce(pg_column_size(messages),0) + coalesce(pg_column_size(collaborators),0) +
      coalesce(octet_length(name),0) + coalesce(octet_length(page_title),0)),0)
    INTO v_chats_rows, v_chats_bytes
  FROM ai_chats WHERE user_id = p_user_id;

  SELECT count(*), COALESCE(sum(
      coalesce(pg_column_size(content_before),0) + coalesce(pg_column_size(content_after),0) +
      coalesce(octet_length(detail),0) + coalesce(octet_length(block_type),0)),0)
    INTO v_audit_rows, v_audit_bytes
  FROM audit_events WHERE user_id = p_user_id;

  SELECT count(*), COALESCE(sum(
      coalesce(pg_column_size(blocks),0) + coalesce(pg_column_size(page_snapshot),0) +
      coalesce(octet_length(title),0)),0)
    INTO v_versions_rows, v_versions_bytes
  FROM page_versions WHERE user_id = p_user_id;

  SELECT count(*), COALESCE(sum(pg_column_size(c)),0)
    INTO v_sessions_rows, v_sessions_bytes
  FROM collaboration_sessions c WHERE c.user_id = p_user_id;

  SELECT count(*), COALESCE(sum(pg_column_size(p)),0)
    INTO v_perms_rows, v_perms_bytes
  FROM page_permissions p WHERE p.user_id = p_user_id;

  SELECT count(*), COALESCE(sum(pg_column_size(b)),0)
    INTO v_locks_rows, v_locks_bytes
  FROM block_locks b WHERE b.user_id = p_user_id;

  SELECT COALESCE(pg_column_size(p),0) INTO v_profile_bytes
  FROM user_profiles p WHERE p.user_id = p_user_id LIMIT 1;

  v_total := v_pages_bytes + v_chats_bytes + v_audit_bytes + v_versions_bytes +
             v_sessions_bytes + v_perms_bytes + v_locks_bytes + v_profile_bytes;

  v_tables := jsonb_build_array(
    jsonb_build_object('table','pages','label','Pages','rows',v_pages_rows,'bytes',v_pages_bytes),
    jsonb_build_object('table','ai_chats','label','AI Chats','rows',v_chats_rows,'bytes',v_chats_bytes),
    jsonb_build_object('table','audit_events','label','Audit Events','rows',v_audit_rows,'bytes',v_audit_bytes),
    jsonb_build_object('table','page_versions','label','Page Versions','rows',v_versions_rows,'bytes',v_versions_bytes),
    jsonb_build_object('table','collaboration_sessions','label','Collab Sessions','rows',v_sessions_rows,'bytes',v_sessions_bytes),
    jsonb_build_object('table','page_permissions','label','Permissions','rows',v_perms_rows,'bytes',v_perms_bytes),
    jsonb_build_object('table','block_locks','label','Block Locks','rows',v_locks_rows,'bytes',v_locks_bytes),
    jsonb_build_object('table','user_profiles','label','Profile Row','rows',1,'bytes',v_profile_bytes)
  );

  RETURN jsonb_build_object('total_bytes', v_total, 'tables', v_tables);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_user_storage(text, text) TO anon;

-- ── 2. read_admin_user_audit ──
CREATE OR REPLACE FUNCTION public.read_admin_user_audit(
  p_session_token text,
  p_target_id text,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_result jsonb;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'support');

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT id, admin_id, admin_name, action, target_type, target_id, target_name, detail, created_at
    FROM admin_audit_log
    WHERE target_id = p_target_id
    ORDER BY created_at DESC
    LIMIT p_limit
  ) t;

  RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.read_admin_user_audit(text, text, integer) TO anon;
