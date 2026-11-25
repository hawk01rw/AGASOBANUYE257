-- AGASOBANUYE257: series and episode foundation
-- Run in Supabase Dashboard -> SQL Editor after schema.sql and 002_tmdb_imagekit.sql.
-- Existing rows remain movies by default.

alter table public.movies
  add column if not exists content_type text not null default 'movie',
  add column if not exists series_id uuid references public.movies(id) on delete cascade,
  add column if not exists season_number integer,
  add column if not exists episode_number integer,
  add column if not exists episode_title text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'movies_content_type_check'
      and conrelid = 'public.movies'::regclass
  ) then
    alter table public.movies
      add constraint movies_content_type_check
      check (content_type in ('movie', 'series', 'episode'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'movies_series_episode_fields_check'
      and conrelid = 'public.movies'::regclass
  ) then
    alter table public.movies
      add constraint movies_series_episode_fields_check
      check (
        (content_type <> 'episode')
        or (
          series_id is not null
          and season_number is not null and season_number >= 1
          and episode_number is not null and episode_number >= 1
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'movies_series_parent_type_check'
      and conrelid = 'public.movies'::regclass
  ) then
    alter table public.movies
      add constraint movies_series_parent_type_check
      check (content_type <> 'series' or series_id is null);
  end if;
end $$;

create index if not exists movies_content_type_published_idx
  on public.movies (content_type, published, created_at desc);

create index if not exists movies_series_episode_order_idx
  on public.movies (series_id, season_number, episode_number)
  where content_type = 'episode';

-- Episodes inherit the same published-content RLS rules as movies.
-- Only admins can create, edit, publish, or delete series and episodes.
