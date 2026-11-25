-- Support the homepage/catalogue ordering and public signed-video lookups.
CREATE INDEX IF NOT EXISTS movies_published_catalog_idx
ON public.movies (featured DESC, created_at DESC)
WHERE published = true AND content_type <> 'episode';

CREATE INDEX IF NOT EXISTS movies_video_path_published_idx
ON public.movies (video_path)
WHERE published = true AND video_path IS NOT NULL;
