// Supabase Edge Function: imagekit-auth
// Supabase verifies the user's JWT before this function runs (verify_jwt = true).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Sign in is required." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Your session is invalid. Please sign in again." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (profileError || profile?.is_admin !== true) {
      return new Response(JSON.stringify({ error: "Only site administrators can upload images." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const privateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY");
    if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not configured.");

    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 30 * 60;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(privateKey), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const signature = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token + expire)));

    return new Response(JSON.stringify({ token, expire, signature }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("ImageKit authorization error:", error);
    return new Response(JSON.stringify({ error: "Could not authorize this image upload." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
