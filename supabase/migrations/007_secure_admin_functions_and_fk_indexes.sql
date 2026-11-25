-- Secure administrator RPC permissions and protect the admin flag.
CREATE OR REPLACE FUNCTION public.protect_profile_admin_flag()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
     AND lower(COALESCE(auth.jwt() ->> 'email', '')) <> 'mrhawk2007@gmail.com' THEN
    RAISE EXCEPTION 'Only the project owner can change the admin flag';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_studio_list_admins() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_studio_manage_admin(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_studio_list_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_studio_manage_admin(text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_admin_flag() FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS movies_created_by_idx ON public.movies (created_by);
CREATE INDEX IF NOT EXISTS watch_history_episode_id_idx ON public.watch_history (episode_id);
CREATE INDEX IF NOT EXISTS watch_history_movie_id_idx ON public.watch_history (movie_id);
CREATE INDEX IF NOT EXISTS watchlist_movie_id_idx ON public.watchlist (movie_id);
