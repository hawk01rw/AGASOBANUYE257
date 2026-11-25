-- AGASOBANUYE257 Admin Studio permissions and private video storage
-- Run in Supabase Dashboard -> SQL Editor as project owner.

create extension if not exists pgcrypto;

-- Ensure authenticated users can read their own profile (required by Admin Studio).
grant usage on schema public to authenticated;
grant select on table public.profiles to authenticated;
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_site_admin());

-- Admins can fully manage catalogue records through the public client + RLS.
grant select, insert, update, delete on table public.movies to authenticated;
drop policy if exists "Admin Studio can read all catalogue rows" on public.movies;
create policy "Admin Studio can read all catalogue rows"
on public.movies for select to authenticated
using (published = true or public.is_site_admin());
drop policy if exists "Admin Studio admins insert catalogue rows" on public.movies;
create policy "Admin Studio admins insert catalogue rows"
on public.movies for insert to authenticated
with check (public.is_site_admin());
drop policy if exists "Admin Studio admins update catalogue rows" on public.movies;
create policy "Admin Studio admins update catalogue rows"
on public.movies for update to authenticated
using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists "Admin Studio admins delete catalogue rows" on public.movies;
create policy "Admin Studio admins delete catalogue rows"
on public.movies for delete to authenticated
using (public.is_site_admin());

-- Private video bucket. Video files are never made publicly readable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('movie-videos','movie-videos',false,2147483648,
  array['video/mp4','video/webm','video/quicktime','video/x-matroska'])
on conflict (id) do update set public=false;

drop policy if exists "Admin Studio admins read video objects" on storage.objects;
create policy "Admin Studio admins read video objects"
on storage.objects for select to authenticated
using (bucket_id='movie-videos' and public.is_site_admin());
drop policy if exists "Admin Studio admins upload video objects" on storage.objects;
create policy "Admin Studio admins upload video objects"
on storage.objects for insert to authenticated
with check (bucket_id='movie-videos' and public.is_site_admin());
drop policy if exists "Admin Studio admins update video objects" on storage.objects;
create policy "Admin Studio admins update video objects"
on storage.objects for update to authenticated
using (bucket_id='movie-videos' and public.is_site_admin())
with check (bucket_id='movie-videos' and public.is_site_admin());
drop policy if exists "Admin Studio admins delete video objects" on storage.objects;
create policy "Admin Studio admins delete video objects"
on storage.objects for delete to authenticated
using (bucket_id='movie-videos' and public.is_site_admin());

-- Only the owner account may grant or revoke administrator access.
-- The target account must already exist in Supabase Authentication -> Users.
create or replace function public.admin_studio_manage_admin(target_email text, make_admin boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare target_id uuid;
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'mrhawk2007@gmail.com' then
    raise exception 'Only the project owner can manage administrator accounts';
  end if;
  if lower(coalesce(target_email,'')) = 'mrhawk2007@gmail.com' and make_admin = false then
    raise exception 'The project owner administrator cannot be removed';
  end if;
  select id into target_id from auth.users where lower(email)=lower(trim(target_email)) limit 1;
  if target_id is null then
    raise exception 'No Supabase Auth user exists with that email. Create the user in Authentication -> Users first.';
  end if;
  insert into public.profiles(id, display_name, is_admin)
  select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email,'@',1)), make_admin
  from auth.users where id=target_id
  on conflict (id) do update set is_admin=excluded.is_admin;
  return true;
end;
$$;

create or replace function public.admin_studio_list_admins()
returns table(email text, is_admin boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'mrhawk2007@gmail.com' then
    raise exception 'Only the project owner can view administrator accounts';
  end if;
  return query
    select u.email::text, p.is_admin, p.created_at
    from public.profiles p
    join auth.users u on u.id=p.id
    where p.is_admin=true
    order by u.email;
end;
$$;

revoke all on function public.admin_studio_manage_admin(text,boolean) from public;
revoke all on function public.admin_studio_list_admins() from public;
grant execute on function public.admin_studio_manage_admin(text,boolean) to authenticated;
grant execute on function public.admin_studio_list_admin() to authenticated;
