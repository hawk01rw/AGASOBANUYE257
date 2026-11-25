CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_site_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND is_admin = true
  );
$function$;

REVOKE ALL ON FUNCTION private.is_site_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_site_admin() TO anon, authenticated;

DO $migration$
DECLARE p record; u text; c text; stmt text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (COALESCE(qual, '') LIKE '%is_site_admin()%'
        OR COALESCE(with_check, '') LIKE '%is_site_admin()%')
  LOOP
    u := p.qual; c := p.with_check;
    IF u IS NOT NULL THEN
      u := replace(u, 'is_site_admin() AS is_site_admin', '__PRIVATE_ADMIN_CHECK__ AS is_site_admin');
      u := replace(u, 'is_site_admin()', '(SELECT private.is_site_admin())');
      u := replace(u, '__PRIVATE_ADMIN_CHECK__', '(SELECT private.is_site_admin())');
    END IF;
    IF c IS NOT NULL THEN
      c := replace(c, 'is_site_admin() AS is_site_admin', '__PRIVATE_ADMIN_CHECK__ AS is_site_admin');
      c := replace(c, 'is_site_admin()', '(SELECT private.is_site_admin())');
      c := replace(c, '__PRIVATE_ADMIN_CHECK__', '(SELECT private.is_site_admin())');
    END IF;
    stmt := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF u IS NOT NULL THEN stmt := stmt || format(' USING (%s)', u); END IF;
    IF c IS NOT NULL THEN stmt := stmt || format(' WITH CHECK (%s)', c); END IF;
    EXECUTE stmt;
  END LOOP;
END
$migration$;

DROP FUNCTION public.is_site_admin();
