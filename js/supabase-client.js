(function(){
  const config=window.AGASOBANUYE257_CONFIG||{};
  const ready=!!(window.supabase&&config.supabaseUrl&&config.supabaseAnonKey&&!config.supabaseUrl.includes("YOUR_PROJECT_ID")&&!config.supabaseAnonKey.includes("YOUR_SUPABASE"));
  const client=ready?window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey):null;
  const mapMovie=m=>({id:m.id,title:m.title||m.episode_title||"Untitled",genre:m.genre||"",year:m.release_year||"—",rating:m.tmdb_vote_average!=null?Number(m.tmdb_vote_average).toFixed(1):"—",tag:m.featured?"FEATURED":(m.content_type==="series"?"SERIES":m.content_type==="episode"?"EPISODE":"MOVIE"),type:m.content_type||"movie",poster:m.poster_url||m.thumbnail_url||"",backdrop:m.backdrop_url||m.poster_url||"",tmdbId:m.tmdb_id,voteAverage:m.tmdb_vote_average,voteCount:m.tmdb_vote_count,description:m.synopsis||"",videoPath:m.video_path,downloadUrl:m.download_url||"",trailerUrl:m.trailer_url||"",duration:m.duration_minutes,language:m.language,slug:m.slug,seriesId:m.series_id,season_number:m.season_number||null,episode_number:m.episode_number||null,episode_title:m.episode_title||m.title});
  const api={
    configured:ready,client,
    async getMovies(){
      if(!client)return null;
      const {data,error}=await client.from("movies").select("id,title,slug,synopsis,genre,release_year,poster_url,backdrop_url,imagekit_file_id,backdrop_imagekit_file_id,tmdb_id,tmdb_vote_average,tmdb_vote_count,video_path,download_url,trailer_url,duration_minutes,language,featured,content_type,series_id,season_number,episode_number,episode_title").eq("published",true).neq("content_type","episode").order("featured",{ascending:false}).order("created_at",{ascending:false});
      if(error)throw error;return (data||[]).map(mapMovie);
    },
    async getTitleById(id){
      if(!client||!id)return null;
      const {data,error}=await client.from("movies").select("*").eq("published",true).or("id.eq."+id+",slug.eq."+String(id).replace(/[(),]/g,"")).limit(1).maybeSingle();
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
      const {data,error}=await client.from("movies").select("id,title,slug,episode_title,season_number,episode_number,release_year,poster_url,video_path,download_url,synopsis,duration_minutes,language,series_id,content_type,published").eq("content_type","episode").eq("series_id",seriesId).eq("published",true).order("season_number",{ascending:true}).order("episode_number",{ascending:true});
      if(error)throw error;return (data||[]).map(mapMovie);
    },
    async getVideoUrl(path,download=false){if(!client||!path)throw new Error("No video file has been configured for this title.");const {data,error}=await client.storage.from("movie-videos").createSignedUrl(path,3600,download?{download:true}:{});if(error)throw error;return data.signedUrl;},
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