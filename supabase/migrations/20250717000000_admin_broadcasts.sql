-- ============================================================
-- Migration: Admin Broadcasts (notification campaigns)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'announcement', 'alert')),
  target_type text NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'random', 'selected', 'per_user')),
  target_count int DEFAULT NULL,
  target_users text[] DEFAULT NULL,
  send_immediately boolean DEFAULT false,
  scheduled_at timestamptz DEFAULT NULL,
  schedule_start timestamptz DEFAULT NULL,
  schedule_end timestamptz DEFAULT NULL,
  random_delay_minutes boolean DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  sent_count int DEFAULT 0,
  total_count int DEFAULT 0,
  created_by uuid REFERENCES admin_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_broadcasts_rpc_only" ON public.admin_broadcasts FOR ALL USING (false);

GRANT ALL ON TABLE public.admin_broadcasts TO anon;

-- Note: admin_select/insert/update/delete RPCs have been updated in this
-- migration to include admin_broadcasts in their allowed_tables arrays.
-- See the MCP-applied migration for the full RPC definitions.
