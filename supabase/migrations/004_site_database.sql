-- AGASOBANUYE257: site database expansion
-- Run in Supabase Dashboard -> SQL Editor after schema.sql and 002_tmdb_imagekit.sql.
-- This migration is additive and safe to re-run. It keeps the existing public.movies,
-- public.profiles, and public.watchlist tables used by the current website.

create extension if not exists pgcrypto;

alter table public.movies
  add column if not exists content_type text not null default 'movie',
  add column if not exists series_id uuid references public.movies(id) on delete cascade,
  add column if not exists season_number integer,
  add column if not exists episode_number integer,
  add column if not exists episode_title text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'movies_content_type_check' and conrelid = 'public.movies'::regclass) then
    alter table public.movies add constraint movies_content_type_check check (content_type in ('movie', 'series', 'episode'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'movies_series_episode_fields_check' and conrelid = 'public.movies'::regclass) then
    alter table public.movies add constraint movies_series_episode_fields_check check (content_type <> 'episode' or (series_id is not null and season_number is not null and season_number >= 1 and episode_number is not null and episode_number >= 1));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'movies_series_parent_type_check' and conrelid = 'public.movies'::regclass) then
    alter table public.movies add constraint movies_series_parent_type_check check (content_type <> 'series' or series_id is null);
  end if;
end $$;

create index if not exists movies_content_type_published_idx on public.movies (content_type, published, created_at desc);
create index if not exists movies_series_episode_order_idx on public.movies (series_id, season_number, episode_number) where content_type = 'episode';
create unique index if not exists movies_unique_episode_number_idx on public.movies (series_id, season_number, episode_number) where content_type = 'episode';

create or replace function public.validate_series_episode_parent()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.content_type = 'episode' and not exists (
    select 1 from public.movies parent where parent.id = new.series_id and parent.content_type = 'series'
  ) then raise exception 'An episode must belong to an existing series'; end if;
  return new;
end;
$$;
drop trigger if exists validate_series_episode_parent on public.movies;
create trigger validate_series_episode_parent before insert or update of content_type, series_id on public.movies
for each row execute procedure public.validate_series_episode_parent();

create table if not exists public.site_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.site_categories (name, slug, description, sort_order) values
  ('Action','action','Action movies and series',1),
  ('Drama','drama','Drama movies and series',2),
  ('Animation','animation','Animated movies and series',3),
  ('Erotic','erotic','Adult-themed titles',4),
  ('Romance','romance','Romance movies and series',5),
  ('Horror','horror','Horror movies and series',6),
  ('Comedy','comedy','Comedy movies and series',7),
  ('Others','others','Titles in other genres',8)
on conflict (slug) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order;

create table if not exists public.movie_categories (
  movie_id uuid not null references public.movies(id) on delete cascade,
  category_id uuid not null references public.site_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (movie_id, category_id)
);
create index if not exists movie_categories_category_idx on public.movie_categories (category_id, movie_id);

-- Automatically maintain category links from the existing Admin Studio genre field.
create or replace function public.sync_movie_categories()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare genre_item text; matched_count integer := 0;
begin
  delete from public.movie_categories where movie_id = new.id;
  for genre_item in
    select distinct lower(trim(value))
    from regexp_split_to_table(coalesce(new.genre, ''), '[,/&|]+') as value
    where trim(value) <> ''
  loop
    insert into public.movie_categories (movie_id, category_id)
    select new.id, c.id from public.site_categories c where c.slug = genre_item and c.slug <> 'others'
    on conflict do nothing;
    if found then matched_count := matched_count + 1; end if;
  end loop;
  if matched_count = 0 then
    insert into public.movie_categories (movie_id, category_id)
    select new.id, c.id from public.site_categories c where c.slug = 'others'
    on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists sync_movie_categories on public.movies;
create trigger sync_movie_categories after insert or update of genre on public.movies
for each row execute procedure public.sync_movie_categories();

