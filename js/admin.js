(function () {
  const $ = (selector) => document.querySelector(selector);
  const loginPanel = $("#loginPanel");
  const studioPanel = $("#studioPanel");
  const loginMessage = $("#loginMessage");
  const saveMessage = $("#saveMessage");
  const state = { poster: null, backdrop: null, selected: null, movies: [] };
  const genres = { 28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",27:"Horror",10749:"Romance",878:"Science Fiction",53:"Thriller",10752:"War",37:"Western" };
  const message = (node, text, error=false) => { node.textContent=text; node.classList.toggle("error",error); };
  const slugify = (value) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,190);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const db = () => window.AgasobanuyeDB?.client;
  async function requireAdmin() {
    if (!db()) throw new Error("Supabase is not configured. Add your project URL and public key to supabase-config.js.");
    const { data: { session }, error } = await db().auth.getSession();
    if (error) throw error;
    if (!session) return false;
    const { data: profile, error: profileError } = await db().from("profiles").select("is_admin").eq("id",session.user.id).maybeSingle();
    if (profileError) {
      throw new Error("Admin check failed ("+(profileError.code||"no code")+"): "+profileError.message+". Your login is still active. Please share this exact message.");
    }
    if (!profile) {
      throw new Error("No public.profiles row was found for the signed-in user ID "+session.user.id+". The admin email may belong to a different Supabase account.");
    }
    if (profile.is_admin !== true) {
      throw new Error("The signed-in account is "+(session.user.email||"unknown")+", but its profiles.is_admin value is "+JSON.stringify(profile.is_admin)+".");
    }
    $("#adminEmail").textContent=session.user.email || "Administrator";
    loginPanel.hidden=true;studioPanel.hidden=false;$("#signOutButton").hidden=false;
    await loadCatalogue();
    return true;
  }
  async function loadCatalogue() {
    const { data, error } = await db().from("movies").select("id,title,release_year,published,featured").order("created_at",{ascending:false}).limit(30);
    if(error) throw error;
    state.movies=data||[];
    $("#catalogueList").innerHTML=state.movies.length ? state.movies.map(m=>'<div class="catalogue-item"><div><strong>'+escapeHtml(m.title)+'</strong><small>'+(m.release_year||"Year unknown")+(m.featured?" · Featured":"")+'</small></div><span class="status-pill '+(m.published?"published":"")+'">'+(m.published?"Published":"Draft")+'</span></div>').join("") : '<p class="admin-hint">No movies have been added yet.</p>';
  }
  function chooseMovie(movie) {
    state.selected=movie;
    $("#movieTmdbId").value=movie.tmdb_id;
    $("#movieTitle").value=movie.title;
    $("#movieSlug").value=slugify(movie.title);
    $("#movieYear").value=movie.release_year||"";
    $("#movieSynopsis").value=movie.synopsis||"";
    $("#selectedTmdb").textContent="TMDB ID "+movie.tmdb_id;
    const match=(movie.genre_ids||[]).map(id=>genres[id]).find(Boolean);
    if(match) $("#movieGenre").value=match;
    message(saveMessage,"TMDB details loaded. Choose your artwork and save.");
    $("#movieTitle").focus();
  }
  $("#loginForm").addEventListener("submit",async e=>{
    e.preventDefault();const button=e.submitter;button.disabled=true;message(loginMessage,"Signing in...");
    try {
      if(!db()) throw new Error("Supabase is not configured. Add your project URL and public key to supabase-config.js.");
      const { error }=await db().auth.signInWithPassword({email:$("#loginEmail").value.trim(),password:$("#loginPassword").value});
      if(error) throw error;
      await requireAdmin();
      message(loginMessage,"");
    } catch(error){message(loginMessage,error.message||"Could not sign in.",true);}
    finally{button.disabled=false;}
  });
  $("#signOutButton").addEventListener("click",async()=>{await db()?.auth.signOut();location.reload();});
  $("#tmdbSearchForm").addEventListener("submit",async e=>{
    e.preventDefault();const button=e.submitter;button.disabled=true;$("#tmdbResults").textContent="Searching TMDB...";
    try {
      const {data,error}=await db().functions.invoke("tmdb-search",{body:{query:$("#tmdbQuery").value.trim()}});
      if(error) throw error;
      const results=data?.results||[];
      $("#tmdbResults").innerHTML=results.length?results.map((m,i)=>'<article class="tmdb-result"><div><strong>'+escapeHtml(m.title)+'</strong><small>'+(m.release_year||"Release year unknown")+' · TMDB '+m.tmdb_id+' · ★ '+Number(m.vote_average||0).toFixed(1)+'</small></div><button type="button" class="admin-button subtle" data-result="'+i+'">Use this title</button></article>').join(""):'<p class="admin-hint">No results found. Try another title.</p>';
      $("#tmdbResults").querySelectorAll("[data-result]").forEach(btn=>btn.addEventListener("click",()=>chooseMovie(results[Number(btn.dataset.result)])));
    } catch(error){$("#tmdbResults").textContent=error.message||"TMDB search failed. Deploy the function and configure its secret."; }
    finally{button.disabled=false;}
  });
  function preview(fileInput,preview,status,kind) {
    fileInput.addEventListener("change",()=>{
      const file=fileInput.files?.[0];state[kind]=null;preview.hidden=true;
      if(!file){status.textContent="No file selected.";return;}
      if(!file.type.startsWith("image/")){status.textContent="Choose an image file.";fileInput.value="";return;}
      if(file.size>15*1024*1024){status.textContent="Maximum file size is 15 MB.";fileInput.value="";return;}
      preview.src=URL.createObjectURL(file);preview.hidden=false;status.textContent=file.name+" — ready to upload when you save.";
    });
  }
  preview($("#posterFile"),$("#posterPreview"),$("#posterStatus"),"poster");
  preview($("#backdropFile"),$("#backdropPreview"),$("#backdropStatus"),"backdrop");
  async function upload(file, folder, status) {
    if(!file) return null;
    status.textContent="Uploading to ImageKit...";
    const result=await window.AgasobanuyeImageKit.uploadImage(file,{folder});
    status.textContent="Uploaded successfully.";
    return result;
  }
  $("#movieForm").addEventListener("submit",async e=>{
    e.preventDefault();const button=e.submitter;button.disabled=true;message(saveMessage,"Preparing movie...");
    try {
      if(!state.selected) throw new Error("Search TMDB and select a movie first.");
      const title=$("#movieTitle").value.trim(),slug=slugify($("#movieSlug").value);
      if(!slug) throw new Error("Enter a valid movie URL slug.");
      const posterFile=$("#posterFile").files?.[0];
      if(!posterFile) throw new Error("A poster image is required. Select an image to upload to ImageKit.");
      const poster=await upload(posterFile,"/agasobanuye257/posters",$("#posterStatus"));
      const backdropFile=$("#backdropFile").files?.[0];
      const backdrop=await upload(backdropFile,"/agasobanuye257/backdrops",$("#backdropStatus"));
      const record={
        tmdb_id:Number($("#movieTmdbId").value),title,slug,
        synopsis:$("#movieSynopsis").value.trim(),genre:$("#movieGenre").value,
        release_year:$("#movieYear").value?Number($("#movieYear").value):null,
        poster_url:poster.url,imagekit_file_id:poster.fileId,
        backdrop_url:backdrop?.url||null,backdrop_imagekit_file_id:backdrop?.fileId||null,
        tmdb_vote_average:Number(state.selected.vote_average)||null,
        tmdb_vote_count:Number(state.selected.vote_count)||null,
        language:$("#movieLanguage").value.trim()||"Kinyarwanda",
        duration_minutes:$("#movieDuration").value?Number($("#movieDuration").value):null,
        video_path:$("#movieVideo").value.trim()||null,
        trailer_url:$("#movieTrailer").value.trim()||null,
        featured:$("#movieFeatured").checked,published:$("#moviePublished").checked
      };
      const {error}=await db().from("movies").upsert(record,{onConflict:"tmdb_id"});
      if(error) throw error;
      message(saveMessage,"Movie saved successfully. "+(record.published?"It is published.":"It is saved as a draft."));
      $("#movieForm").reset();$("#movieLanguage").value="Kinyarwanda";$("#posterPreview").hidden=true;$("#backdropPreview").hidden=true;
      $("#posterStatus").textContent="Choose an image to upload to ImageKit.";$("#backdropStatus").textContent="Choose a wide image to upload to ImageKit.";
      state.poster=null;state.backdrop=null;state.selected=null;$("#selectedTmdb").textContent="No TMDB title selected";
      await loadCatalogue();
    } catch(error){message(saveMessage,error.message||"Could not save movie.",true);}
    finally{button.disabled=false;}
  });
  $("#refreshMovies").addEventListener("click",()=>loadCatalogue().catch(error=>message(saveMessage,error.message,true)));
  $("#movieTitle").addEventListener("input",()=>{if(!$("#movieSlug").dataset.edited)$("#movieSlug").value=slugify($("#movieTitle").value);});
  $("#movieSlug").addEventListener("input",()=>{$("#movieSlug").dataset.edited="true";});
  $("#year").textContent=new Date().getFullYear();
  requireAdmin().catch(error=>{message(loginMessage,error.message||"Could not initialize admin studio.",true);});
})();
