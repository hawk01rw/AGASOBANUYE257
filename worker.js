/**
 * AGASOBANUYE257 Cloudflare Worker
 *
 * Serves the static website and safely provides public browser configuration.
 * Only public/publishable keys belong in the generated config response.
 * Never add Supabase service-role or ImageKit private keys here.
 */
function publicConfig(env) {
  return {
    // Public browser configuration; Worker variables may override these defaults.
    // Never add service-role, ImageKit private, or TMDB secret keys here.
    supabaseUrl: env.SUPABASE_URL || "https://owpmwujpvtdfbcagffcm.supabase.co",
    supabaseAnonKey: env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cG13dWpwdnRkZmJjYWdmZmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU1ODQwNzYsImV4cCI6MjExMTE2MDA3Nn0.O8GQltDMfxlKCRhZrLx1Gx7pmK0XBkpn9bnMwcly78w",
    imagekitPublicKey: env.IMAGEKIT_PUBLIC_KEY || "public_1gmRyLQokgyIrmapaNRIj716h6w=",
    imagekitUrlEndpoint: env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/pw7jzqgkso"
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/supabase-config.js") {
      const config = publicConfig(env);
      const responseBody = "window.AGASOBANUYE257_CONFIG = " +
        JSON.stringify(config).replace(/</g, "\\u003c") + ";";
      return new Response(responseBody, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
