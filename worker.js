/**
 * AGASOBANUYE257 Cloudflare Worker
 * Static asset delivery + public browser configuration.
 * Secrets (service-role, ImageKit private, TMDB) must never be returned here.
 */
function publicConfig(env) {
  return {
    supabaseUrl: env.SUPABASE_URL || "https://owpmwujpvtdfbcagffcm.supabase.co",
    supabaseAnonKey: env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cG13dWpwdnRkZmJjYWdmZmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU1ODQwNzYsImV4cCI6MjExMTE2MDA3Nn0.O8GQltDMfxlKCRhZrLx1Gx7pmK0XBkpn9bnMwcly78w",
    imagekitPublicKey: env.IMAGEKIT_PUBLIC_KEY || "public_1gmRyLQokgyIrmapaNRIj716h6w=",
    imagekitUrlEndpoint: env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/pw7jzqgkso"
  };
}

function applySecurityAndCacheHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  if (pathname === "/supabase-config.js") {
    headers.set("Cache-Control", "no-store");
  } else if (/\.(?:html?)$/i.test(pathname) || pathname === "/") {
    headers.set("Cache-Control", "no-cache, max-age=0, must-revalidate");
  } else if (/\.(?:css|js|mjs|json|webmanifest)$/i.test(pathname)) {
    headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  } else if (/\.(?:avif|webp|png|jpe?g|gif|svg|ico|woff2?|ttf|otf)$/i.test(pathname)) {
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/supabase-config.js") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method not allowed", {
          status: 405,
          headers: { "Allow": "GET, HEAD", "Cache-Control": "no-store" }
        });
      }
      const config = publicConfig(env);
      const responseBody = "window.AGASOBANUYE257_CONFIG = " +
        JSON.stringify(config).replace(/</g, "\\u003c") + ";";
      const response = new Response(request.method === "HEAD" ? null : responseBody, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        }
      });
      return applySecurityAndCacheHeaders(response, url.pathname);
    }

    const response = await env.ASSETS.fetch(request);
    return applySecurityAndCacheHeaders(response, url.pathname);
  }
};
