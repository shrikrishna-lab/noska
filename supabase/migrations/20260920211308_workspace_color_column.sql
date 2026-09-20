begin;

alter table public.workspaces add column if not exists color text check (length(color) <= 32);

commit;
