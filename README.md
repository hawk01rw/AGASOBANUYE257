# AGASOBANUYE257

Responsive movie-discovery website with a blue, metallic-gold and midnight-black visual identity.

## Supabase setup

1. Create a project at https://supabase.com/.
2. Open **SQL Editor** in the Supabase dashboard and run `supabase/schema.sql`.
3. In **Project Settings → API**, copy the Project URL and public publishable/anon key.
4. Copy `supabase-config.example.js` to `supabase-config.js`; replace the two placeholders with your project values. The local config is ignored by Git.
5. Add movies in Table Editor → `movies`. Give each movie a unique URL-safe `slug`; set `published = true` when ready to show it publicly.
6. Register your own account in Supabase Auth. Copy that user's UUID from Authentication → Users and run the admin grant SQL comment at the bottom of `supabase/schema.sql` in SQL Editor. Only the project owner should grant admin access.

The page loads Supabase JS v2 from its official CDN and reads `supabase-config.js` before `js/supabase-client.js`. The browser uses only a public publishable/anon key; Row Level Security protects the data. **Never put a service_role or secret key in browser code.**

Without local configuration, the site uses its sample catalogue. When configured, published movie records are loaded from Supabase.

## Storage buckets

The schema creates:
- `movie-posters`: public poster images (5 MB max; JPEG, PNG or WebP).
- `movie-videos`: private video files (2 GB max; MP4, WebM or QuickTime).

Save a poster's public URL in `movies.poster_url` and the exact private video object path in `movies.video_path`. Generate short-lived signed URLs for playback; do not make the video bucket public.

## Current scope

This is the database and security foundation. The browser client exposes sign-up, sign-in, sign-out, session, watchlist and signed-video URL methods for subsequent UI integration. Admin dashboard, account forms, playback interface, billing and production video delivery remain future work. Publish only content you own or are authorized to distribute.
