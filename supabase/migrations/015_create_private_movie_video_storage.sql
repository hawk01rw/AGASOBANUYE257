-- Private video storage for administrator uploads and published playback.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('movie-videos', 'movie-videos', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE
SET public = false;

DROP POLICY IF EXISTS "Site admins upload movie videos" ON storage.objects;
CREATE POLICY "Site admins upload movie videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'movie-videos'
  AND (SELECT private.is_site_admin())
);

DROP POLICY IF EXISTS "Published videos are playable" ON storage.objects;
CREATE POLICY "Published videos are playable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'movie-videos'
  AND (
    (SELECT private.is_site_admin())
    OR EXISTS (
      SELECT 1
      FROM public.movies AS m
      WHERE m.video_path = storage.objects.name
        AND m.published = true
    )
  )
);

DROP POLICY IF EXISTS "Site admins update movie videos" ON storage.objects;
CREATE POLICY "Site admins update movie videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'movie-videos'
  AND (SELECT private.is_site_admin())
)
WITH CHECK (
  bucket_id = 'movie-videos'
  AND (SELECT private.is_site_admin())
);

DROP POLICY IF EXISTS "Site admins delete movie videos" ON storage.objects;
CREATE POLICY "Site admins delete movie videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'movie-videos'
  AND (SELECT private.is_site_admin())
);
