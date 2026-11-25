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
  const state = { catalogue: [], editing: null, session: null, selectedSeries: null, categories: [] };
  const db = () => adminClient || window.AgasobanuyeDB?.client;
  const msg = (node, value, error=false) => { node.textContent=value; node.classList.toggle("error",error); };
  const esc = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const slugify = value => String(value||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,190);
  const ownerEmail = "mrhawk2007@gmail.com";

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
    if(type==="series") $("#contentFeatured").checked=false;
  }

  async function populateSeries() {
    const select=$("#seriesPicker"), selected=select.value;
    const series=state.catalogue.filter(x=>x.content_type==="series");
    select.innerHTML='<option value="">Select a series</option>'+series.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.title)+'</option>').join("");
    if(selected && series.some(s=>s.id===selected)) select.value=selected;
  }

  async function loadCatalogue() {
    msg($("#catalogueMessage"),"Loading catalogue...");
    const {data,error}=await db().from("movies").select("id,title,slug,synopsis,genre,release_year,poster_url,backdrop_url,imagekit_file_id,backdrop_imagekit_file_id,video_path,download_url,trailer_url,duration_minutes,language,featured,published,content_type,series_id,season_number,episode_number,episode_title,created_at").order("created_at",{ascending:false}).limit(500);
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
        if(!file.type.startsWith("video/"))throw new Error("Not a video file");
        const path=await uploadVideo(file,type,slug);
        const record={title,slug,content_type:type,genre:$("#bulkGenre").value,release_year:$("#bulkYear").value?Number($("#bulkYear").value):null,language:$("#bulkLanguage").value.trim()||"Kinyarwanda",video_path:path,download_url:null,featured:false,published:$("#bulkPublish").checked,created_by:state.session.user.id,series_id:type==="episode"?seriesId:null,season_number:type==="episode"?season:null,episode_number:type==="episode"?episodeNo:null,episode_title:type==="episode"?title:null};
        const {error}=await db().from("movies").insert(record);if(error)throw error;
        done++;row.classList.add("success");row.textContent=(i+1)+"/"+files.length+" · "+title+" — uploaded";
      }catch(err){failed++;row.classList.add("failed");row.textContent=(i+1)+"/"+files.length+" · "+title+" — "+err.message;}
    }
    await loadCatalogue();if(type==="episode"&&seriesId){showView("series");openSeriesManager(seriesId);}
    msg($("#bulkMessage"),"Bulk upload finished: "+done+" successful, "+failed+" failed.",failed>0);button.disabled=false;
  }

  function resetEditor() {
    state.editing=null;$("#contentForm").reset();$("#contentId").value="";$("#contentType").value="movie";$("#contentLanguage").value="Kinyarwanda";
    $("#posterPreview").hidden=true;$("#backdropPreview").hidden=true;
    $("#posterStatus").textContent="Choose an image to upload to ImageKit.";
    $("#backdropStatus").textContent="Choose a wide image to upload to ImageKit.";
    $("#videoStatus").textContent="Choose your authorized video. It will be uploaded to the private Supabase movie-videos bucket.";
    $("#saveContentButton").textContent="Save content";$("#editorHeading").textContent="Add new content";
    updateTypeFields();window.scrollTo({top:0,behavior:"smooth"});
  }

  function editContent(id) {
    const m=state.catalogue.find(x=>x.id===id);if(!m)return;
    state.editing=m;$("#contentId").value=m.id;$("#contentType").value=m.content_type||"movie";
    $("#contentTitle").value=m.title||"";$("#contentSlug").value=m.slug||"";
    $("#contentGenre").value=m.genre||"Drama";$("#contentYear").value=m.release_year||"";
    $("#contentLanguage").value=m.language||"Kinyarwanda";$("#contentDuration").value=m.duration_minutes||"";
    $("#contentSynopsis").value=m.synopsis||"";$("#contentTrailer").value=m.trailer_url||"";$("#contentDownloadUrl").value=m.download_url||"";
    $("#seasonNumber").value=m.season_number||"";$("#episodeNumber").value=m.episode_number||"";
    $("#contentFeatured").checked=!!m.featured;$("#contentPublished").checked=!!m.published;
    updateTypeFields();if(m.series_id)$("#seriesPicker").value=m.series_id;
    $("#videoStatus").textContent=m.video_path?"Current video: "+m.video_path+" (choose a file only to replace it).":"No video uploaded yet.";
    if(m.poster_url){$("#posterPreview").src=m.poster_url;$("#posterPreview").hidden=false;$("#posterStatus").textContent="Current poster is saved. Choose a file to replace it.";}
    if(m.backdrop_url){$("#backdropPreview").src=m.backdrop_url;$("#backdropPreview").hidden=false;$("#backdropStatus").textContent="Current backdrop is saved. Choose a file to replace it.";}
    $("#saveContentButton").textContent="Save changes";$("#editorHeading").textContent="Edit "+(m.content_type||"movie");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function uploadArtwork(file,folder,status) {
    if(!file)return null;
    status.textContent="Uploading artwork to ImageKit...";
    const result=await window.AgasobanuyeImageKit.uploadImage(file,{folder,client:db()});
    status.textContent="Artwork uploaded.";
    return result;
  }

  async function uploadVideo(file,kind,slug) {
    if(!file)return null;
    if(!file.type.startsWith("video/"))throw new Error("Choose a valid video file.");
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
    const path=kind+"/"+slug+"/"+Date.now()+"-"+safeName;
    $("#videoStatus").textContent="Uploading video to private Supabase storage...";
    const {data,error}=await db().storage.from("movie-videos").upload(path,file,{contentType:file.type,upsert:false});
    if(error)throw error;
    $("#videoStatus").textContent="Video uploaded successfully.";
    return data.path;
  }

  async function saveContent(e) {
    e.preventDefault();const button=$("#saveContentButton");button.disabled=true;msg($("#saveMessage"),"Saving your content...");
    try {
      const type=$("#contentType").value,title=$("#contentTitle").value.trim(),slug=slugify($("#contentSlug").value||title);
      if(!title||!slug)throw new Error("Enter a title and valid URL slug.");
      const seriesId=type==="episode"?$("#seriesPicker").value:null;
      if(type==="episode"&&!seriesId)throw new Error("Choose the series this episode belongs to.");
      if(type==="episode"&&(!Number($("#seasonNumber").value)||!Number($("#episodeNumber").value)))throw new Error("Enter both season and episode numbers.");
      const poster=await uploadArtwork($("#posterFile").files[0],"/agasobanuye257/posters",$("#posterStatus"));
      const backdrop=await uploadArtwork($("#backdropFile").files[0],"/agasobanuye257/backdrops",$("#backdropStatus"));
      const video=type==="series"?null:await uploadVideo($("#videoFile").files[0],type,slug);
      const record={
        title,slug,content_type:type,
        synopsis:$("#contentSynopsis").value.trim(),genre:$("#contentGenre").value,
        release_year:$("#contentYear").value?Number($("#contentYear").value):null,
        language:$("#contentLanguage").value.trim()||"Kinyarwanda",
        duration_minutes:type==="series"||!$("#contentDuration").value?null:Number($("#contentDuration").value),
        trailer_url:$("#contentTrailer").value.trim()||null,
        download_url:$("#contentDownloadUrl").value.trim()||null,
        featured:type==="series"?false:$("#contentFeatured").checked,
        published:$("#contentPublished").checked,
        series_id:seriesId,
        season_number:type==="episode"?Number($("#seasonNumber").value):null,
        episode_number:type==="episode"?Number($("#episodeNumber").value):null,
        episode_title:type==="episode"?title:null
      };
      if(poster){record.poster_url=poster.url;record.imagekit_file_id=poster.fileId;}
      else if(state.editing?.poster_url){record.poster_url=state.editing.poster_url;record.imagekit_file_id=state.editing.imagekit_file_id;}
      if(backdrop){record.backdrop_url=backdrop.url;record.backdrop_imagekit_file_id=backdrop.fileId;}
      else if(state.editing?.backdrop_url){record.backdrop_url=state.editing.backdrop_url;record.backdrop_imagekit_file_id=state.editing.backdrop_imagekit_file_id;}
      if(video)record.video_path=video;
      else if(state.editing?.video_path)record.video_path=state.editing.video_path;
      if(state.editing){
        const {error}=await db().from("movies").update(record).eq("id",state.editing.id);
        if(error)throw error;
        msg($("#saveMessage"),"Changes saved successfully.");
      }else{
        record.created_by=state.session.user.id;
        const {error}=await db().from("movies").insert(record);
        if(error)throw error;
        msg($("#saveMessage"),"Content added successfully.");
      }
      await loadCatalogue();resetEditor();
      msg($("#saveMessage"),"Content saved successfully.");
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
      const {error}=await db().from("movies").delete().eq("id",id);if(error)throw error;
      if(paths.length)await db().storage.from("movie-videos").remove(paths);
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


  document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
  function showView(name){
    document.querySelectorAll(".pro-view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name));
    document.querySelectorAll(".pro-nav [data-view]").forEach(v=>v.classList.toggle("active",v.dataset.view===name));
    $("#viewTitle").textContent=({overview:"Overview",movies:"Movies",series:"Series",bulk:"Bulk Upload",categories:"Categories",superadmin:"Super Admin",analytics:"Analytics",settings:"Settings",translators:"Translators",announcements:"Announcements"})[name]||"Overview";
    if(name==="series")renderSeriesCatalogue();
  }
  $("#addMovieButton").addEventListener("click",()=>{resetEditor();$("#contentType").value="movie";updateTypeFields();$("#contentEditorCard").scrollIntoView({behavior:"smooth"});});
  $("#addSeriesButton").addEventListener("click",()=>{resetEditor();$("#contentType").value="series";updateTypeFields();showView("movies");$("#contentEditorCard").scrollIntoView({behavior:"smooth"});});
  $("#addEpisodeButton").addEventListener("click",()=>{if(!state.selectedSeries)return;resetEditor();$("#contentType").value="episode";updateTypeFields();$("#seriesPicker").value=state.selectedSeries.id;showView("movies");$("#contentEditorCard").scrollIntoView({behavior:"smooth"});});
  $("#bulkSeriesEpisodes").addEventListener("click",()=>{if(!state.selectedSeries)return;showView("bulk");$("#bulkType").value="episode";$("#bulkSeriesWrap").hidden=false;$("#bulkSeasonWrap").hidden=false;$("#bulkSeriesPicker").value=state.selectedSeries.id;});
  $("#bulkType").addEventListener("change",()=>{const ep=$("#bulkType").value==="episode";$("#bulkSeriesWrap").hidden=!ep;$("#bulkSeasonWrap").hidden=!ep;});
  $("#bulkUploadForm").addEventListener("submit",bulkUpload);
  $("#seriesCatalogueList").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const id=b.dataset.openSeries||b.dataset.editSeries;if(!id)return;if(b.dataset.openSeries)openSeriesManager(id);else{showView("movies");editContent(id);}});
  $("#seriesEpisodeList").addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;const id=b.dataset.editEpisode||b.dataset.toggleEpisode||b.dataset.deleteEpisode;if(!id)return;if(b.dataset.editEpisode){showView("movies");editContent(id);return;}if(b.dataset.toggleEpisode)await setPublished(id);if(b.dataset.deleteEpisode)await deleteContent(id);openSeriesManager(state.selectedSeries.id);});
  $("#recentMovies").addEventListener("click",e=>{const b=e.target.closest("[data-recent-edit]");if(!b)return;showView("movies");editContent(b.dataset.recentEdit);});
  $("#categoryForm").addEventListener("submit",async e=>{e.preventDefault();const name=$("#categoryName").value.trim(),slug=slugify(name);try{const {error}=await db().from("site_categories").insert({name,slug,description:$("#categoryDescription").value.trim()});if(error)throw error;$("#categoryForm").reset();await loadCategories();msg($("#categoryMessage"),"Category added.");}catch(err){msg($("#categoryMessage"),err.message,true);}});
  $("#categoryList").addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;try{if(b.dataset.categoryToggle){const item=state.categories.find(x=>x.id===b.dataset.categoryToggle);const {error}=await db().from("site_categories").update({is_active:!item.is_active}).eq("id",item.id);if(error)throw error;}if(b.dataset.categoryDelete){if(!confirm("Delete this category?"))return;const {error}=await db().from("site_categories").delete().eq("id",b.dataset.categoryDelete);if(error)throw error;}await loadCategories();}catch(err){msg($("#categoryMessage"),err.message,true);}});

  $("#loginForm").addEventListener("submit",async e=>{
    e.preventDefault();const button=e.submitter;button.disabled=true;msg($("#loginMessage"),"Signing in...");
    try{const {error}=await db().auth.signInWithPassword({email:$("#loginEmail").value.trim(),password:$("#loginPassword").value});if(error)throw error;await requireAdmin();msg($("#loginMessage"),"");}
    catch(error){msg($("#loginMessage"),error.message||"Could not sign in.",true);}
    finally{button.disabled=false;}
  });
  $("#signOutButton").addEventListener("click",async()=>{await db()?.auth.signOut();location.reload();});
  $("#contentForm").addEventListener("submit",saveContent);
  $("#contentType").addEventListener("change",updateTypeFields);
  $("#contentTitle").addEventListener("input",()=>{if(!$("#contentSlug").dataset.edited)$("#contentSlug").value=slugify($("#contentTitle").value);});
  $("#contentSlug").addEventListener("input",()=>$("#contentSlug").dataset.edited="true");
  $("#resetEditor").addEventListener("click",resetEditor);
  $("#refreshCatalogue").addEventListener("click",()=>loadCatalogue().catch(e=>msg($("#catalogueMessage"),e.message,true)));
  $("#catalogueSearch").addEventListener("input",renderCatalogue);$("#catalogueType").addEventListener("change",renderCatalogue);
  $("#catalogueList").addEventListener("click",e=>{
    const b=e.target.closest("button[data-action]");if(!b)return;
    const id=b.dataset.id;
    if(b.dataset.action==="edit")editContent(id);
    if(b.dataset.action==="delete")deleteContent(id);
    if(b.dataset.action==="publish")setPublished(id);
  });
  function imagePreview(input,preview,status){
    input.addEventListener("change",()=>{const file=input.files?.[0];if(!file)return;if(!file.type.startsWith("image/")||file.size>15*1024*1024){msg(status,"Choose an image up to 15 MB.",true);input.value="";return;}preview.src=URL.createObjectURL(file);preview.hidden=false;status.textContent=file.name+" ready to upload.";});
  }
  imagePreview($("#posterFile"),$("#posterPreview"),$("#posterStatus"));
  imagePreview($("#backdropFile"),$("#backdropPreview"),$("#backdropStatus"));

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