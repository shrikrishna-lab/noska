-- Add an optional role field to user_profiles so admins can tag users
-- (e.g. 'user', 'beta', 'moderator', 'vip') independently of the admin_users
-- table. Admin/rank roles are stored in admin_users (matched by email); this
-- column is for user-facing labels shown as colored badges in the admin panel.

alter table public.user_profiles add column if not exists role text;
