-- ============================================================
-- Migration: Admin password reset via email
-- ============================================================

-- 1. Password reset requests table
CREATE TABLE IF NOT EXISTS public.admin_password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_password_reset_requests_token ON public.admin_password_reset_requests(token);
CREATE INDEX IF NOT EXISTS idx_admin_password_reset_requests_email ON public.admin_password_reset_requests(email);

ALTER TABLE public.admin_password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon to insert reset requests" ON public.admin_password_reset_requests
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon to select by token" ON public.admin_password_reset_requests
  FOR SELECT TO anon USING (true);

GRANT INSERT, SELECT ON public.admin_password_reset_requests TO anon;
GRANT INSERT, SELECT, UPDATE ON public.admin_password_reset_requests TO authenticated;
GRANT INSERT, SELECT, UPDATE ON public.admin_password_reset_requests TO service_role;

-- 2. RPC: Request password reset (generates token, returns it so frontend can send email)
CREATE OR REPLACE FUNCTION public.request_admin_password_reset(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_token text;
  v_admin_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM admin_users WHERE email = p_email) INTO v_admin_exists;

  IF NOT v_admin_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'ADMIN_NOT_FOUND');
  END IF;

  -- Invalidate any existing unused tokens for this email
  UPDATE admin_password_reset_requests
  SET used = TRUE
  WHERE email = p_email AND used = FALSE;

  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Insert reset request (expires in 1 hour)
  INSERT INTO admin_password_reset_requests (email, token, expires_at)
  VALUES (p_email, v_token, now() + interval '1 hour');

  RETURN jsonb_build_object('success', true, 'token', v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_admin_password_reset(text) TO anon;
GRANT EXECUTE ON FUNCTION public.request_admin_password_reset(text) TO authenticated;

-- 3. RPC: Reset password using token
CREATE OR REPLACE FUNCTION public.reset_admin_password_with_token(p_token text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_reset admin_password_reset_requests%ROWTYPE;
  v_admin_id uuid;
  v_admin_email text;
  v_admin_name text;
BEGIN
  -- Validate password complexity (same as set_admin_password)
  IF length(p_password) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'PASSWORD_TOO_SHORT');
  END IF;

  IF p_password !~ '[A-Za-z]' OR p_password !~ '[0-9]' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PASSWORD_MUST_CONTAIN_LETTERS_AND_NUMBERS');
  END IF;

  -- Find valid unused token
  SELECT * INTO v_reset
  FROM admin_password_reset_requests
  WHERE token = p_token AND used = FALSE AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_TOKEN');
  END IF;

  -- Get admin details
  SELECT id, email, COALESCE(name, email) INTO v_admin_id, v_admin_email, v_admin_name
  FROM admin_users WHERE email = v_reset.email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ADMIN_NOT_FOUND');
  END IF;

  -- Update password hash
  UPDATE admin_users
  SET password_hash = crypt(p_password, gen_salt('bf'))
  WHERE email = v_reset.email;

  -- Mark token as used
  UPDATE admin_password_reset_requests
  SET used = TRUE
  WHERE id = v_reset.id;

  -- Invalidate existing sessions for this admin
  UPDATE admin_sessions
  SET lifted_at = now()
  WHERE admin_id = v_admin_id AND lifted_at IS NULL;

  -- Log the password reset action
  PERFORM log_admin_action(v_admin_id, 'password_reset', 'admin', v_admin_id::text, v_admin_name, NULL);

  RETURN jsonb_build_object('success', true, 'email', v_admin_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_admin_password_with_token(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.reset_admin_password_with_token(text, text) TO authenticated;

-- 4. Cleanup expired tokens (can be run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_resets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM admin_password_reset_requests
  WHERE expires_at < now() OR used = TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_password_resets() TO service_role;
