/**
 * AGASOBANUYE257 Cloudflare Worker
 *
 * Serves the static website and safely provides public browser configuration.
 * Only public/publishable keys belong in the generated config response.
 * Never add Supabase service-role or ImageKit private keys here.
 */
function publicConfig(env) {
  return {
    supabaseUrl: env.SUPABASE_URL || "",
    supabaseAnonKey: env.SUPABASE_ANON_KEY || "",
    imagekitPublicKey: env.IMAGEKIT_PUBLIC_KEY || "",
    imagekitUrlEndpoint: env.IMAGEKIT_URL_ENDPOINT || ""
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
