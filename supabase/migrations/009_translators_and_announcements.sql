CREATE TABLE IF NOT EXISTS public.site_translators (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
 languages text NOT NULL DEFAULT '', bio text NOT NULL DEFAULT '', contact_url text,
 sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.site_announcements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
 message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 1000),
 tone text NOT NULL DEFAULT 'info' CHECK (tone IN ('info','success','warning')),
 is_active boolean NOT NULL DEFAULT true, starts_at timestamptz, ends_at timestamptz,
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS site_translators_active_sort_idx ON public.site_translators (is_active, sort_order, name);
CREATE INDEX IF NOT EXISTS site_announcements_active_window_idx ON public.site_announcements (is_active, starts_at, ends_at);
ALTER TABLE public.site_translators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_translators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_announcements TO authenticated;
GRANT SELECT ON public.site_announcements TO anon;
CREATE POLICY "Admins manage translators" ON public.site_translators FOR ALL TO authenticated USING ((SELECT public.is_site_admin())) WITH CHECK ((SELECT public.is_site_admin()));
CREATE POLICY "Public active announcements" ON public.site_announcements FOR SELECT TO anon, authenticated USING ((is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())) OR (SELECT public.is_site_admin()));
CREATE POLICY "Admins insert announcements" ON public.site_announcements FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_site_admin()));
CREATE POLICY "Admins update announcements" ON public.site_announcements FOR UPDATE TO authenticated USING ((SELECT public.is_site_admin())) WITH CHECK ((SELECT public.is_site_admin()));
CREATE POLICY "Admins delete announcements" ON public.site_announcements FOR DELETE TO authenticated USING ((SELECT public.is_site_admin()));
