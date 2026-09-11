-- Info card call-to-action: optional link rendered as a button on the banner.

alter table public.info_cards add column if not exists action_url text;
alter table public.info_cards add column if not exists action_label text;
