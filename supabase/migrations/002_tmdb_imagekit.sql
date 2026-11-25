-- AGASOBANUYE257: TMDB metadata + ImageKit image references
-- Apply in Supabase SQL Editor after the original schema.
alter table public.movies
  add column if not exists tmdb_id bigint unique,
  add column if not exists backdrop_url text,
  add column if not exists imagekit_file_id text,
  add column if not exists backdrop_imagekit_file_id text,
  add column if not exists tmdb_vote_average numeric(3,1),
  add column if not exists tmdb_vote_count integer;

create index if not exists movies_tmdb_id_idx on public.movies (tmdb_id);
