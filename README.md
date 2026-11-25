# AGASOBANUYE257

Responsive movie-discovery website with a blue, metallic-gold and midnight-black visual identity.

## Platform services

- **TMDB** supplies movie metadata: titles, synopses, release dates, genres and ratings.
- **ImageKit** is the image delivery layer for posters, backdrops, thumbnails and other site imagery. Store ImageKit delivery URLs and file IDs in Supabase; do not upload site images to Supabase Storage.
- **Supabase** stores movie records, users, authentication, watchlists and admin permissions. Private video storage may remain separate from ImageKit.

## Supabase setup

1. Create a project at https://supabase.com/.
2. Open **SQL Editor** and run `supabase/schema.sql` for a new database.
3. If the original schema was already applied, run `supabase/migrations/002_tmdb_imagekit.sql` to add TMDB and ImageKit columns.
4. Run `supabase/migrations/003_series_episodes.sql` in the same SQL Editor to add series, seasons and episode relationships. Existing movie records remain movies.
5. In **Project Settings → API**, copy the Project URL and public publishable/anon key.
6. Copy `supabase-config.example.js` to `supabase-config.js`; replace the two placeholders with your project values. The local config is ignored by Git.
7. Register your own account in Supabase Auth. Copy that user's UUID from Authentication → Users and run the admin grant SQL comment at the bottom of `supabase/schema.sql` in SQL Editor. Only the project owner should grant admin access.

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

## Series and episodes

The additive migration `supabase/migrations/003_series_episodes.sql` adds `content_type` (`movie`, `series`, or `episode`), a parent `series_id`, season and episode numbers, and an episode title. It also prevents duplicate episode numbers within a season and validates that an episode points to a series record. Run this migration in Supabase SQL Editor before using series and episode management. The existing movie records remain compatible.

## Admin studio and TMDB import

Open `/admin.html` on your deployed website. Sign in with a Supabase Auth account whose `profiles.is_admin` value is `true`. The admin studio lets administrators search TMDB, select a movie, upload a poster (required) and backdrop (optional) to ImageKit, and save the movie record to Supabase as a draft or published title.

Deploy both Edge Functions from the repository root after installing and linking the Supabase CLI:

```bash
supabase functions deploy imagekit-auth
supabase functions deploy tmdb-search
```

Set the TMDB API Read Access Token as a Supabase Edge Function secret named `TMDB_API_READ_ACCESS_TOKEN`. The ImageKit private key must remain in the `IMAGEKIT_PRIVATE_KEY` Edge Function secret. Do not add either private value to `supabase-config.js`, frontend code, or Git.

The browser config copied from `supabase-config.example.js` must include the Supabase project URL/public key plus the ImageKit public key and URL endpoint. The public ImageKit key and URL endpoint are not private credentials.


## Cloudflare Worker runtime configuration (recommended for the hosted site)

The Worker serves `/supabase-config.js` dynamically, so the public website can connect to Supabase without committing a config file to GitHub. In Cloudflare Dashboard:

1. Open **Workers & Pages → agasobanuye257 → Settings → Variables and Secrets**.
2. Add these four **Variables** (not secrets; they are public browser configuration):
   - `SUPABASE_URL` — your Supabase Project URL.
   - `SUPABASE_ANON_KEY` — your Supabase publishable/anon public key.
   - `IMAGEKIT_PUBLIC_KEY` — your ImageKit public key.
   - `IMAGEKIT_URL_ENDPOINT` — your ImageKit URL endpoint, such as `https://ik.imagekit.io/your_imagekit_id`.
3. Save the settings and redeploy the Worker from the latest `main` branch.
4. Open `https://YOUR-WEBSITE-DOMAIN/supabase-config.js`. It should return a small JavaScript config containing those four public values. It must not contain any private key.
5. Open the homepage. It will query `public.movies` for published records only and show each record's ImageKit poster/backdrop URL.

**Never add** `SUPABASE_SERVICE_ROLE_KEY`, an ImageKit private key, or the TMDB Read Access Token to these Worker Variables or the browser config. Keep those private values only in the appropriate server-side Supabase Edge Function Secrets.

If the Worker variables are missing, the homepage will remain in its empty-catalogue state rather than showing invented demo movies. Add a movie in `/admin.html`, upload its poster to ImageKit, and mark it Published for it to appear on the homepage.
