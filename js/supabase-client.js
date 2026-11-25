(function(){
  const config=window.AGASOBANUYE257_CONFIG||{};
  const ready=!!(window.supabase&&config.supabaseUrl&&config.supabaseAnonKey&&!config.supabaseUrl.includes("YOUR_PROJECT_ID")&&!config.supabaseAnonKey.includes("YOUR_SUPABASE"));
  const client=ready?window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey):null;
  const api={
    configured:ready,
    client,
    async getMovies(){
      if(!client)return null;
      const {data,error}=await client.from("movies").select("id,title,slug,synopsis,genre,release_year,poster_url,video_path,trailer_url,duration_minutes,language,featured").eq("published",true).order("featured",{ascending:false}).order("created_at",{ascending:false});
      if(error)throw error;
      return (data||[]).map(m=>({id:m.id,title:m.title,genre:m.genre,year:m.release_year||"—",rating:"—",tag:m.featured?"FEATURED":"MOVIE",poster:m.poster_url||"",description:m.synopsis||"",videoPath:m.video_path,trailerUrl:m.trailer_url,duration:m.duration_minutes,language:m.language,slug:m.slug}));
    },
    async signUp(email,password,displayName){
      if(!client)throw new Error("Supabase is not configured yet.");
      const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:displayName}}});
      if(error)throw error;return data;
    },
    async signIn(email,password){
      if(!client)throw new Error("Supabase is not configured yet.");
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;return data;
    },
    async signOut(){
      if(!client)throw new Error("Supabase is not configured yet.");
      const {error}=await client.auth.signOut();if(error)throw error;
    },
    async getSession(){
      if(!client)return null;
      const {data,error}=await client.auth.getSession();if(error)throw error;return data.session;
    },
    async getWatchlist(){
      if(!client)throw new Error("Supabase is not configured yet.");
      const {data,error}=await client.from("watchlist").select("movie_id");if(error)throw error;return (data||[]).map(x=>x.movie_id);
    },
    async toggleWatchlist(movieId,currentlySaved){
      if(!client)throw new Error("Supabase is not configured yet.");
      const user=await api.getSession();if(!user)throw new Error("Please sign in to use your watchlist.");
      const result=currentlySaved
        ?await client.from("watchlist").delete().eq("movie_id",movieId)
        :await client.from("watchlist").insert({movie_id:movieId});
      if(result.error)throw result.error;return !currentlySaved;
    },
    async getVideoUrl(path){
      if(!client||!path)throw new Error("No video file has been configured for this title.");
      const {data,error}=await client.storage.from("movie-videos").createSignedUrl(path,3600);
      if(error)throw error;return data.signedUrl;
    }
  };
  window.AgasobanuyeDB=api;
})();