-- Backfill category links for existing catalogue rows.
do $$
declare movie_row record; genre_item text; matched_count integer;
begin
  for movie_row in select id, genre from public.movies loop
    delete from public.movie_categories where movie_id = movie_row.id;
    matched_count := 0;
    for genre_item in
      select distinct lower(trim(value))
      from regexp_split_to_table(coalesce(movie_row.genre, ''), '[,/&|]+') as value
      where trim(value) <> ''
    loop
      insert into public.movie_categories (movie_id, category_id)
      select movie_row.id, c.id from public.site_categories c where c.slug = genre_item and c.slug <> 'others'
      on conflict do nothing;
      if found then matched_count := matched_count + 1; end if;
    end loop;
    if matched_count = 0 then
      insert into public.movie_categories (movie_id, category_id)
      select movie_row.id, c.id from public.site_categories c where c.slug = 'others'
      on conflict do nothing;
    end if;
  end loop;
end $$;

create table if not exists public.watch_history (
  user_id uuid not null references public.profiles(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  completed boolean not null default false,
  last_watched_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);
create index if not exists watch_history_recent_idx on public.watch_history (user_id, last_watched_at desc);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_language text not null default 'Kinyarwanda',
  autoplay boolean not null default true,
  subtitles_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  category_id uuid unique references public.site_categories(id) on delete set null,
  section_key text not null unique,
  title text not null,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.homepage_sections (category_id, section_key, title, sort_order, is_enabled)
select id, slug, name, sort_order, true from public.site_categories
on conflict (section_key) do update set category_id=excluded.category_id, title=excluded.title, sort_order=excluded.sort_order;

create table if not exists public.site_settings (
  setting_key text primary key,
  setting_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_categories enable row level security;
alter table public.movie_categories enable row level security;
alter table public.watch_history enable row level security;
alter table public.user_preferences enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Active categories are public" on public.site_categories;
create policy "Active categories are public" on public.site_categories for select to anon, authenticated
using (is_active or public.is_site_admin());
drop policy if exists "Categories are admin managed" on public.site_categories;
create policy "Categories are admin managed" on public.site_categories for all to authenticated
using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "Categories for published titles are public" on public.movie_categories;
create policy "Categories for published titles are public" on public.movie_categories for select to anon, authenticated
using (exists (select 1 from public.movies m where m.id=movie_id and m.published=true) or public.is_site_admin());
drop policy if exists "Admins manage title categories" on public.movie_categories;
create policy "Admins manage title categories" on public.movie_categories for all to authenticated
using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "Users manage their own watch history" on public.watch_history;
create policy "Users manage their own watch history" on public.watch_history for all to authenticated
using (user_id=(select auth.uid()) or public.is_site_admin())
with check (user_id=(select auth.uid()) or public.is_site_admin());

drop policy if exists "Users manage their own preferences" on public.user_preferences;
create policy "Users manage their own preferences" on public.user_preferences for all to authenticated
using (user_id=(select auth.uid()) or public.is_site_admin())
with check (user_id=(select auth.uid()) or public.is_site_admin());

drop policy if exists "Enabled homepage sections are public" on public.homepage_sections;
create policy "Enabled homepage sections are public" on public.homepage_sections for select to anon, authenticated
using (is_enabled or public.is_site_admin());
drop policy if exists "Admins manage homepage sections" on public.homepage_sections;
create policy "Admins manage homepage sections" on public.homepage_sections for all to authenticated
using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings" on public.site_settings for all to authenticated
using (public.is_site_admin()) with check (public.is_site_admin());

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin new.updated_at=now(); return new; end;
$$;
drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at before update on public.user_preferences
for each row execute procedure public.set_updated_at();
drop trigger if exists homepage_sections_set_updated_at on public.homepage_sections;
create trigger homepage_sections_set_updated_at before update on public.homepage_sections
for each row execute procedure public.set_updated_at();
drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at before update on public.site_settings
for each row execute procedure public.set_updated_at();

-- Existing profiles, movies, and watchlist tables remain in place.
-- Only trusted admins should change profiles.is_admin.
