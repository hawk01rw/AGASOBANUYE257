(function(){
  const config=window.AGASOBANUYE257_CONFIG||{};
  const ready=!!(window.supabase&&config.supabaseUrl&&config.supabaseAnonKey&&!config.supabaseUrl.includes("YOUR_PROJECT_ID")&&!config.supabaseAnonKey.includes("YOUR_SUPABASE"));
  const client=ready?window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey):null;
  const api={
    configured:ready,
    client,
    async getMovies(){
      if(!client)return null;
      const {data,error}=await client.from("movies").select("id,title,slug,synopsis,genre,release_year,poster_url,backdrop_url,imagekit_file_id,backdrop_imagekit_file_id,tmdb_id,tmdb_vote_average,tmdb_vote_count,video_path,trailer_url,duration_minutes,language,featured,content_type").eq("published",true).order("featured",{ascending:false}).order("created_at",{ascending:false});
      if(error)throw error;
      return (data||[]).map(m=>({id:m.id,title:m.title,genre:m.genre,year:m.release_year||"—",rating:m.tmdb_vote_average!=null?Number(m.tmdb_vote_average).toFixed(1):"—",tag:m.featured?"FEATURED":(m.content_type==="series"?"SERIES":"MOVIE"),type:m.content_type||"movie",poster:m.poster_url||"",backdrop:m.backdrop_url||"",tmdbId:m.tmdb_id,voteAverage:m.tmdb_vote_average,voteCount:m.tmdb_vote_count,description:m.synopsis||"",videoPath:m.video_path,trailerUrl:m.trailer_url,duration:m.duration_minutes,language:m.language,slug:m.slug}));
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
      const session=await api.getSession();
      if(!session)throw new Error("Please sign in to view your watchlist.");
      const {data,error}=await client.from("watchlist").select("movie_id").eq("user_id",session.user.id);
      if(error)throw error;return (data||[]).map(x=>x.movie_id);
    },
    async toggleWatchlist(movieId,currentlySaved){
      if(!client)throw new Error("Supabase is not configured yet.");
      const session=await api.getSession();
      if(!session)throw new Error("Please sign in to use your watchlist.");
      const result=currentlySaved
        ?await client.from("watchlist").delete().eq("movie_id",movieId).eq("user_id",session.user.id)
        :await client.from("watchlist").insert({movie_id:movieId,user_id:session.user.id});
      if(result.error)throw result.error;return !currentlySaved;
    },
    async getEpisodes(seriesId){
      if(!client||!seriesId)return [];
      const {data,error}=await client.from("movies").select("id,title,slug,episode_title,season_number,episode_number,release_year,poster_url,video_path,published").eq("content_type","episode").eq("series_id",seriesId).eq("published",true).order("season_number",{ascending:true}).order("episode_number",{ascending:true});
      if(error)throw error;
      return data||[];
    },
    async getVideoUrl(path,download=false){
      if(!client||!path)throw new Error("No video file has been configured for this title.");
      const {data,error}=await client.storage.from("movie-videos").createSignedUrl(path,3600,download?{download:true}:{});
      if(error)throw error;return data.signedUrl;
    }
  };
  window.AgasobanuyeDB=api;
})();