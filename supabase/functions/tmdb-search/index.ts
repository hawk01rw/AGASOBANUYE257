// Supabase Edge Function: tmdb-search
// TMDB credentials stay server-side; only verified site administrators may search/import.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"https://agasobanuye257.hawk01rw-f2b.workers.dev","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}})}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 try{
  const authHeader=req.headers.get("Authorization");
  if(!authHeader?.startsWith("Bearer "))return json({error:"Sign in is required."},401);
  const supabaseUrl=Deno.env.get("SUPABASE_URL"),anonKey=Deno.env.get("SUPABASE_ANON_KEY");
  if(!supabaseUrl||!anonKey)throw new Error("Supabase function configuration is missing.");
  const supabase=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authHeader}}});
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return json({error:"Your session is invalid. Sign in again."},401);
  const {data:profile,error:profileError}=await supabase.from("profiles").select("is_admin").eq("id",user.id).maybeSingle();
  if(profileError||profile?.is_admin!==true)return json({error:"Administrator access is required."},403);
  const body=await req.json(),token=Deno.env.get("TMDB_API_READ_ACCESS_TOKEN");
  if(!token)throw new Error("TMDB_API_READ_ACCESS_TOKEN is not configured.");
  const headers={Authorization:"Bearer "+token,Accept:"application/json"};
  if(body?.details===true){
   const tmdbId=Number(body.tmdb_id),type=body.content_type==="series"?"tv":"movie";
   if(!Number.isInteger(tmdbId)||tmdbId<1)return json({error:"A valid TMDB ID is required."},400);
   const url=new URL("https://api.themoviedb.org/3/"+type+"/"+tmdbId);
   url.searchParams.set("append_to_response","credits");
   url.searchParams.set("language","en-US");
   const response=await fetch(url,{headers}),p=await response.json();
   if(!response.ok){console.error("TMDB details failed:",response.status,p?.status_message);return json({error:"TMDB details are temporarily unavailable."},502)}
   const crew=(p.credits?.crew||[]);
   const metadata={
    overview:p.overview||"",tagline:p.tagline||"",genres:(p.genres||[]).map((x:any)=>x.name),
    runtime:p.runtime||p.episode_run_time?.[0]||null,release_date:p.release_date||p.first_air_date||"",
    vote_average:Number(p.vote_average)||0,vote_count:Number(p.vote_count)||0,
    status:p.status||"",original_language:p.original_language||"",
    production_companies:(p.production_companies||[]).map((x:any)=>x.name).filter(Boolean).slice(0,8),
    networks:(p.networks||[]).map((x:any)=>x.name).filter(Boolean).slice(0,6),
    countries:(p.production_countries||[]).map((x:any)=>x.name).filter(Boolean).slice(0,6),
    cast:(p.credits?.cast||[]).slice(0,12).map((x:any)=>({name:x.name,character:x.character||"",profile_path:x.profile_path||null})),
    crew:crew.filter((x:any)=>["Director","Writer","Screenplay","Story","Teleplay"].includes(x.job)).slice(0,16).map((x:any)=>({name:x.name,job:x.job}))
   };
   return json({metadata});
  }
  const query=typeof body?.query==="string"?body.query.trim():"",page=Math.max(1,Math.min(500,Number(body?.page)||1));
  if(query.length<2||query.length>100)return json({error:"Enter a search between 2 and 100 characters."},400);
  const url=new URL("https://api.themoviedb.org/3/search/multi");
  url.searchParams.set("query",query);url.searchParams.set("include_adult","false");url.searchParams.set("language","en-US");url.searchParams.set("page",String(page));
  const response=await fetch(url,{headers}),payload=await response.json();
  if(!response.ok){console.error("TMDB search failed:",response.status,payload?.status_message);return json({error:"TMDB search is temporarily unavailable."},502)}
  const results=(payload.results||[]).filter((item:any)=>item.media_type==="movie"||item.media_type==="tv").map((item:any)=>{
   const releaseDate=item.release_date||item.first_air_date||"";
   return {tmdb_id:item.id,content_type:item.media_type==="tv"?"series":"movie",title:item.title||item.name||item.original_title||item.original_name||"",synopsis:item.overview||"",release_date:releaseDate,release_year:releaseDate?Number(releaseDate.slice(0,4))||null:null,genre_ids:item.genre_ids||[],vote_average:Number(item.vote_average)||0,vote_count:Number(item.vote_count)||0};
  });
  return json({page:payload.page||page,total_pages:payload.total_pages||1,results});
 }catch(error){console.error("TMDB search error:",error);return json({error:"Could not search TMDB. Check the server-side function configuration."},500)}
});
