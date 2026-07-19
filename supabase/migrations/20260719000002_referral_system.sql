-- ============================================================
-- Referral & Rewards System
-- ============================================================

-- Referral codes for each user
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  total_referrals int NOT NULL DEFAULT 0,
  active_referrals int NOT NULL DEFAULT 0,
  rewards_earned int NOT NULL DEFAULT 0,
  ai_credits int NOT NULL DEFAULT 0,
  xp int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_pkey PRIMARY KEY (id),
  CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  CONSTRAINT referral_codes_code_key UNIQUE (code)
);

-- Reward definitions
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('pro_days', 'ai_credits', 'badge', 'theme', 'xp', 'early_access', 'workspace_skin', 'founder_badge', 'lifetime_beta')),
  value int NOT NULL DEFAULT 0,
  min_referrals int NOT NULL DEFAULT 1,
  icon text,
  color text DEFAULT '#7CC8FF',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id)
);

-- Track individual referrals
CREATE TABLE IF NOT EXISTS public.user_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'joined', 'active', 'expired')),
  reward_claimed boolean NOT NULL DEFAULT false,
  reward_id uuid,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_referrals_pkey PRIMARY KEY (id),
  CONSTRAINT user_referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_referrals_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES referral_rewards(id) ON DELETE SET NULL,
  CONSTRAINT user_referrals_unique_pair UNIQUE (referrer_id, referred_id)
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own referral data
CREATE POLICY "users_read_own_referral_codes" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_user_referrals" ON public.user_referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "public_read_referral_rewards" ON public.referral_rewards
  FOR SELECT USING (true);

-- Insert default rewards
INSERT INTO public.referral_rewards (name, description, type, value, min_referrals, icon, color) VALUES
  ('7 Days Pro', 'Get 7 days of Noska Pro for free', 'pro_days', 7, 1, 'Zap', '#7CC8FF'),
  ('250 AI Credits', 'Unlock 250 AI credits for writing', 'ai_credits', 250, 3, 'Brain', '#8B5CF6'),
  ('15 Days Pro', 'Extended Pro access for 15 days', 'pro_days', 15, 3, 'Zap', '#7CC8FF'),
  ('Exclusive Theme', 'Unlock a premium dark theme', 'theme', 1, 5, 'Palette', '#E6D5B8'),
  ('500 AI Credits', '500 AI credits for advanced features', 'ai_credits', 500, 5, 'Brain', '#8B5CF6'),
  ('30 Days Pro', 'One month of Noska Pro', 'pro_days', 30, 5, 'Zap', '#7CC8FF'),
  ('Founder Badge', 'Exclusive founder badge on your profile', 'founder_badge', 1, 10, 'Award', '#F59E0B'),
  ('90 Days Pro', 'Three months of Pro access', 'pro_days', 90, 10, 'Zap', '#7CC8FF'),
  ('Workspace Skin', 'Custom workspace theme skin', 'workspace_skin', 1, 15, 'Paintbrush', '#E6D5B8'),
  ('500 XP', 'Bonus experience points', 'xp', 500, 15, 'Star', '#10B981'),
  ('365 Days Pro', 'Full year of Noska Pro', 'pro_days', 365, 25, 'Zap', '#7CC8FF'),
  ('Lifetime Beta Access', 'Get lifetime access to all beta features', 'lifetime_beta', 1, 25, 'Infinity', '#6366F1')
ON CONFLICT DO NOTHING;

-- Create RPC to generate referral code for a user
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (p_user_id, v_code);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique referral code';
      END IF;
    END;
  END LOOP;
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_referral_code TO anon;
GRANT EXECUTE ON FUNCTION public.generate_referral_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_referral_code TO service_role;

-- RPC to get referral stats for a user
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_referrals', COALESCE(rc.total_referrals, 0),
    'active_referrals', COALESCE(rc.active_referrals, 0),
    'rewards_earned', COALESCE(rc.rewards_earned, 0),
    'ai_credits', COALESCE(rc.ai_credits, 0),
    'xp', COALESCE(rc.xp, 0),
    'level', COALESCE(rc.level, 1),
    'code', rc.code,
    'recent_referrals', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'name', up.user_name,
        'avatar', up.avatar_url,
        'status', ur.status,
        'joined_at', ur.joined_at
      ) ORDER BY ur.created_at DESC LIMIT 5)
      FROM user_referrals ur
      JOIN user_profiles up ON up.id = ur.referred_id
      WHERE ur.referrer_id = p_user_id),
      '[]'::jsonb
    ),
    'next_rewards', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'name', rr.name,
        'description', rr.description,
        'type', rr.type,
        'value', rr.value,
        'min_referrals', rr.min_referrals,
        'icon', rr.icon,
        'color', rr.color
      ) ORDER BY rr.min_referrals ASC)
      FROM referral_rewards rr
      WHERE rr.active = true AND rr.min_referrals > COALESCE(rc.total_referrals, 0)
      LIMIT 3),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM referral_codes rc
  WHERE rc.user_id = p_user_id;

  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'total_referrals', 0, 'active_referrals', 0, 'rewards_earned', 0,
      'ai_credits', 0, 'xp', 0, 'level', 1,
      'code', NULL, 'recent_referrals', '[]'::jsonb, 'next_rewards', '[]'::jsonb
    );
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_stats TO anon;
GRANT EXECUTE ON FUNCTION public.get_referral_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_stats TO service_role;

-- Update admin_select allowed_tables
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
    'banned_users', 'support_messages', 'platform_settings',
    'workspaces',
    'referral_codes', 'referral_rewards', 'user_referrals'
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

-- Update admin_insert allowed_tables
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
    'admin_users', 'subscriptions', 'support_tickets',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'referral_rewards'
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

-- Update admin_update allowed_tables
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
    'notifications', 'api_keys', 'admin_users',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'referral_codes', 'referral_rewards', 'user_referrals'
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

-- Update admin_delete allowed_tables
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
    'admin_users',
    'changelog_entries', 'blog_posts', 'legal_pages',
    'referral_codes', 'referral_rewards', 'user_referrals'
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

GRANT ALL ON TABLE public.referral_codes TO anon;
GRANT ALL ON TABLE public.referral_codes TO authenticated;
GRANT ALL ON TABLE public.referral_codes TO service_role;
GRANT ALL ON TABLE public.referral_rewards TO anon;
GRANT ALL ON TABLE public.referral_rewards TO authenticated;
GRANT ALL ON TABLE public.referral_rewards TO service_role;
GRANT ALL ON TABLE public.user_referrals TO anon;
GRANT ALL ON TABLE public.user_referrals TO authenticated;
GRANT ALL ON TABLE public.user_referrals TO service_role;
