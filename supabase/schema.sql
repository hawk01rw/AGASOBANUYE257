-- AGASOBANUYE257 database foundation
-- Run this file in Supabase Dashboard -> SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  synopsis text not null default '',
  genre text not null default 'Drama',
  release_year integer,
  poster_url text,
  video_path text,
  trailer_url text,
  duration_minutes integer,
  language text not null default 'Kinyarwanda',
  featured boolean not null default false,
  published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movies_release_year_check check (release_year is null or release_year between 1888 and 2200),
  constraint movies_duration_check check (duration_minutes is null or duration_minutes > 0)
);

create index if not exists movies_published_created_idx on public.movies (published, created_at desc);
create index if not exists movies_genre_idx on public.movies (genre);
create index if not exists movies_featured_idx on public.movies (featured) where featured = true;

create table if not exists public.watchlist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

-- Create a profile automatically for each newly registered auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Users must never be able to promote themselves to administrator.
create or replace function public.protect_profile_admin_flag()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Only a trusted administrator can change the admin flag';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_flag on public.profiles;
create trigger protect_profile_admin_flag
before update on public.profiles
for each row execute procedure public.protect_profile_admin_flag();

create or replace function public.is_site_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_admin = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.movies enable row level security;
alter table public.watchlist enable row level security;

drop policy if exists "Profiles are viewable by their owner" on public.profiles;
create policy "Profiles are viewable by their owner"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_site_admin());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()) or public.is_site_admin())
with check (id = (select auth.uid()) or public.is_site_admin());

drop policy if exists "Published movies are public" on public.movies;
create policy "Published movies are public"
on public.movies for select to anon, authenticated
using (published = true or public.is_site_admin());

drop policy if exists "Admins can insert movies" on public.movies;
create policy "Admins can insert movies"
on public.movies for insert to authenticated
with check (public.is_site_admin());

drop policy if exists "Admins can update movies" on public.movies;
create policy "Admins can update movies"
on public.movies for update to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

drop policy if exists "Admins can delete movies" on public.movies;
create policy "Admins can delete movies"
on public.movies for delete to authenticated
using (public.is_site_admin());

drop policy if exists "Users can view their watchlist" on public.watchlist;
create policy "Users can view their watchlist"
on public.watchlist for select to authenticated
using (user_id = (select auth.uid()) or public.is_site_admin());

drop policy if exists "Users can add to their watchlist" on public.watchlist;
create policy "Users can add to their watchlist"
on public.watchlist for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can remove from their watchlist" on public.watchlist;
create policy "Users can remove from their watchlist"
on public.watchlist for delete to authenticated
using (user_id = (select auth.uid()) or public.is_site_admin());

-- Public poster images; private video files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('movie-posters', 'movie-posters', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('movie-videos', 'movie-videos', false, 2147483648, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do nothing;

drop policy if exists "Anyone can view movie posters" on storage.objects;
create policy "Anyone can view movie posters"
on storage.objects for select to anon, authenticated
using (bucket_id = 'movie-posters');

drop policy if exists "Admins can upload movie posters" on storage.objects;
create policy "Admins can upload movie posters"
on storage.objects for insert to authenticated
with check (bucket_id = 'movie-posters' and public.is_site_admin());

drop policy if exists "Admins can update movie posters" on storage.objects;
create policy "Admins can update movie posters"
on storage.objects for update to authenticated
using (bucket_id = 'movie-posters' and public.is_site_admin())
with check (bucket_id = 'movie-posters' and public.is_site_admin());

drop policy if exists "Admins can delete movie posters" on storage.objects;
create policy "Admins can delete movie posters"
on storage.objects for delete to authenticated
using (bucket_id = 'movie-posters' and public.is_site_admin());

drop policy if exists "View videos for published movies" on storage.objects;
create policy "View videos for published movies"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'movie-videos'
  and exists (
    select 1 from public.movies
    where movies.video_path = storage.objects.name
      and movies.published = true
  )
);

drop policy if exists "Admins can upload movie videos" on storage.objects;
create policy "Admins can upload movie videos"
on storage.objects for insert to authenticated
with check (bucket_id = 'movie-videos' and public.is_site_admin());

drop policy if exists "Admins can update movie videos" on storage.objects;
create policy "Admins can update movie videos"
on storage.objects for update to authenticated
using (bucket_id = 'movie-videos' and public.is_site_admin())
with check (bucket_id = 'movie-videos' and public.is_site_admin());

drop policy if exists "Admins can delete movie videos" on storage.objects;
create policy "Admins can delete movie videos"
on storage.objects for delete to authenticated
using (bucket_id = 'movie-videos' and public.is_site_admin());

-- After creating your account, run this once in the SQL editor to grant admin access:
-- update public.profiles set is_admin = true where id = 'YOUR_AUTH_USER_UUID';
