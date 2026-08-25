-- Desktop pairing v4: Clerk session id for token minting.
alter table desktop_auth_pairs add column if not exists sid text;
