-- ============================================================================
-- Noska Company Workspace — Extend existing organization schema for pages
--
-- The database already has: organizations, organization_members,
-- organization_invitations, company_teams, company_team_members,
-- audit_logs, roles, member_roles, departments
--
-- This migration adds:
--   1. pages.team_id + pages.visibility columns
--   2. RLS policies for org/team page visibility
--   3. RPC functions for organization operations
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extend pages table with team + visibility
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'pages' AND column_name = 'team_id') THEN
    ALTER TABLE public.pages ADD COLUMN team_id uuid REFERENCES public.company_teams(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'pages' AND column_name = 'visibility') THEN
    ALTER TABLE public.pages ADD COLUMN visibility text NOT NULL DEFAULT 'private'
      CHECK (visibility IN ('private','team','company','public'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pages_team ON public.pages (team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pages_visibility ON public.pages (visibility);

-- ----------------------------------------------------------------------------
-- 2. Updated pages RLS — org/team visibility
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS pages_select_own_or_shared ON public.pages;
CREATE POLICY pages_select_own_or_shared ON public.pages
  FOR SELECT TO authenticated
  USING (
    user_id = (auth.uid())::text
    OR (
      organization_id IS NOT NULL
      AND visibility IN ('company', 'team')
      AND public.fn_is_org_member(organization_id, (auth.uid())::text)
    )
    OR (
      team_id IS NOT NULL
      AND visibility = 'team'
      AND EXISTS (
        SELECT 1 FROM public.company_team_members ctm
        JOIN public.company_teams ct ON ct.id = ctm.team_id
        WHERE ctm.team_id = pages.team_id
          AND ctm.organization_member_id IN (
            SELECT om.id FROM public.organization_members om
            WHERE om.user_id = (auth.uid())::text AND om.organization_id = pages.organization_id
          )
          AND ctm.left_at IS NULL
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.page_permissions pp
        WHERE pp.page_id = pages.id AND pp.user_id = (auth.uid())::text
      )
    )
    OR visibility = 'public'
  );

-- Also drop the overly-broad public policies and replace with scoped ones
DROP POLICY IF EXISTS pages_select_all ON public.pages;
CREATE POLICY pages_select_public ON public.pages
  FOR SELECT TO authenticated
  USING (visibility = 'public');

DROP POLICY IF EXISTS pages_update_all ON public.pages;

-- ----------------------------------------------------------------------------
-- 3. RPC: Create organization (wraps existing tables)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_organization(
  p_name text,
  p_slug text,
  p_description text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
  v_user_id text;
  v_member_id uuid;
  v_role_id uuid;
BEGIN
  v_user_id := (auth.uid())::text;

  INSERT INTO public.organizations (name, slug, description, created_by, status)
  VALUES (p_name, p_slug, p_description, v_user_id, 'active')
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, job_title, status)
  VALUES (v_org_id, v_user_id, 'Organization Owner', 'active')
  RETURNING id INTO v_member_id;

  SELECT id INTO v_role_id FROM public.roles
  WHERE organization_id = v_org_id AND name = 'Organization Owner' LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.member_roles (organization_member_id, role_id, scope_type, assigned_by)
    VALUES (v_member_id, v_role_id, 'organization', v_user_id);
  END IF;

  INSERT INTO public.audit_logs (organization_id, actor_id, action, target_resource, details)
  VALUES (v_org_id, v_user_id, 'organization.created', 'organization', jsonb_build_object('name', p_name));

  RETURN v_org_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RPC: Invite to organization
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invite_to_organization(
  p_org_id uuid,
  p_email text,
  p_job_title text DEFAULT 'Team Member'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id text;
  v_invite_id uuid;
BEGIN
  v_user_id := (auth.uid())::text;

  IF NOT public.fn_is_org_admin(p_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Only admins can invite members';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_invitations
    WHERE organization_id = p_org_id AND email = p_email AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Invitation already pending for this email';
  END IF;

  INSERT INTO public.organization_invitations (organization_id, email, invited_by, job_title, status)
  VALUES (p_org_id, p_email, v_user_id, p_job_title, 'pending')
  RETURNING id INTO v_invite_id;

  INSERT INTO public.audit_logs (organization_id, actor_id, action, target_resource, details)
  VALUES (p_org_id, v_user_id, 'member.invited', 'invitation', jsonb_build_object('email', p_email));

  RETURN v_invite_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: Accept organization invitation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_invite_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite RECORD;
  v_user_id text;
  v_member_id uuid;
BEGIN
  v_user_id := (auth.uid())::text;

  SELECT * INTO v_invite FROM public.organization_invitations
  WHERE id = p_invite_id AND status = 'pending' AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, job_title, status)
  VALUES (v_invite.organization_id, v_user_id, v_invite.job_title, 'active')
  RETURNING id INTO v_member_id;

  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = p_invite_id;

  INSERT INTO public.audit_logs (organization_id, actor_id, action, target_resource, details)
  VALUES (v_invite.organization_id, v_user_id, 'member.joined', 'member',
    jsonb_build_object('via', 'invitation'));

  RETURN v_invite.organization_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. RPC: Remove organization member
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_organization_member(
  p_org_id uuid,
  p_user_id text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id text;
BEGIN
  v_actor_id := (auth.uid())::text;

  IF NOT public.fn_is_org_admin(p_org_id, v_actor_id) THEN
    RAISE EXCEPTION 'Only admins can remove members';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organizations WHERE id = p_org_id AND created_by = p_user_id
  ) THEN
    RAISE EXCEPTION 'Cannot remove the organization owner';
  END IF;

  DELETE FROM public.organization_members
  WHERE organization_id = p_org_id AND user_id = p_user_id;

  INSERT INTO public.audit_logs (organization_id, actor_id, action, target_resource, details)
  VALUES (p_org_id, v_actor_id, 'member.removed', 'member', jsonb_build_object('removed_user', p_user_id));

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. RPC: Create team in organization
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_organization_team(
  p_org_id uuid,
  p_name text,
  p_description text DEFAULT '',
  p_icon text DEFAULT '👥',
  p_color text DEFAULT '#10b981'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id text;
  v_team_id uuid;
  v_member_id uuid;
BEGIN
  v_user_id := (auth.uid())::text;

  IF NOT public.fn_is_org_admin(p_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Only admins can create teams';
  END IF;

  INSERT INTO public.company_teams (organization_id, name, description, icon, color, leader_id)
  VALUES (p_org_id, p_name, p_description, p_icon, p_color, v_user_id)
  RETURNING id INTO v_team_id;

  SELECT id INTO v_member_id FROM public.organization_members
  WHERE organization_id = p_org_id AND user_id = v_user_id LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    INSERT INTO public.company_team_members (team_id, organization_member_id, role)
    VALUES (v_team_id, v_member_id, 'admin');
  END IF;

  INSERT INTO public.audit_logs (organization_id, actor_id, action, target_resource, details)
  VALUES (p_org_id, v_user_id, 'team.created', 'team', jsonb_build_object('name', p_name));

  RETURN v_team_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. RPC: Add team member
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_team_member(
  p_team_id uuid,
  p_user_id text,
  p_role text DEFAULT 'member'
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id text;
  v_org_id uuid;
  v_member_id uuid;
BEGIN
  v_actor_id := (auth.uid())::text;

  SELECT organization_id INTO v_org_id FROM public.company_teams WHERE id = p_team_id;

  IF NOT public.fn_is_org_admin(v_org_id, v_actor_id) THEN
    RAISE EXCEPTION 'Only org admins can add team members';
  END IF;

  SELECT id INTO v_member_id FROM public.organization_members
  WHERE organization_id = v_org_id AND user_id = p_user_id LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'User must be an organization member first';
  END IF;

  INSERT INTO public.company_team_members (team_id, organization_member_id, role)
  VALUES (p_team_id, v_member_id, p_role)
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. RPC: Remove team member
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_team_member(p_team_id uuid, p_member_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id text;
  v_org_id uuid;
BEGIN
  v_actor_id := (auth.uid())::text;

  SELECT organization_id INTO v_org_id FROM public.company_teams WHERE id = p_team_id;

  IF NOT public.fn_is_org_admin(v_org_id, v_actor_id) THEN
    RAISE EXCEPTION 'Only org admins can remove team members';
  END IF;

  DELETE FROM public.company_team_members
  WHERE team_id = p_team_id AND organization_member_id = p_member_id;

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. Enable realtime on org tables (if not already)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.company_teams; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.company_team_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
