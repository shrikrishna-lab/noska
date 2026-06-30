-- Enable Realtime for all collaboration tables
-- Already applied: block_locks, audit_events, page_versions
-- Adding: collaboration_sessions, page_permissions

alter publication supabase_realtime add table if not exists public.collaboration_sessions;
alter publication supabase_realtime add table if not exists public.page_permissions;
