ALTER TABLE public.newsletter_subscribers DROP CONSTRAINT IF EXISTS newsletter_subscribers_email_check;
ALTER TABLE public.newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_email_format_check CHECK (email = lower(btrim(email)) AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$');
DROP POLICY IF EXISTS "Visitors can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Visitors can subscribe" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (email = lower(btrim(email)) AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$');
