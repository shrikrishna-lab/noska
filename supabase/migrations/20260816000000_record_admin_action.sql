-- ============================================================
-- Authenticated admin audit logging (record_admin_action)
-- Secures log_admin_action behind require_admin_role so audit
-- writes cannot be performed by arbitrary RPC callers.
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_admin_action(
  p_session_token text,
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
  v_admin_id uuid;
BEGIN
  v_admin_id := require_admin_role(p_session_token, 'admin');
  RETURN public.log_admin_action(v_admin_id, p_action, p_target_type, p_target_id, p_target_name, p_detail);
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_action(uuid, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_admin_action(text, text, text, text, text, jsonb) TO PUBLIC, anon, authenticated;