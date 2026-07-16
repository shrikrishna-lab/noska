-- ============================================================
-- Migration: Add SECURITY DEFINER RPC to check if any admin
-- accounts exist, bypassing RLS so the admin SPA's anon-key
-- client can determine whether to show the setup or login form.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_admin_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users LIMIT 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_admin_exists() TO anon;
GRANT EXECUTE ON FUNCTION public.check_admin_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_exists() TO service_role;

-- ============================================================
-- SECURITY DEFINER RPC to create the very first admin account.
-- Only works when no admin exists yet (same pattern as
-- set_admin_password's null-session-token path).
-- ============================================================
CREATE OR REPLACE FUNCTION public.setup_first_admin(
  p_email text,
  p_name text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_role text := 'super_admin';
BEGIN
  -- Only allow setup when no admin exists
  IF EXISTS (SELECT 1 FROM admin_users LIMIT 1) THEN
    RAISE EXCEPTION 'ADMIN_ALREADY_EXISTS' USING ERRCODE = '42501';
  END IF;

  -- Create the admin record
  INSERT INTO admin_users (name, email, role)
  VALUES (p_name, p_email, v_role)
  RETURNING id INTO v_admin_id;

  -- Set password
  UPDATE admin_users
  SET password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = v_admin_id;

  RETURN jsonb_build_object('id', v_admin_id, 'name', p_name, 'email', p_email, 'role', v_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.setup_first_admin(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.setup_first_admin(text, text, text) TO authenticated;
