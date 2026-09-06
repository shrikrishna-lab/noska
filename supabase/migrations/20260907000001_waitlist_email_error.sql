-- Stores why a waitlist invite email failed to send. Written best-effort by
-- approve-waitlist / send-email (send_invite); the admin UI reads it to show
-- the real delivery failure instead of a silent "Queued" status.
alter table public.waitlist_entries add column if not exists email_error text;
