alter table public.movies
  add column if not exists watch_url text;

comment on column public.movies.watch_url is
  'Optional custom destination for Watch buttons; null uses the generated watch.html?id=slug-or-id route.';
