// Supabase Edge Function: tmdb-search
// Requires TMDB_API_READ_ACCESS_TOKEN as a Supabase Edge Function secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Sign in is required." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Your session is invalid." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (profileError || profile?.is_admin !== true) {
      return new Response(JSON.stringify({ error: "Administrator access is required." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { query, page = 1 } = await req.json();
    if (typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Enter at least two characters to search." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = Deno.env.get("TMDB_API_READ_ACCESS_TOKEN");
    if (!token) throw new Error("TMDB_API_READ_ACCESS_TOKEN is not configured.");
    const url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("query", query.trim());
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("language", "en-US");
    url.searchParams.set("page", String(Math.max(1, Math.min(500, Number(page) || 1))));

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok) {
      console.error("TMDB search failed:", response.status, payload?.status_message);
      return new Response(JSON.stringify({ error: "TMDB search failed. Check the server-side TMDB token." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = (payload.results || []).map((movie: any) => ({
      tmdb_id: movie.id,
      title: movie.title || movie.original_title || "",
      synopsis: movie.overview || "",
      release_date: movie.release_date || "",
      release_year: movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null,
      genre_ids: movie.genre_ids || [],
      vote_average: Number(movie.vote_average) || 0,
      vote_count: Number(movie.vote_count) || 0,
    }));
    return new Response(JSON.stringify({ page: payload.page, total_pages: payload.total_pages, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("TMDB search error:", error);
    return new Response(JSON.stringify({ error: "Could not search TMDB. Check function configuration." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
