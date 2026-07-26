-- Drop the FK constraint on admin_audit_log referencing admin_users
-- and recreate with ON DELETE CASCADE so deleting an admin also removes their audit logs.

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_admin_id_fkey,
  ADD CONSTRAINT admin_audit_log_admin_id_fkey
    FOREIGN KEY (admin_id)
    REFERENCES public.admin_users(id)
    ON DELETE CASCADE;
