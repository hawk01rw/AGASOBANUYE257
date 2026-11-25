/**
 * AGASOBANUYE257 Cloudflare Worker
 *
 * Serves the public website files configured in wrangler.jsonc.
 * Supabase Edge Function source and private project files are excluded
 * from the public static asset bundle by the Wrangler configuration.
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};
