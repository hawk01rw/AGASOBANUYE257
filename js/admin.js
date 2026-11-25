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
  const state = { catalogue: [], editing: null, session: null };
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
    $("#loginPanel").hidden=true;$("#studioPanel").hidden=false;$("#signOutButton").hidden=false;
    if((session.user.email||"").toLowerCase()===ownerEmail){$("#adminManagementPanel").hidden=false;await loadAdmins();}
    await loadCatalogue();
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
    await populateSeries();renderCatalogue();msg($("#catalogueMessage"),"");
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
  $("#year").textContent=new Date().getFullYear();updateTypeFields();
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