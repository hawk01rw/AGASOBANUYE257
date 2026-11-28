(function () {
  const $ = s => document.querySelector(s);
  const adminStorageKey = "agasobanuye257-admin-auth";
  // Admin auth is isolated from public-site sign-in and cleared on every page load.
  try { window.sessionStorage.removeItem(adminStorageKey); } catch (_) {}
  const config = window.AGASOBANUYE257_CONFIG || {};
  const adminClient = window.supabase && config.supabaseUrl && config.supabaseAnonKey
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          storage: window.sessionStorage,
          storageKey: adminStorageKey,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
    : null;
  const state = { catalogue: [], editing: null, session: null, selectedSeries: null, categories: [], translators: [], announcements: [], tmdbResults: [], tmdbMetadata: null };
  const db = () => adminClient || window.AgasobanuyeDB?.client;
  const msg = (node, value, error=false) => { node.textContent=value; node.classList.toggle("error",error); };
  const esc = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const slugify = value => String(value||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,190);
  const normalizeTitle = value => String(value||"").normalize("NFKC").trim().replace(/\s+/g," ").toLocaleLowerCase();
  const findDuplicateTitle = (title,excludeId=null) => state.catalogue.find(item=>item.id!==excludeId&&normalizeTitle(item.title)===normalizeTitle(title));
  const ownerEmail = "mrhawk2007@gmail.com";

  async function searchTmdb(event) {
    event.preventDefault();
    const query=$("#tmdbQuery").value.trim();
    if(query.length<2){msg($("#tmdbSearchMessage"),"Enter at least two characters to search.",true);return;}
    const button=$("#tmdbSearchButton");button.disabled=true;
    msg($("#tmdbSearchMessage"),"Searching TMDB...");
    $("#tmdbSearchResults").innerHTML="";
    try{
      const {data,error}=await db().functions.invoke("tmdb-search",{body:{query}});
      if(error)throw error;
      if(data?.error)throw new Error(data.error);
      state.tmdbResults=Array.isArray(data?.results)?data.results:[];
      $("#tmdbSearchResults").innerHTML=state.tmdbResults.map((item,index)=>{
        const kind=item.content_type==="series"?"Series":"Movie";
        const meta=[kind,item.release_year||"Year unknown",item.vote_average?"★ "+Number(item.vote_average).toFixed(1):"No rating"].join(" · ");
        return '<article class="tmdb-result"><div class="tmdb-result-copy"><strong>'+esc(item.title||"Untitled")+'</strong><small>'+esc(meta)+'</small><p>'+esc(item.synopsis||"No synopsis available.")+'</p></div><button class="admin-button subtle" type="button" data-tmdb-select="'+index+'">Use details</button></article>';
      }).join("")||'<p class="admin-hint">No matching movies or series found.</p>';
      msg($("#tmdbSearchMessage"),state.tmdbResults.length+" TMDB result(s). Choose one to fill the editor.");
    }catch(error){msg($("#tmdbSearchMessage"),error.message||"TMDB search failed.",true);}
    finally{button.disabled=false;}
  }

  async function chooseTmdbResult(index) {
    const item=state.tmdbResults[Number(index)];
    if(!item)return;
    resetEditor();
    msg($("#tmdbSearchMessage"),"Fetching full TMDB details, cast and crew...");
    try{
      const {data,error}=await db().functions.invoke("tmdb-search",{body:{tmdb_id:item.tmdb_id,content_type:item.content_type,details:true}});
      if(error)throw error;
      if(data?.error)throw new Error(data.error);
      state.tmdbMetadata=data.metadata||null;
    }catch(error){
      state.tmdbMetadata=null;
      msg($("#tmdbSearchMessage"),"Basic details loaded; full credits could not be fetched: "+(error.message||"Try again."),true);
    }
    $("#contentType").value=item.content_type==="series"?"series":"movie";
    $("#contentTitle").value=item.title||"";
    $("#contentSlug").value=slugify(item.title||"");
    $("#contentSlug").dataset.edited="true";
    $("#contentSynopsis").value=state.tmdbMetadata?.overview||item.synopsis||"";
    $("#contentYear").value=item.release_year||"";
    if(state.tmdbMetadata?.genres?.length)$("#contentGenre").value=state.tmdbMetadata.genres[0];
    if(state.tmdbMetadata?.runtime)$("#contentDuration").value=state.tmdbMetadata.runtime;
    $("#contentTmdbMetadata").value=JSON.stringify(state.tmdbMetadata||{});
    $("#contentTmdbId").value=item.tmdb_id||"";
    $("#contentTmdbVoteAverage").value=Number(item.vote_average)||"";
    $("#contentTmdbVoteCount").value=Number(item.vote_count)||"";
    updateTypeFields();
    msg($("#tmdbSearchMessage"),state.tmdbMetadata?"Full TMDB details added, including rating, genres and available cast/crew. Add your authorized artwork and video before publishing.":"Basic TMDB details added. Full credits were unavailable; you can retry the selection.");
    openEditor();
  }


  async function requireAdmin() {
    if (!db()) throw new Error("Supabase is not configured. Check the public Supabase configuration.");
    const {data:{session},error}=await db().auth.getSession();
    if(error) throw error;
    if(!session) return false;
    const {data:profile,error:profileError}=await db().from("profiles").select("is_admin").eq("id",session.user.id).maybeSingle();
    if(profileError) throw new Error("Admin profile check failed: "+profileError.message);
    if(profile?.is_admin!==true) throw new Error("This signed-in account does not have administrator permission.");
    state.session=session;
    $("#adminEmail").textContent=session.user.email||"Administrator";
    $("#sidebarUser").textContent=(session.user.email||"admin").split("@")[0];$("#sidebarEmail").textContent=session.user.email||"";
    $("#dashboardDate").textContent=new Intl.DateTimeFormat("en",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(new Date());
    $("#loginPanel").hidden=true;$("#studioPanel").hidden=false;$("#signOutButton").hidden=false;
    if((session.user.email||"").toLowerCase()===ownerEmail){$("#adminManagementPanel").hidden=false;$("#adminAccessDenied").hidden=true;await loadAdmins();}else{$("#adminAccessDenied").hidden=false;}
    await loadCatalogue();
    await loadCategories();
    await loadTranslators();
    await loadAnnouncements();
    return true;
  }

  function updateTypeFields() {
    const type=$("#contentType").value, episode=type==="episode";
    $("#seriesPickerWrap").hidden=!episode;
    $("#seasonWrap").hidden=!episode;
    $("#episodeWrap").hidden=!episode;
    $("#videoUploadWrap").hidden=type==="series";
    $("#durationWrap").hidden=type==="series";
    $("#artworkFields").hidden=episode;
    $("#editorHeading").textContent=state.editing?"Edit "+type:"Add "+(type==="episode"?"episode":type==="series"?"new series":"new movie");
    
  }

  async function populateSeries() {
    const select=$("#seriesPicker"), selected=select.value;
    const series=state.catalogue.filter(x=>x.content_type==="series");
    select.innerHTML='<option value="">Select a series</option>'+series.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.title)+'</option>').join("");
    if(selected && series.some(s=>s.id===selected)) select.value=selected;
  }

  async function loadCatalogue() {
    msg($("#catalogueMessage"),"Loading catalogue...");
    const {data,error}=await db().from("movies").select("id,title,slug,synopsis,genre,release_year,poster_url,backdrop_url,imagekit_file_id,backdrop_imagekit_file_id,video_path,download_url,trailer_url,duration_minutes,language,featured,published,content_type,series_id,season_number,episode_number,episode_title,watch_url,created_at").order("created_at",{ascending:false}).limit(5000);
    if(error) throw error;
    state.catalogue=data||[];
    $("#statMovies").textContent=state.catalogue.filter(x=>x.content_type==="movie"||!x.content_type).length;
    $("#statSeries").textContent=state.catalogue.filter(x=>x.content_type==="series").length;
    $("#statEpisodes").textContent=state.catalogue.filter(x=>x.content_type==="episode").length;
    $("#statPublished").textContent=state.catalogue.filter(x=>x.published).length;
    await populateSeries();renderCatalogue();renderSeriesCatalogue();renderRecentMovies();
    $("#analyticsMovies").textContent=$("#statMovies").textContent;$("#analyticsSeries").textContent=$("#statSeries").textContent;$("#analyticsEpisodes").textContent=$("#statEpisodes").textContent;$("#analyticsPublished").textContent=$("#statPublished").textContent;
    $("#analyticsSummary").textContent=state.catalogue.length+" content records loaded directly from your Supabase database.";
    msg($("#catalogueMessage"),"");
  }

  function renderCatalogue() {
    const query=$("#catalogueSearch").value.trim().toLowerCase(), type=$("#catalogueType").value;
    const seriesById=new Map(state.catalogue.filter(x=>x.content_type==="series").map(x=>[x.id,x.title]));
    const rows=state.catalogue.filter(m=>(type==="all"||m.content_type===type||(!m.content_type&&type==="movie"))&&(!query||[m.title,m.genre,m.slug].join(" ").toLowerCase().includes(query)));
    $("#catalogueList").innerHTML=rows.length?rows.map(m=>{
      const kind=m.content_type||"movie", extra=kind==="episode"?" · S"+m.season_number+" E"+m.episode_number+" · "+(seriesById.get(m.series_id)||"Series"):kind.toUpperCase();
      return '<article class="catalogue-item"><div class="catalogue-copy"><strong>'+esc(m.title)+'</strong><small>'+esc(extra)+' · '+esc(m.release_year||"Year not set")+(m.video_path?" · Video uploaded":" · No video")+'</small><span class="status-pill '+(m.published?"published":"")+'">'+(m.published?"Published":"Draft")+'</span></div><div class="catalogue-actions"><button class="admin-button subtle" data-action="edit" data-id="'+esc(m.id)+'" type="button">Edit</button><button class="admin-button subtle" data-action="publish" data-id="'+esc(m.id)+'" type="button">'+(m.published?"Unpublish":"Publish")+'</button><button class="admin-button danger" data-action="delete" data-id="'+esc(m.id)+'" type="button">Delete</button></div></article>';
    }).join(""):'<p class="admin-hint">No matching content in your catalogue.</p>';
  }


  function renderRecentMovies(){
    const rows=state.catalogue.filter(x=>(x.content_type||"movie")==="movie").slice(0,6);
    $("#recentMovies").innerHTML=rows.length?rows.map(m=>'<tr><td><strong>'+esc(m.title)+'</strong></td><td>'+esc(m.genre||"—")+'</td><td>'+esc(m.created_at?new Date(m.created_at).toLocaleDateString():"—")+'</td><td><span class="status-pill '+(m.published?"published":"")+'">'+(m.published?"Active":"Draft")+'</span></td><td><button class="admin-button subtle" data-recent-edit="'+esc(m.id)+'">Open control</button></td></tr>').join(""):'<tr><td colspan="5">No movies have been added yet.</td></tr>';
  }
  function renderSeriesCatalogue(){
    const rows=state.catalogue.filter(x=>x.content_type==="series");
    $("#seriesCatalogueList").innerHTML=rows.length?rows.map(s=>{const n=state.catalogue.filter(e=>e.content_type==="episode"&&e.series_id===s.id).length;return '<article class="catalogue-item"><div class="catalogue-copy"><strong>'+esc(s.title)+'</strong><small>'+esc(s.genre||"Series")+' · '+n+' episodes · '+(s.published?"Published":"Draft")+'</small></div><div class="catalogue-actions"><button class="admin-button primary" data-open-series="'+esc(s.id)+'">Open episodes · '+n+'</button><button class="admin-button subtle" data-edit-series="'+esc(s.id)+'">Edit</button></div></article>'}).join(""):'<p class="admin-hint">No series yet. Add a series to start organizing episodes.</p>';
    const picker=$("#bulkSeriesPicker");if(picker){const old=picker.value;picker.innerHTML='<option value="">Choose series</option>'+rows.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.title)+'</option>').join("");if(rows.some(s=>s.id===old))picker.value=old;}
  }
  function openSeriesManager(id){
    const series=state.catalogue.find(x=>x.id===id&&x.content_type==="series");if(!series)return;
    state.selectedSeries=series;$("#episodeManagerTitle").textContent=series.title+" — Episodes";
    const episodes=state.catalogue.filter(x=>x.content_type==="episode"&&x.series_id===id).sort((a,b)=>(a.season_number-b.season_number)||(a.episode_number-b.episode_number));
    $("#seriesEpisodeList").innerHTML=episodes.length?episodes.map(ep=>'<article class="catalogue-item"><div class="catalogue-copy"><strong>S'+ep.season_number+' · E'+ep.episode_number+' — '+esc(ep.episode_title||ep.title)+'</strong><small>'+(ep.video_path?"Video uploaded":"No video")+' · '+(ep.published?"Published":"Draft")+'</small></div><div class="catalogue-actions"><button class="admin-button subtle" data-edit-episode="'+esc(ep.id)+'">Edit</button><button class="admin-button subtle" data-toggle-episode="'+esc(ep.id)+'">'+(ep.published?"Unpublish":"Publish")+'</button><button class="admin-button danger" data-delete-episode="'+esc(ep.id)+'">Delete</button></div></article>').join(""):'<p class="admin-hint">No episodes have been added to this series.</p>';
    $("#seriesEpisodeManager").hidden=false;$("#seriesEpisodeManager").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function loadCategories(){
    const {data,error}=await db().from("site_categories").select("id,name,slug,description,is_active,sort_order").order("sort_order").order("name");
    if(error){msg($("#categoryMessage"),"Categories unavailable: "+error.message,true);return;}
    state.categories=data||[];const genre=$("#contentGenre"),selectedGenre=genre.value;genre.innerHTML=state.categories.map(x=>"<option value=\""+esc(x.name)+"\">"+esc(x.name)+"</option>").join("")||"<option>Others</option>";if(state.categories.some(x=>x.name===selectedGenre))genre.value=selectedGenre;$("#categoryList").innerHTML=state.categories.map(x=>'<article class="catalogue-item"><div class="catalogue-copy"><strong>'+esc(x.name)+'</strong><small>'+esc(x.description||x.slug)+'</small></div><div class="catalogue-actions"><span class="status-pill '+(x.is_active?"published":"")+'">'+(x.is_active?"Active":"Hidden")+'</span><button class="admin-button subtle" data-category-toggle="'+esc(x.id)+'">'+(x.is_active?"Hide":"Activate")+'</button><button class="admin-button danger" data-category-delete="'+esc(x.id)+'">Delete</button></div></article>').join("")||'<p class="admin-hint">No categories yet.</p>';
  }
  function resetTranslatorForm(){ $("#translatorForm").reset(); $("#translatorId").value=""; $("#translatorOrder").value="0"; $("#translatorActive").checked=true; $("#translatorSave").textContent="Save translator"; }
  async function loadTranslators(){
    const {data,error}=await db().from("site_translators").select("id,name,languages,bio,contact_url,sort_order,is_active").order("sort_order").order("name");
    if(error){msg($("#translatorMessage"),"Translators unavailable: "+error.message,true);return;}
    state.translators=data||[];
    $("#translatorList").innerHTML=state.translators.map(x=>'<article class="catalogue-item"><div class="catalogue-copy"><strong>'+esc(x.name)+'</strong><small>'+esc(x.languages||"Languages not specified")+(x.bio?" · "+esc(x.bio):"")+'</small></div><div class="catalogue-actions"><span class="status-pill '+(x.is_active?"published":"")+'">'+(x.is_active?"Active":"Hidden")+'</span><button class="admin-button subtle" type="button" data-translator-edit="'+esc(x.id)+'">Edit</button><button class="admin-button subtle" type="button" data-translator-toggle="'+esc(x.id)+'">'+(x.is_active?"Hide":"Activate")+'</button><button class="admin-button danger" type="button" data-translator-delete="'+esc(x.id)+'">Delete</button></div></article>').join("")||'<p class="admin-hint">No translators have been added.</p>';
  }
  function resetAnnouncementForm(){ $("#announcementForm").reset(); $("#announcementId").value=""; $("#announcementTone").value="info"; $("#announcementActive").checked=true; $("#announcementSave").textContent="Save announcement"; }
  async function loadAnnouncements(){
    const {data,error}=await db().from("site_announcements").select("id,title,message,tone,is_active,starts_at,ends_at,created_at").order("created_at",{ascending:false});
    if(error){msg($("#announcementMessage"),"Announcements unavailable: "+error.message,true);return;}
    state.announcements=data||[];
    $("#announcementList").innerHTML=state.announcements.map(x=>'<article class="catalogue-item"><div class="catalogue-copy"><strong>'+esc(x.title)+'</strong><small>'+esc(x.message)+' · '+esc(x.tone)+' · '+(x.is_active?"Published":"Hidden")+'</small></div><div class="catalogue-actions"><button class="admin-button subtle" type="button" data-announcement-edit="'+esc(x.id)+'">Edit</button><button class="admin-button subtle" type="button" data-announcement-toggle="'+esc(x.id)+'">'+(x.is_active?"Unpublish":"Publish")+'</button><button class="admin-button danger" type="button" data-announcement-delete="'+esc(x.id)+'">Delete</button></div></article>').join("")||'<p class="admin-hint">No announcements have been created.</p>';
  }
  function toLocalInput(value){if(!value)return"";const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
  function toIso(value){return value?new Date(value).toISOString():null;}
  async function bulkUpload(e){
    e.preventDefault();const files=[...$("#bulkFiles").files];if(!files.length)return;
    const type=$("#bulkType").value,seriesId=$("#bulkSeriesPicker").value,season=Number($("#bulkSeason").value||1),start=Number($("#bulkEpisodeStart").value||1);
    if(type==="episode"&&!seriesId){msg($("#bulkMessage"),"Choose the series first.",true);return;}
    if(type==="episode"&&(!season||!start)){msg($("#bulkMessage"),"Enter a valid season and starting episode number.",true);return;}
    const button=$("#bulkUploadButton");button.disabled=true;$("#bulkProgress").innerHTML="";let done=0,failed=0;
    for(let i=0;i<files.length;i++){
      const file=files[i],base=file.name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").trim(),slug=slugify(base)+"-"+Date.now().toString(36)+"-"+i;
      const episodeNo=start+i,title=type==="episode"?"Episode "+episodeNo+" — "+base:base;
      const row=document.createElement("div");row.className="bulk-progress-row";row.textContent=(i+1)+"/"+files.length+" · "+title+" — uploading…";$("#bulkProgress").appendChild(row);
      try{
        const duplicate=findDuplicateTitle(title);
        if(duplicate)throw new Error("Duplicate title: already exists as \""+duplicate.title+"\". Names are checked without case sensitivity.");
        if(!file.type.startsWith("video/"))throw new Error("Not a video file");
        const path=await uploadVideo(file,type,slug);
        const record={title,slug,content_type:type,genre:$("#bulkGenre").value,release_year:$("#bulkYear").value?Number($("#bulkYear").value):null,language:$("#bulkLanguage").value.trim()||"Kinyarwanda",video_path:path,download_url:null,featured:false,published:true,created_by:state.session.user.id,series_id:type==="episode"?seriesId:null,season_number:type==="episode"?season:null,episode_number:type==="episode"?episodeNo:null,episode_title:type==="episode"?title:null};
        const {data:inserted,error}=await db().from("movies").insert(record).select("id,title,content_type,series_id,season_number,episode_number,genre,release_year,poster_url,backdrop_url,video_path,published,created_at").single();if(error)throw error;
        if(inserted)state.catalogue.unshift(inserted);
        done++;row.classList.add("success");row.textContent=(i+1)+"/"+files.length+" · "+title+" — uploaded";
      }catch(err){failed++;row.classList.add("failed");row.textContent=(i+1)+"/"+files.length+" · "+title+" — "+err.message;}
    }
    await loadCatalogue();if(type==="episode"&&seriesId){showView("series");openSeriesManager(seriesId);}
    msg($("#bulkMessage"),"Bulk upload finished: "+done+" successful, "+failed+" failed.",failed>0);button.disabled=false;
  }

  function resetEditor() {
    state.editing=null;$("#contentForm").reset();$("#contentId").value="";$("#contentTmdbId").value="";$("#contentTmdbVoteAverage").value="";$("#contentTmdbVoteCount").value="";$("#contentTmdbMetadata").value="";state.tmdbMetadata=null;$("#contentType").value="movie";$("#contentLanguage").value="Kinyarwanda";
    $("#posterPreview").hidden=true;$("#backdropPreview").hidden=true;$("#posterUrl").value="";$("#backdropUrl").value="";
    $("#posterStatus").textContent="Upload an image or paste a direct image URL.";
    $("#backdropStatus").textContent="Upload a wide image or paste a direct image URL."
    $("#videoStatus").textContent="Choose your authorized video. It will be uploaded to the private Supabase movie-videos bucket.";
    $("#saveContentButton").textContent="Save content";$("#editorHeading").textContent="Add new content";
    updateTypeFields();
  }

  function editContent(id) {
    const m=state.catalogue.find(x=>x.id===id);if(!m)return;
    state.editing=m;$("#contentId").value=m.id;$("#contentTmdbId").value=m.tmdb_id||"";$("#contentTmdbVoteAverage").value=m.tmdb_vote_average??"";$("#contentTmdbVoteCount").value=m.tmdb_vote_count??"";$("#contentTmdbMetadata").value=JSON.stringify(m.tmdb_metadata||{});state.tmdbMetadata=m.tmdb_metadata||null;$("#contentType").value=m.content_type||"movie";
    $("#contentTitle").value=m.title||"";$("#contentSlug").value=m.slug||"";
    $("#contentGenre").value=m.genre||"Drama";$("#contentYear").value=m.release_year||"";
    $("#contentLanguage").value=m.language||"Kinyarwanda";$("#contentDuration").value=m.duration_minutes||"";
    $("#contentSynopsis").value=m.synopsis||"";$("#contentTrailer").value=m.trailer_url||"";$("#contentWatchUrl").value=m.watch_url||"";$("#contentDownloadUrl").value=m.download_url||"";
    $("#seasonNumber").value=m.season_number||"";$("#episodeNumber").value=m.episode_number||"";
    
    updateTypeFields();if(m.series_id)$("#seriesPicker").value=m.series_id;
    $("#videoStatus").textContent=m.video_path?"Current video: "+m.video_path+" (choose a file only to replace it).":"No video uploaded yet.";
    $("#posterUrl").value=m.poster_url||"";if(m.poster_url){$("#posterPreview").src=m.poster_url;$("#posterPreview").hidden=false;$("#posterStatus").textContent="Current poster loaded. Upload a file or change the URL to replace it.";}
    $("#backdropUrl").value=m.backdrop_url||"";if(m.backdrop_url){$("#backdropPreview").src=m.backdrop_url;$("#backdropPreview").hidden=false;$("#backdropStatus").textContent="Current backdrop loaded. Upload a file or change the URL to replace it.";}
    $("#saveContentButton").textContent="Save changes";$("#editorHeading").textContent="Edit "+(m.content_type||"movie");
    openEditor();
  }

  async function uploadArtwork(file,url,folder,status,currentUrl,currentFileId,fileBase) {
    if(!file&&!url)return null;
    if(!file&&url===currentUrl&&currentFileId&&url.includes("ik.imagekit.io/")){
      status.textContent="Existing ImageKit artwork kept.";
      return {url:currentUrl,fileId:currentFileId};
    }
    const source=file||url;
    let fileName=file?.name||"";
    if(!fileName){
      let extension=".jpg";
      try { const path=new URL(url).pathname; const match=path.match(/\.(jpe?g|png|webp|gif|avif)$/i); if(match)extension="."+match[1].toLowerCase(); } catch(_){}
      fileName=(fileBase||"artwork")+extension;
    }
    status.textContent=file?"Uploading artwork to ImageKit...":"Importing image URL into ImageKit...";
    const result=await window.AgasobanuyeImageKit.uploadImage(source,{folder,fileName,client:db(),tags:["agasobanuye257"]});
    status.textContent="Image stored in ImageKit successfully.";
    return result;
  }

  async function uploadVideo(file,kind,slug) {
    if(!file)return null;
    if(!file.type.startsWith("video/"))throw new Error("Choose a valid video file.");
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
    // A stable path lets TUS resume an interrupted upload of the same file.
    const path=kind+"/"+slug+"/"+(file.lastModified||0)+"-"+file.size+"-"+safeName;
    const status=$("#videoStatus");
    status.textContent="Preparing secure video upload...";
    const client=db();
    if(file.size>6*1024*1024){
      if(!window.tus?.Upload)throw new Error("The resumable upload service did not load. Refresh Admin Studio and try again.");
      const {data:{session},error:sessionError}=await client.auth.getSession();
      if(sessionError)throw sessionError;
      if(!session?.access_token)throw new Error("Your administrator session expired. Sign in again.");
      const config=window.AGASOBANUYE257_CONFIG||{};
      const projectId=(new URL(config.supabaseUrl)).hostname.split(".")[0];
      status.textContent="Uploading large video with resumable transfer...";
      await new Promise((resolve,reject)=>{
        const upload=new window.tus.Upload(file,{
          endpoint:"https://"+projectId+".storage.supabase.co/storage/v1/upload/resumable",
          retryDelays:[0,3000,5000,10000,20000],
          headers:{authorization:"Bearer "+session.access_token,apikey:config.supabaseAnonKey,"x-upsert":"true"},
          uploadDataDuringCreation:true,
          removeFingerprintOnSuccess:true,
          chunkSize:6*1024*1024,
          allowedMetaFields:["bucketName","objectName","contentType","cacheControl"],
          metadata:{bucketName:"movie-videos",objectName:path,contentType:file.type||"application/octet-stream",cacheControl:"3600"},
          onError:error=>reject(error),
          onProgress:(uploaded,total)=>{
            const percent=total?Math.round(uploaded/total*100):0;
            status.textContent="Uploading video · "+percent+"%";
          },
          onSuccess:()=>resolve()
        });
        upload.findPreviousUploads().then(previous=>{
          if(previous.length)upload.resumeFromPreviousUpload(previous[0]);
          upload.start();
        }).catch(reject);
      });
    }else{
      status.textContent="Uploading video...";
      const {data,error}=await client.storage.from("movie-videos").upload(path,file,{contentType:file.type,cacheControl:"3600",upsert:true});
      if(error)throw error;
    }
    status.textContent="Video uploaded successfully.";
    return path;
  }

  async function saveContent(e) {
    e.preventDefault();const button=$("#saveContentButton");button.disabled=true;msg($("#saveMessage"),"Saving your content...");
    try {
      const type=$("#contentType").value,title=$("#contentTitle").value.trim(),slug=slugify($("#contentSlug").value||title);
      if(!title||!slug)throw new Error("Enter a title and valid URL slug.");
      const duplicate=findDuplicateTitle(title,state.editing?.id||null);
      if(duplicate)throw new Error("This name is already used by \""+duplicate.title+"\". Choose a different title.");
      const seriesId=type==="episode"?$("#seriesPicker").value:null;
      if(type==="episode"&&!seriesId)throw new Error("Choose the series this episode belongs to.");
      if(type==="episode"&&(!Number($("#seasonNumber").value)||!Number($("#episodeNumber").value)))throw new Error("Enter both season and episode numbers.");
      const videoFiles=type==="series"?[]:Array.from($("#videoFiles").files||[]);
      if(videoFiles.length>26)throw new Error("A movie can have up to 26 parts (A–Z).");
      if(videoFiles.length>1&&type!=="movie")throw new Error("Multi-part uploads are for movies. Upload series episodes separately.");
      if(videoFiles.some(file=>!file.type.startsWith("video/")))throw new Error("Choose valid video files only.");
      const posterFile=$("#posterFile").files[0],backdropFile=$("#backdropFile").files[0],posterUrl=$("#posterUrl").value.trim(),backdropUrl=$("#backdropUrl").value.trim();
      const validImageUrl=value=>{if(!value)return true;try{const u=new URL(value);return u.protocol==="https:"||u.protocol==="http:";}catch(_){return false;}};
       const watchUrl=$("#contentWatchUrl").value.trim();
       const validWatchUrl=value=>{if(!value)return true;try{const u=new URL(value,location.href);return (u.protocol==="https:"||u.protocol==="http:")&&(value.startsWith("/")||value.startsWith("./")||/^https?:\/\//i.test(value));}catch(_){return false;}};
       if(!validWatchUrl(watchUrl))throw new Error("Enter a valid http://, https:// or same-site relative Watch URL.");
      if(!validImageUrl(posterUrl)||!validImageUrl(backdropUrl))throw new Error("Enter a valid http:// or https:// image URL.");
      const poster=await uploadArtwork(posterFile,posterUrl,"/agasobanuye257/posters",$("#posterStatus"),state.editing?.poster_url,state.editing?.imagekit_file_id,slug+"-poster");
      const backdrop=await uploadArtwork(backdropFile,backdropUrl,"/agasobanuye257/backdrops",$("#backdropStatus"),state.editing?.backdrop_url,state.editing?.backdrop_imagekit_file_id,slug+"-backdrop");
      const video=videoFiles.length===1?await uploadVideo(videoFiles[0],type,slug):null;
      const record={
        title,slug,content_type:type,tmdb_id:$("#contentTmdbId").value?Number($("#contentTmdbId").value):null,
        tmdb_vote_average:$("#contentTmdbVoteAverage").value?Number($("#contentTmdbVoteAverage").value):null,
        tmdb_vote_count:$("#contentTmdbVoteCount").value?Number($("#contentTmdbVoteCount").value):null,
        tmdb_metadata:$("#contentTmdbMetadata").value?JSON.parse($("#contentTmdbMetadata").value):{},
        synopsis:$("#contentSynopsis").value.trim(),genre:$("#contentGenre").value,
        release_year:$("#contentYear").value?Number($("#contentYear").value):null,
        language:$("#contentLanguage").value.trim()||"Kinyarwanda",
        duration_minutes:type==="series"||!$("#contentDuration").value?null:Number($("#contentDuration").value),
        trailer_url:$("#contentTrailer").value.trim()||null,watch_url:watchUrl||null,download_url:$("#contentDownloadUrl").value.trim()||null,
        featured:false,published:true,
        series_id:seriesId,season_number:type==="episode"?Number($("#seasonNumber").value):null,
        episode_number:type==="episode"?Number($("#episodeNumber").value):null,episode_title:type==="episode"?title:null
      };
      if(poster){record.poster_url=poster.url;record.imagekit_file_id=poster.fileId;}else if(state.editing?.poster_url){record.poster_url=state.editing.poster_url;record.imagekit_file_id=state.editing.imagekit_file_id||null;}else{record.poster_url=null;record.imagekit_file_id=null;}
      if(backdrop){record.backdrop_url=backdrop.url;record.backdrop_imagekit_file_id=backdrop.fileId;}else if(state.editing?.backdrop_url){record.backdrop_url=state.editing.backdrop_url;record.backdrop_imagekit_file_id=state.editing.backdrop_imagekit_file_id||null;}else{record.backdrop_url=null;record.backdrop_imagekit_file_id=null;}
      if(video)record.video_path=video;else if(videoFiles.length>1)record.video_path=null;else if(state.editing?.video_path)record.video_path=state.editing.video_path;
      let savedId=state.editing?.id||null;
      if(state.editing){const {error}=await db().from("movies").update(record).eq("id",savedId);if(error)throw error;}
      else{record.created_by=state.session.user.id;const {data,error}=await db().from("movies").insert(record).select("id").single();if(error)throw error;savedId=data.id;}
      if(videoFiles.length>1){
        const uploaded=[];
        for(let i=0;i<videoFiles.length;i++){
          const label=String.fromCharCode(65+i),file=videoFiles[i];
          $("#videoStatus").textContent="Uploading Part "+label+" ("+(i+1)+"/"+videoFiles.length+")…";
          const path=await uploadVideo(file,"movie",slug+"-part-"+label.toLowerCase());
          uploaded.push({movie_id:savedId,part_label:"Part "+label,video_path:path,sort_order:i+1});
        }
        const {error:removeError}=await db().from("movie_parts").delete().eq("movie_id",savedId);if(removeError)throw removeError;
        const {error:partsError}=await db().from("movie_parts").insert(uploaded);if(partsError)throw partsError;
        $("#videoStatus").textContent=uploaded.length+" parts uploaded successfully.";
      }else if(videoFiles.length===1){const {error}=await db().from("movie_parts").delete().eq("movie_id",savedId);if(error)throw error;}
      await loadCatalogue();resetEditor();msg($("#saveMessage"),"Content saved successfully.");
    }catch(error){msg($("#saveMessage"),error.message||"Could not save content.",true);}
    finally{button.disabled=false;}
  }
  async function deleteContent(id) {
    const m=state.catalogue.find(x=>x.id===id);if(!m)return;
    const prompt=m.content_type==="series"?"Delete this series and all its episodes? This cannot be undone.":"Delete this content? This cannot be undone.";
    if(!confirm(prompt))return;
    msg($("#catalogueMessage"),"Deleting content...");
    try{
      let paths=[];
      if(m.content_type==="series"){
        paths=state.catalogue.filter(x=>x.series_id===id&&x.video_path).map(x=>x.video_path);
      }
      if(m.video_path)paths.push(m.video_path);
      const {data:parts,error:partsError}=await db().from("movie_parts").select("video_path").eq("movie_id",id);
      if(partsError)throw partsError;
      paths.push(...(parts||[]).map(part=>part.video_path).filter(Boolean));
      const {error}=await db().from("movies").delete().eq("id",id);if(error)throw error;
      if(paths.length)await db().storage.from("movie-videos").remove([...new Set(paths)]);
      await loadCatalogue();msg($("#catalogueMessage"),"Content deleted.");
    }catch(error){msg($("#catalogueMessage"),error.message||"Delete failed.",true);}
  }

  async function setPublished(id) {
    const m=state.catalogue.find(x=>x.id===id);if(!m)return;
    const {error}=await db().from("movies").update({published:!m.published}).eq("id",id);
    if(error){msg($("#catalogueMessage"),error.message,true);return;}
    await loadCatalogue();
  }

  async function loadAdmins() {
    const {data,error}=await db().rpc("admin_studio_list_admins");
    if(error){msg($("#adminMessage"),"Admin management setup needed: "+error.message,true);return;}
    $("#adminUsersList").innerHTML=(data||[]).map(a=>'<div class="catalogue-item"><div><strong>'+esc(a.email)+'</strong><small>Administrator</small></div>'+(a.email.toLowerCase()===ownerEmail?'<span class="status-pill published">Project owner</span>':'<button class="admin-button danger" type="button" data-revoke="'+esc(a.email)+'">Revoke access</button>')+'</div>').join("")||'<p class="admin-hint">No administrator accounts found.</p>';
  }


  const menuToggle=$("#adminMenuToggle");
  menuToggle?.addEventListener("click",()=>{const open=document.body.classList.toggle("admin-nav-open");menuToggle.setAttribute("aria-expanded",String(open));menuToggle.setAttribute("aria-label",open?"Close navigation":"Open navigation");});
  document.addEventListener("click",e=>{if(document.body.classList.contains("admin-nav-open")&&!e.target.closest(".pro-sidebar")&&!e.target.closest("#adminMenuToggle")){document.body.classList.remove("admin-nav-open");menuToggle?.setAttribute("aria-expanded","false");}});
  document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{showView(b.dataset.view);document.body.classList.remove("admin-nav-open");menuToggle?.setAttribute("aria-expanded","false");}));
  function openEditor(){ $("#contentEditorCard").classList.add("editor-open"); document.body.classList.add("editor-modal-open"); }
  function closeEditor(){ $("#contentEditorCard").classList.remove("editor-open"); document.body.classList.remove("editor-modal-open"); }
  function showView(name){
    document.querySelectorAll(".pro-view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name));
    document.querySelectorAll(".pro-nav [data-view]").forEach(v=>v.classList.toggle("active",v.dataset.view===name));
    $("#viewTitle").textContent=({overview:"Overview",movies:"Movies",series:"Series",bulk:"Bulk Upload",categories:"Categories",superadmin:"Super Admin",analytics:"Analytics",settings:"Settings",translators:"Translators",announcements:"Announcements"})[name]||"Overview";
    if(name==="series")renderSeriesCatalogue();
  }
  $("#addMovieButton").addEventListener("click",()=>{resetEditor();$("#contentType").value="movie";updateTypeFields();openEditor();});
  $("#addSeriesButton").addEventListener("click",()=>{resetEditor();$("#contentType").value="series";updateTypeFields();showView("movies");openEditor();});
  $("#addEpisodeButton").addEventListener("click",()=>{if(!state.selectedSeries)return;resetEditor();$("#contentType").value="episode";updateTypeFields();$("#seriesPicker").value=state.selectedSeries.id;showView("movies");openEditor();});
  $("#bulkSeriesEpisodes").addEventListener("click",()=>{if(!state.selectedSeries)return;showView("bulk");$("#bulkType").value="episode";$("#bulkSeriesWrap").hidden=false;$("#bulkSeasonWrap").hidden=false;$("#bulkSeriesPicker").value=state.selectedSeries.id;});
  $("#bulkType").addEventListener("change",()=>{const ep=$("#bulkType").value==="episode";$("#bulkSeriesWrap").hidden=!ep;$("#bulkSeasonWrap").hidden=!ep;});
  $("#bulkUploadForm").addEventListener("submit",bulkUpload);
  $("#seriesCatalogueList").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const id=b.dataset.openSeries||b.dataset.editSeries;if(!id)return;if(b.dataset.openSeries)openSeriesManager(id);else{showView("movies");editContent(id);}});
  $("#seriesEpisodeList").addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;const id=b.dataset.editEpisode||b.dataset.toggleEpisode||b.dataset.deleteEpisode;if(!id)return;if(b.dataset.editEpisode){showView("movies");editContent(id);return;}if(b.dataset.toggleEpisode)await setPublished(id);if(b.dataset.deleteEpisode)await deleteContent(id);openSeriesManager(state.selectedSeries.id);});
  $("#recentMovies").addEventListener("click",e=>{const b=e.target.closest("[data-recent-edit]");if(!b)return;showView("movies");editContent(b.dataset.recentEdit);});
  $("#categoryForm").addEventListener("submit",async e=>{e.preventDefault();const name=$("#categoryName").value.trim(),slug=slugify(name);try{const {error}=await db().from("site_categories").insert({name,slug,description:$("#categoryDescription").value.trim()});if(error)throw error;$("#categoryForm").reset();await loadCategories();msg($("#categoryMessage"),"Category added.");}catch(err){msg($("#categoryMessage"),err.message,true);}});
  $("#categoryList").addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;try{if(b.dataset.categoryToggle){const item=state.categories.find(x=>x.id===b.dataset.categoryToggle);const {error}=await db().from("site_categories").update({is_active:!item.is_active}).eq("id",item.id);if(error)throw error;}if(b.dataset.categoryDelete){if(!confirm("Delete this category?"))return;const {error}=await db().from("site_categories").delete().eq("id",b.dataset.categoryDelete);if(error)throw error;}await loadCategories();}catch(err){msg($("#categoryMessage"),err.message,true);}});

  $("#translatorForm").addEventListener("submit",async e=>{e.preventDefault();const button=$("#translatorSave");button.disabled=true;try{const id=$("#translatorId").value;const row={name:$("#translatorName").value.trim(),languages:$("#translatorLanguages").value.trim(),bio:$("#translatorBio").value.trim(),contact_url:$("#translatorContact").value.trim()||null,sort_order:Number($("#translatorOrder").value||0),is_active:$("#translatorActive").checked};const query=id?db().from("site_translators").update(row).eq("id",id):db().from("site_translators").insert({...row,created_by:state.session.user.id});const {error}=await query;if(error)throw error;resetTranslatorForm();msg($("#translatorMessage"),"Translator saved.");await loadTranslators();}catch(error){msg($("#translatorMessage"),error.message,true);}finally{button.disabled=false;}});
  $("#translatorReset").addEventListener("click",resetTranslatorForm);
  $("#translatorList").addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;try{const id=b.dataset.translatorEdit||b.dataset.translatorToggle||b.dataset.translatorDelete;const item=state.translators.find(x=>x.id===id);if(!item)return;if(b.dataset.translatorEdit){$("#translatorId").value=item.id;$("#translatorName").value=item.name;$("#translatorLanguages").value=item.languages||"";$("#translatorBio").value=item.bio||"";$("#translatorContact").value=item.contact_url||"";$("#translatorOrder").value=item.sort_order||0;$("#translatorActive").checked=item.is_active;$("#translatorSave").textContent="Update translator";$("#translatorForm").scrollIntoView({behavior:"smooth"});return;}if(b.dataset.translatorDelete&&!confirm("Delete "+item.name+"?"))return;if(b.dataset.translatorToggle){const {error}=await db().from("site_translators").update({is_active:!item.is_active}).eq("id",id);if(error)throw error;}if(b.dataset.translatorDelete){const {error}=await db().from("site_translators").delete().eq("id",id);if(error)throw error;}await loadTranslators();msg($("#translatorMessage"),"Translator list updated.");}catch(error){msg($("#translatorMessage"),error.message,true);}});
  $("#announcementForm").addEventListener("submit",async e=>{e.preventDefault();const button=$("#announcementSave");button.disabled=true;try{const id=$("#announcementId").value;const row={title:$("#announcementTitle").value.trim(),message:$("#announcementMessageText").value.trim(),tone:$("#announcementTone").value,is_active:$("#announcementActive").checked,starts_at:toIso($("#announcementStart").value),ends_at:toIso($("#announcementEnd").value)};const query=id?db().from("site_announcements").update(row).eq("id",id):db().from("site_announcements").insert({...row,created_by:state.session.user.id});const {error}=await query;if(error)throw error;resetAnnouncementForm();msg($("#announcementMessage"),"Announcement saved.");await loadAnnouncements();}catch(error){msg($("#announcementMessage"),error.message,true);}finally{button.disabled=false;}});
  $("#announcementReset").addEventListener("click",resetAnnouncementForm);
  $("#announcementList").addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;try{const id=b.dataset.announcementEdit||b.dataset.announcementToggle||b.dataset.announcementDelete;const item=state.announcements.find(x=>x.id===id);if(!item)return;if(b.dataset.announcementEdit){$("#announcementId").value=item.id;$("#announcementTitle").value=item.title;$("#announcementMessageText").value=item.message;$("#announcementTone").value=item.tone;$("#announcementActive").checked=item.is_active;$("#announcementStart").value=toLocalInput(item.starts_at);$("#announcementEnd").value=toLocalInput(item.ends_at);$("#announcementSave").textContent="Update announcement";$("#announcementForm").scrollIntoView({behavior:"smooth"});return;}if(b.dataset.announcementDelete&&!confirm("Delete this announcement?"))return;if(b.dataset.announcementToggle){const {error}=await db().from("site_announcements").update({is_active:!item.is_active}).eq("id",id);if(error)throw error;}if(b.dataset.announcementDelete){const {error}=await db().from("site_announcements").delete().eq("id",id);if(error)throw error;}await loadAnnouncements();msg($("#announcementMessage"),"Announcement list updated.");}catch(error){msg($("#announcementMessage"),error.message,true);}});
  $("#loginForm").addEventListener("submit",async e=>{
    e.preventDefault();const button=e.submitter;button.disabled=true;msg($("#loginMessage"),"Signing in...");
    try{const {error}=await db().auth.signInWithPassword({email:$("#loginEmail").value.trim(),password:$("#loginPassword").value});if(error)throw error;await requireAdmin();msg($("#loginMessage"),"");}
    catch(error){msg($("#loginMessage"),error.message||"Could not sign in.",true);}
    finally{button.disabled=false;}
  });
  $("#signOutButton").addEventListener("click",async()=>{await db()?.auth.signOut();location.reload();});
  $("#tmdbSearchForm").addEventListener("submit",searchTmdb);
  $("#tmdbSearchResults").addEventListener("click",e=>{const b=e.target.closest("[data-tmdb-select]");if(b){b.disabled=true;b.textContent="Loading…";chooseTmdbResult(b.dataset.tmdbSelect).catch(err=>msg($("#tmdbSearchMessage"),err.message||"Could not load details.",true));}});
  $("#contentForm").addEventListener("submit",saveContent);
  $("#contentType").addEventListener("change",updateTypeFields);
  $("#contentTitle").addEventListener("input",()=>{if(!$("#contentSlug").dataset.edited)$("#contentSlug").value=slugify($("#contentTitle").value);});
  $("#contentSlug").addEventListener("input",()=>$("#contentSlug").dataset.edited="true");
  $("#resetEditor").addEventListener("click",resetEditor);
  $("#closeContentEditor").addEventListener("click",closeEditor);
  $("#refreshCatalogue").addEventListener("click",()=>loadCatalogue().catch(e=>msg($("#catalogueMessage"),e.message,true)));
  $("#catalogueSearch").addEventListener("input",renderCatalogue);$("#catalogueType").addEventListener("change",renderCatalogue);
  $("#catalogueList").addEventListener("click",e=>{
    const b=e.target.closest("button[data-action]");if(!b)return;
    const id=b.dataset.id;
    if(b.dataset.action==="edit")editContent(id);
    if(b.dataset.action==="delete")deleteContent(id);
    if(b.dataset.action==="publish")setPublished(id);
  });
  function imagePreview(input,preview,status,urlInput){
    input.addEventListener("change",()=>{const file=input.files?.[0];if(!file)return;if(!file.type.startsWith("image/")||file.size>15*1024*1024){msg(status,"Choose an image up to 15 MB.",true);input.value="";return;}urlInput.value="";preview.src=URL.createObjectURL(file);preview.hidden=false;status.textContent=file.name+" ready to upload.";});
    urlInput.addEventListener("input",()=>{const value=urlInput.value.trim();if(!value){if(!input.files?.length)preview.hidden=true;return;}try{const u=new URL(value);if(!["http:","https:"].includes(u.protocol))throw new Error();input.value="";preview.src=value;preview.hidden=false;status.textContent="Image URL ready. The image will be saved as a remote URL."; }catch(_){preview.hidden=true;status.textContent="Enter a valid http:// or https:// image URL.";}});
    preview.addEventListener("error",()=>{preview.hidden=true;status.textContent="Image preview could not load. Check the URL or use another image.";});
  }
  imagePreview($("#posterFile"),$("#posterPreview"),$("#posterStatus"),$("#posterUrl"));
  imagePreview($("#backdropFile"),$("#backdropPreview"),$("#backdropStatus"),$("#backdropUrl"));

  $("#adminGrantForm").addEventListener("submit",async e=>{
    e.preventDefault();const button=e.submitter;button.disabled=true;
    try{
      const email=$("#newAdminEmail").value.trim();
      const {error}=await db().rpc("admin_studio_manage_admin",{target_email:email,make_admin:true});
      if(error)throw error;
      $("#adminGrantForm").reset();msg($("#adminMessage"),"Administrator access granted to "+email+".");await loadAdmins();
    }catch(error){msg($("#adminMessage"),error.message||"Could not grant administrator access.",true);}
    finally{button.disabled=false;}
  });
  $("#adminUsersList").addEventListener("click",async e=>{
    const b=e.target.closest("[data-revoke]");if(!b)return;
    const email=b.dataset.revoke;if(!confirm("Revoke administrator access for "+email+"?"))return;
    try{const {error}=await db().rpc("admin_studio_manage_admin",{target_email:email,make_admin:false});if(error)throw error;msg($("#adminMessage"),"Admin access revoked.");await loadAdmins();}
    catch(error){msg($("#adminMessage"),error.message,true);}
  });
  const yearNode=$("#year");if(yearNode)yearNode.textContent=new Date().getFullYear();updateTypeFields();
  // A fresh page load always starts at the sign-in screen. The isolated
  // sessionStorage auth client prevents this from signing out public-site users.
  if (!db()) {
    msg($("#loginMessage"),"Supabase is not configured. Check the public Supabase configuration.",true);
  } else {
    $("#loginPanel").hidden=false;
    $("#studioPanel").hidden=true;
    $("#signOutButton").hidden=true;
    msg($("#loginMessage"),"Sign in to open Admin Studio.");
  }
})();