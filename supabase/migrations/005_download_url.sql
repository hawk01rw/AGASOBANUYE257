-- Add an optional external download URL for each movie or episode.
alter table public.movies
  add column if not exists download_url text;

comment on column public.movies.download_url is
  'Optional external download URL entered by an administrator';
