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

## ImageKit upload authorization

The ImageKit authorization function and browser upload helper are now in the repository:
- `supabase/functions/imagekit-auth/index.ts` signs short-lived ImageKit upload parameters. It requires a valid signed-in Supabase user whose `profiles.is_admin` flag is true.
- `js/imagekit-upload.js` exposes `window.AgasobanuyeImageKit.uploadImage(file, options)` and sends the file directly to ImageKit. It returns the ImageKit `url` and `fileId`; save those in `movies.poster_url`, `imagekit_file_id` and `backdrop_url` / `backdrop_imagekit_file_id` for backdrops.

Deployment and configuration:
1. In your local Supabase project folder, run `supabase functions deploy imagekit-auth` (install and link the Supabase CLI first if needed).
2. In `supabase-config.js` (copied from the example), set `imagekitPublicKey` and `imagekitUrlEndpoint` alongside your Supabase URL and public key. This file is ignored by Git.
3. Keep `IMAGEKIT_PRIVATE_KEY` in Supabase Edge Function Secrets only. The function uses Supabase's built-in `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment values to verify the current user and admin profile.
4. Example browser call: `const uploaded = await AgasobanuyeImageKit.uploadImage(fileInput.files[0], { folder: "/agasobanuye257/posters" });`

Do not put TMDB private tokens or the ImageKit private key in browser code or commit them to GitHub. The ImageKit public key and URL endpoint can be used by the frontend where needed. Follow TMDB attribution and image-use requirements and only distribute content you are authorized to use.

## Video storage

The existing schema creates a private `movie-videos` bucket for video files. Poster and backdrop images are intended for ImageKit, not Supabase Storage. Save the exact private video object path in `movies.video_path` and generate short-lived signed URLs for playback.

## Current scope

The database and browser Supabase client are starter integrations. The admin dashboard, TMDB search/import UI, ImageKit upload UI, secure server-side signing functions and production playback interface still need to be implemented and tested.
