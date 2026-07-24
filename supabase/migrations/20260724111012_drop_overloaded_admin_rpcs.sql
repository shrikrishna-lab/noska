DROP FUNCTION IF EXISTS admin_delete(p_session_token text, p_table text, p_id uuid, p_min_role text);
DROP FUNCTION IF EXISTS admin_update(p_session_token text, p_table text, p_id uuid, p_data jsonb, p_min_role text);
