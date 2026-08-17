-- Remove fabricated demo data that was seeded directly into the database.
-- These rows were not present in any migration file and contained invented
-- content (fictional users, fake incidents, inflated campaign numbers) that
-- did not correspond to real activity.

DELETE FROM public.notifications;

DELETE FROM public.email_campaigns
WHERE id IN ('320e2351-21f0-4030-95ef-84c2460787e3', '0db9360b-ea4f-4ebc-825d-95ae2270e4c5');