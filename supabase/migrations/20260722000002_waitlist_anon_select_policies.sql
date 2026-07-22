-- Allow anon SELECT on waitlist tables so WaitlistGate can check user status
-- Waitlist_entries was only service_role-accessible, blocking public users from reading their own status

CREATE POLICY waitlist_entries_anon_select ON public.waitlist_entries
  FOR SELECT TO anon
  USING (true);

CREATE POLICY approved_emails_anon_select ON public.approved_emails
  FOR SELECT TO anon
  USING (true);

-- Allow anon users to insert into waitlist_entries (for the public signup form)
CREATE POLICY waitlist_entries_anon_insert ON public.waitlist_entries
  FOR INSERT TO anon
  WITH CHECK (true);
