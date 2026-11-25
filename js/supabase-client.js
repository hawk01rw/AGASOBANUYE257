(function(){
  const config=window.AGASOBANUYE257_CONFIG||{};
  const ready=!!(window.supabase&&config.supabaseUrl&&config.supabaseAnonKey&&!config.supabaseUrl.includes("YOUR_PROJECT_ID")&&!config.supabaseAnonKey.includes("YOUR_SUPABASE"));
  const client=ready?window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey):null;
  const MOVIE_FIELDS="id,title,slug,synopsis,genre,release_year,poster_url,backdrop_url,tmdb_id,tmdb_vote_average,tmdb_vote_count,video_path,download_url,trailer_url,duration_minutes,language,featured,content_type,series_id,season_number,episode_number,episode_title";
  let moviesCache=null,moviesCacheAt=0,moviesRequest=null;
  const mapMovie=m=>({id:m.id,title:m.title||m.episode_title||"Untitled",genre:m.genre||"",year:m.release_year||"—",rating:m.tmdb_vote_average!=null?Number(m.tmdb_vote_average).toFixed(1):"—",tag:m.featured?"FEATURED":(m.content_type==="series"?"SERIES":m.content_type==="episode"?"EPISODE":"MOVIE"),type:m.content_type||"movie",poster:m.poster_url||m.thumbnail_url||"",backdrop:m.backdrop_url||m.poster_url||"",tmdbId:m.tmdb_id,voteAverage:m.tmdb_vote_average,voteCount:m.tmdb_vote_count,description:m.synopsis||"",videoPath:m.video_path,downloadUrl:m.download_url||"",trailerUrl:m.trailer_url||"",duration:m.duration_minutes,language:m.language,slug:m.slug,seriesId:m.series_id,season_number:m.season_number||null,episode_number:m.episode_number||null,episode_title:m.episode_title||m.title});
  const api={
    configured:ready,client,
    async getMovies(force=false){
      if(!client)return null;
      const now=Date.now();
      if(!force&&moviesCache&&now-moviesCacheAt<30000)return moviesCache;
      if(moviesRequest)return moviesRequest;
      moviesRequest=(async()=>{
        const {data,error}=await client.from("movies").select(MOVIE_FIELDS).eq("published",true).neq("content_type","episode").order("featured",{ascending:false}).order("created_at",{ascending:false});
        if(error)throw error;
        moviesCache=(data||[]).map(mapMovie);
        moviesCacheAt=Date.now();
        return moviesCache;
      })();
      try{return await moviesRequest;}finally{moviesRequest=null;}
    },
    async getTitleById(id){
      if(!client||!id)return null;
      const value=String(id).trim();
      const isUUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      const isSlug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value);
      if(!isUUID&&!isSlug)return null;
      let query=client.from("movies").select(MOVIE_FIELDS).eq("published",true);
      query=isUUID?query.eq("id",value):query.eq("slug",value);
      const {data,error}=await query.maybeSingle();
      if(error)throw error;return data?mapMovie(data):null;
    },
    async signUp(email,password,displayName){if(!client)throw new Error("Supabase is not configured yet.");const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:displayName}}});if(error)throw error;return data;},
    async signIn(email,password){if(!client)throw new Error("Supabase is not configured yet.");const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return data;},
    async signOut(){if(!client)throw new Error("Supabase is not configured yet.");const {error}=await client.auth.signOut();if(error)throw error;},
    async getSession(){if(!client)return null;const {data,error}=await client.auth.getSession();if(error)throw error;return data.session;},
    async getWatchlist(){if(!client)throw new Error("Supabase is not configured yet.");const session=await api.getSession();if(!session)throw new Error("Please sign in to view your watchlist.");const {data,error}=await client.from("watchlist").select("movie_id").eq("user_id",session.user.id);if(error)throw error;return (data||[]).map(x=>x.movie_id);},
    async toggleWatchlist(movieId,currentlySaved){if(!client)throw new Error("Supabase is not configured yet.");const session=await api.getSession();if(!session)throw new Error("Please sign in to use your watchlist.");const result=currentlySaved?await client.from("watchlist").delete().eq("movie_id",movieId).eq("user_id",session.user.id):await client.from("watchlist").insert({movie_id:movieId,user_id:session.user.id});if(result.error)throw result.error;return !currentlySaved;},
    async getEpisodes(seriesId){
      if(!client||!seriesId)return [];
      let result=await client.from("movies").select(MOVIE_FIELDS).eq("series_id",seriesId).eq("published",true).order("season_number",{ascending:true}).order("episode_number",{ascending:true});
      if(result.error)throw result.error;
      let rows=result.data||[];
      // Accept legacy episode rows that may not have content_type populated consistently.
      rows=rows.filter(row=>row.content_type==="episode"||row.series_id===seriesId);
      return rows.map(mapMovie);
    },
    async getVideoUrl(path,download=false){if(!client||!path)throw new Error("No video file has been configured for this title.");const {data,error}=await client.storage.from("movie-videos").createSignedUrl(path,21600,download?{download:true}:{});if(error)throw error;return data.signedUrl;},
    async getComments(target){
      if(!client)throw new Error("Supabase is not configured yet.");
      const column=target.episodeId?"episode_id":"movie_id",value=target.episodeId||target.movieId;
      const {data,error}=await client.from("comments").select("id,movie_id,episode_id,user_id,author_name,body,created_at").eq(column,value).eq("is_hidden",false).order("created_at",{ascending:false}).limit(100);
      if(error)throw error;return data||[];
    },
    async addComment(target,authorName,body){
      if(!client)throw new Error("Supabase is not configured yet.");
      const name=String(authorName||"").trim(),text=String(body||"").trim();
      if(name.length<1||name.length>80)throw new Error("Enter a name between 1 and 80 characters.");
      if(text.length<1||text.length>2000)throw new Error("Comment must be between 1 and 2000 characters.");
      const row={user_id:null,author_name:name,body:text};
      if(target.episodeId)row.episode_id=target.episodeId;else row.movie_id=target.movieId;
      const {data,error}=await client.from("comments").insert(row).select("id,movie_id,episode_id,user_id,author_name,body,created_at").single();
      if(error)throw error;return data;
    },
    async removeComment(commentId){if(!client)throw new Error("Supabase is not configured yet.");const {error}=await client.from("comments").delete().eq("id",commentId);if(error)throw error;}
  };
  window.AgasobanuyeDB=api;
})();