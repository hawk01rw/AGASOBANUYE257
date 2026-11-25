-- AGASOBANUYE257 Admin Studio compatibility patch
-- Run once in Supabase Dashboard -> SQL Editor.
alter table public.movies
  add column if not exists imagekit_file_id text,
  add column if not exists backdrop_imagekit_file_id text,
  add column if not exists download_url text,
  add column if not exists content_type text not null default 'movie',
  add column if not exists series_id uuid references public.movies(id) on delete cascade,
  add column if not exists season_number integer,
  add column if not exists episode_number integer,
  add column if not exists episode_title text;

-- Ensure the signed-in admin browser role can read the catalogue.
grant select, insert, update, delete on public.movies to authenticated;
