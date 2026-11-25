# AGASOBANUYE257

Responsive movie-discovery website with a blue, metallic-gold and midnight-black visual identity.

## Platform services

- **TMDB** supplies movie metadata: titles, synopses, release dates, genres and ratings.
- **ImageKit** is the image delivery layer for posters, backdrops, thumbnails and other site imagery. Store ImageKit delivery URLs and file IDs in Supabase; do not upload site images to Supabase Storage.
- **Supabase** stores movie records, users, authentication, watchlists and admin permissions. Private video storage may remain separate from ImageKit.

## Supabase setup

1. Create a project at https://supabase.com/.
2. Open **SQL Editor** and run `supabase/schema.sql` for a new database.
3. If the original schema was already applied, run `supabase/migrations/002_tmdb_imagekit.sql` instead to add TMDB and ImageKit columns.
4. In **Project Settings → API**, copy the Project URL and public publishable/anon key.
5. Copy `supabase-config.example.js` to `supabase-config.js`; replace the two placeholders with your project values. The local config is ignored by Git.
6. Register your own account in Supabase Auth. Copy that user's UUID from Authentication → Users and run the admin grant SQL comment at the bottom of `supabase/schema.sql` in SQL Editor. Only the project owner should grant admin access.

The page loads Supabase JS v2 from its official CDN and reads `supabase-config.js` before `js/supabase-client.js`. The browser uses only a public publishable/anon key; Row Level Security protects the data. **Never put a service_role or secret key in browser code.**

## TMDB and ImageKit integration plan

TMDB movie IDs and metadata are stored in `movies.tmdb_id`, `tmdb_vote_average` and `tmdb_vote_count`. ImageKit delivery URLs are stored in `poster_url` and `backdrop_url`, with ImageKit file IDs in the corresponding `*_file_id` fields.

The next integration step is to add server-side Supabase Edge Functions:
- TMDB search/import, with the TMDB API token stored as a server-side secret.
- ImageKit upload authorization, signing uploads with the ImageKit private key stored as a server-side secret.

Do not put TMDB private tokens or the ImageKit private key in browser code or commit them to GitHub. The ImageKit public key and URL endpoint can be used by the frontend where needed. Follow TMDB attribution and image-use requirements and only distribute content you are authorized to use.

## Video storage

The existing schema creates a private `movie-videos` bucket for video files. Poster and backdrop images are intended for ImageKit, not Supabase Storage. Save the exact private video object path in `movies.video_path` and generate short-lived signed URLs for playback.

## Current scope

The database and browser Supabase client are starter integrations. The admin dashboard, TMDB search/import UI, ImageKit upload UI, secure server-side signing functions and production playback interface still need to be implemented and tested.
