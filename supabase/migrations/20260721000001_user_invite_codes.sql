-- User-generated invite codes for sharing from onboarding/settings.
-- Separate from waitlist_entries (admin-generated invites) so users can
-- share their own invite links without admin intervention.
--
-- Security: only authenticated users can create codes (tied to auth.uid()),
-- and reads only expose minimal data via get_invite_by_code.

create table if not exists public.user_invite_codes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_name text not null,
  code text not null unique,
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now()
);

alter table public.user_invite_codes enable row level security;

-- Users can insert codes tied to their own auth ID only
create policy "Users can insert own invite codes"
  on public.user_invite_codes for insert
  with check (auth.uid()::text = user_id);

-- No SELECT policy — reads go through get_invite_by_code only.

create index if not exists idx_user_invite_codes_code on public.user_invite_codes(code);

-- Create a user-level invite code (called from onboarding/settings).
-- Derives user_id and user_name from the authenticated session.
create or replace function public.create_user_invite_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_user_id text;
  v_user_name text;
begin
  v_user_id := auth.uid()::text;
  if v_user_id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select user_name into v_user_name from user_profiles where user_id = v_user_id;

  insert into public.user_invite_codes (code, user_id, user_name)
  values (upper(p_code), v_user_id, coalesce(v_user_name, 'Unknown'))
  on conflict (code) do nothing
  returning jsonb_build_object(
    'code', code,
    'user_name', user_name,
    'expires_at', expires_at,
    'created_at', created_at
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.create_user_invite_code from public, anon;
grant execute on function public.create_user_invite_code to authenticated;

-- Look up invite by code for the public invite page.
-- Only returns minimal data (name, status) — never user_id.
create or replace function public.get_invite_by_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
begin
  -- Check waitlist_entries first (admin invites)
  select jsonb_build_object(
    'name', we.name,
    'email', we.email,
    'status', we.status,
    'invite_expires_at', we.invite_expires_at,
    'source', 'waitlist'
  ) into v_result
  from waitlist_entries we
  where we.invite_code = upper(p_code)
  limit 1;

  if v_result is not null then
    return v_result;
  end if;

  -- Then check user_invite_codes (user-generated invites)
  select jsonb_build_object(
    'name', uic.user_name,
    'status', case when uic.expires_at < now() then 'expired' else 'active' end,
    'invite_expires_at', uic.expires_at,
    'source', 'user'
  ) into v_result
  from user_invite_codes uic
  where uic.code = upper(p_code)
  limit 1;

  if v_result is not null then
    return v_result;
  end if;

  return null;
end;
$$;
