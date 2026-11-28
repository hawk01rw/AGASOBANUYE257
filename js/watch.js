"use strict";
const $=s=>document.querySelector(s);
let title=null,allTitles=[],commentsChannel=null,commentsChannelKey="",authMode="signin";
try{title=JSON.parse(sessionStorage.getItem("agasobanuyeSelectedTitle")||"null")}catch(e){}
const id=new URLSearchParams(location.search).get("id");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function imageKitAsset(value,transform="w-420,h-630,fo-auto,q-82"){try{const u=new URL(value,location.href);if(u.protocol!=="https:"||!(u.hostname==="ik.imagekit.io"||u.hostname.endsWith(".imagekit.io")))return"";if(!u.searchParams.has("tr"))u.searchParams.set("tr",transform);return u.href;}catch(_){return"";}}
function customPlayerUrl(value){
 try{
  const u=new URL(String(value||""),location.href);
  if(!["https:","http:"].includes(u.protocol))return "";
  const host=u.hostname.toLowerCase();
  if(host==="youtu.be"){const key=u.pathname.split("/").filter(Boolean)[0];return key?"https://www.youtube-nocookie.com/embed/"+encodeURIComponent(key):u.href;}
  if(["youtube.com","www.youtube.com","m.youtube.com"].includes(host)){
   const key=u.searchParams.get("v")||u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
   return key?"https://www.youtube-nocookie.com/embed/"+encodeURIComponent(key):u.href;
  }
  if(["vimeo.com","www.vimeo.com"].includes(host)){const key=u.pathname.split("/").filter(Boolean).pop();return key&&/^\d+$/.test(key)?"https://player.vimeo.com/video/"+key:u.href;}
  return u.href;
 }catch(_){return "";}
}
function mountCustomPlayer(value){
 const url=customPlayerUrl(value);if(!url)return false;
 const host=$("#watchPlayer");
 if(/\.(mp4|webm|ogg|m3u8)(?:$|[?#])/i.test(url)){
  const video=document.createElement("video");video.controls=true;video.playsInline=true;video.preload="metadata";video.src=url;host.replaceChildren(video);
 }else{
  const frame=document.createElement("iframe");frame.src=url;frame.title="Video player";frame.allow="autoplay; encrypted-media; picture-in-picture; fullscreen";frame.allowFullscreen=true;frame.loading="eager";frame.referrerPolicy="strict-origin-when-cross-origin";host.replaceChildren(frame);
 }
 return true;
}

const dateLabel=v=>{try{return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(v))}catch(_){return""}};
function commentTarget(m){return m.type==="episode"&&m.episodeTableId?{episodeId:m.episodeTableId}:{movieId:m.id};}
function renderComment(c,session){const own=session?.user?.id===c.user_id;return '<article class="comment-card"><div class="comment-avatar">'+esc((c.author_name||"M").slice(0,1).toUpperCase())+'</div><div class="comment-content"><div class="comment-byline"><strong>'+esc(c.author_name||"Member")+'</strong><time>'+esc(dateLabel(c.created_at))+'</time>'+(own?'<button class="comment-delete" data-delete-comment="'+esc(c.id)+'" type="button" aria-label="Delete your comment">Delete</button>':"")+'</div><p>'+esc(c.body)+'</p></div></article>'}
async function loadComments(){
 const list=$("#commentsList"),status=$("#commentsStatus");
 if(!window.AgasobanuyeDB?.configured||!title?.id){status.textContent="Comments are temporarily unavailable.";return}
 try{
  const rows=await window.AgasobanuyeDB.getComments(commentTarget(title));
  const session=await window.AgasobanuyeDB.getSession();
  $("#commentsCount").textContent=rows.length+" comments";
  list.innerHTML=rows.length?rows.map(c=>renderComment(c,session)).join(""):'<div class="comments-empty">No comments yet. Be the first to comment.</div>';
  status.textContent="Join the discussion — no account required.";
  const target=commentTarget(title),channelKey=(target.episodeId?"episode_id":"movie_id")+"-"+(target.episodeId||target.movieId);
  if(commentsChannelKey!==channelKey){
   if(commentsChannel)window.AgasobanuyeDB.client.removeChannel(commentsChannel);
   const column=target.episodeId?"episode_id":"movie_id",value=target.episodeId||target.movieId;
   commentsChannelKey=channelKey;
   commentsChannel=window.AgasobanuyeDB.client.channel("comments-"+String(value)).on("postgres_changes",{event:"*",schema:"public",table:"comments",filter:column+"=eq."+value},()=>loadComments()).subscribe();
  }
 }catch(e){status.textContent="Could not load comments. "+(e.message||"Please try again.");}
}
function renderSeriesEpisodeStrip(episodes,currentEpisode){
 const strip=$("#seriesEpisodeStrip"),tabs=$("#seriesEpisodeTabs"),next=$("#seriesNextEpisode");
 if(!strip||!tabs)return;
 const ordered=[...(episodes||[])].sort((a,b)=>(Number(a.season_number||1)-Number(b.season_number||1))||(Number(a.episode_number||0)-Number(b.episode_number||0)));
 if(!ordered.length){strip.hidden=true;return;}
 const currentIndex=ordered.findIndex(ep=>String(ep.id)===String(currentEpisode?.id));
 document.body.classList.add("is-series-episode-watch");
 strip.hidden=false;
 tabs.innerHTML=ordered.map((ep,index)=>{
  const number=Number(ep.episode_number||index+1),active=index===currentIndex;
  return '<a class="series-episode-tab '+(active?'active':'')+'" href="watch.html?id='+encodeURIComponent(ep.id)+'" '+(active?'aria-current="page"':'')+'>EP'+number+'</a>';
 }).join("");
 const upcoming=ordered[currentIndex>=0?currentIndex+1:0];
 if(upcoming){next.hidden=false;next.textContent=currentIndex<0?"Play first episode ›":"Next episode ›";next.onclick=()=>location.href="watch.html?id="+encodeURIComponent(upcoming.id);}
 else{next.hidden=true;next.onclick=null;}
}
function renderEpisodeRows(episodes){
 const host=$("#seriesEpisodes");
 if(!episodes.length){host.innerHTML='<div class="episode-empty"><strong>No episodes published yet</strong><span>Published episodes for this series will appear here.</span></div>';return;}
 const seasons=[...new Set(episodes.map(ep=>Number(ep.season_number||1)))];
 host.innerHTML=seasons.map(season=>{
  const items=episodes.filter(ep=>Number(ep.season_number||1)===season);
  return '<section class="episode-season"><div class="episode-season-heading"><span>SEASON '+season+'</span><small>'+items.length+' '+(items.length===1?'EPISODE':'EPISODES')+'</small></div><div class="episode-season-list">'+items.map(ep=>{
   const number=String(Number(ep.episode_number||0)).padStart(2,'0');
   const name=ep.episode_title||ep.title||('Episode '+number);
   const ready=!!(ep.watchUrl||ep.videoPath);
   return '<article class="episode-row"><div class="episode-thumb">'+(imageKitAsset(ep.poster)?'<img src="'+esc(imageKitAsset(ep.poster,"w-180,h-180,fo-auto,q-78"))+'" alt="" loading="lazy" decoding="async">':'<span>▶</span>')+'</div><div class="episode-info"><span class="episode-number">EPISODE '+number+'</span><strong>'+esc(name)+'</strong><small>'+esc(ep.description||'')+'</small><em class="episode-status '+(ready?'is-ready':'is-pending')+'">'+(ready?'READY TO WATCH':'VIDEO NOT UPLOADED')+'</em></div><div class="episode-actions">'+(ready?'<a class="episode-watch" href="watch.html?id='+encodeURIComponent(ep.id)+'">▶ Watch</a>':'<span class="episode-unavailable">Coming soon</span>')+(ep.downloadUrl?'<a class="episode-download" href="'+esc(ep.downloadUrl)+'" target="_blank" rel="noopener noreferrer">↓ Download</a>':ep.videoPath?'<button class="episode-download" data-episode-download="'+esc(ep.videoPath)+'" type="button">↓ Download</button>':'')+'</div></article>';
  }).join('')+'</div></section>';
 }).join('');
}
async function loadSeriesEpisodes(seriesId){
 const host=$("#seriesEpisodes");
 host.innerHTML='<div class="episode-empty"><span class="episode-loading-dot"></span><strong>Loading episodes</strong><span>Getting the latest episodes for this series…</span></div>';
 try{const episodes=await window.AgasobanuyeDB.getEpisodes(seriesId);renderEpisodeRows(episodes);return episodes;}
 catch(error){host.innerHTML='<div class="episode-empty"><strong>Episodes could not be loaded</strong><span>'+esc(error.message||'Please try again.')+'</span><button type="button" class="episode-retry" id="retryEpisodes">Try again</button></div>';const retry=$("#retryEpisodes");if(retry)retry.onclick=()=>loadSeriesEpisodes(seriesId);return [];}
}
function renderTmdbCredits(meta){
 const host=$("#tmdbCredits");if(!host)return;
 const cast=Array.isArray(meta.cast)?meta.cast:[],crew=Array.isArray(meta.crew)?meta.crew:[];
 const directors=crew.filter(x=>x.job==="Director"),writers=crew.filter(x=>["Writer","Screenplay","Story","Teleplay"].includes(x.job));
 const names=arr=>arr.map(x=>x.name).filter(Boolean).join(", ");
 const parts=[];
 if(cast.length)parts.push("<div class=\"tmdb-credit-group\"><h3>Top cast</h3><div class=\"tmdb-cast-grid\">"+cast.slice(0,12).map(p=>"<article class=\"tmdb-cast-card\"><strong>"+esc(p.name)+"</strong><span>"+esc(p.character||"Cast")+"</span></article>").join("")+"</div></div>");
 if(directors.length||writers.length)parts.push("<div class=\"tmdb-credit-line\">"+(directors.length?"<p><b>Director</b> "+esc(names(directors))+"</p>":"")+(writers.length?"<p><b>Writers</b> "+esc(names(writers))+"</p>":"")+"</div>");
 if(meta.production_companies?.length)parts.push("<p class=\"tmdb-production\"><b>Production</b> "+esc(meta.production_companies.join(", "))+"</p>");
 host.innerHTML=parts.join("");host.hidden=!parts.length;
 const section=$("#tmdbCreditsSection");if(section)section.hidden=!parts.length;
}

function updateWatchSeo(movie){
 const clean=String(movie.description||"Watch "+movie.title+" on AGASOBANUYE257.").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,300);
 const canonical=location.origin+location.pathname+location.search;
 document.title=movie.title+" — Watch on AGASOBANUYE257";
 const set=(kind,key,value)=>{let el=document.head.querySelector('meta['+kind+'="'+key+'"]');if(!el){el=document.createElement("meta");el.setAttribute(kind,key);document.head.appendChild(el);}el.setAttribute("content",value);};
 set("name","description",clean);set("property","og:title",document.title);set("property","og:description",clean);set("property","og:url",canonical);set("name","twitter:title",document.title);set("name","twitter:description",clean);
 const link=document.querySelector('link[rel="canonical"]');if(link)link.href=canonical;
}

async function showTitle(m){
 if(!m)return;title=m;updateWatchSeo(m);
 $("#watchTitle").textContent=m.title;const crumb=$("#watchBreadcrumbTitle");if(crumb)crumb.textContent=m.title;$("#watchDescription").textContent=m.description||"Watch this title on AGASOBANUYE257.";
 $("#watchSynopsis").textContent=m.description||"No synopsis has been added yet.";
 const kind=m.type==="series"?"SERIES":m.type==="episode"?"EPISODE":"MOVIE";
 $("#watchMeta").textContent=kind+" · "+(m.genre||"Entertainment")+" · "+(m.year||"");
 const backdrop=imageKitAsset(m.backdrop||m.poster,"w-1600,h-900,fo-auto,q-78");
  $("#watchBackdrop").style.backgroundImage=backdrop?'url("'+backdrop.replace(/["\\]/g,"")+'")':"none";
 $("#watchChips").innerHTML=[m.quality,m.genre,m.year,m.country,m.releaseDate?new Date(m.releaseDate+"T00:00:00").toLocaleDateString(): ""].filter(Boolean).map(x=>"<span>"+esc(x)+"</span>").join("");
 $("#watchLanguage").textContent="Language: "+(m.language||"Not specified");
 $("#watchDuration").textContent="Duration: "+(m.duration?m.duration+" minutes":"Not specified");
 const country=$("#watchCountry"),translator=$("#watchTranslator");if(country)country.textContent="Country: "+(m.country||"Not specified");if(translator)translator.textContent="Translator: "+(m.translator||"Not specified");
 const tmdb= m.tmdbMetadata||{};
 const score=Number(m.voteAverage||m.rating||0);
 $("#watchRating").textContent=score>0?"TMDB Rating: ★ "+score.toFixed(1)+"/10 · "+Number(m.voteCount||0).toLocaleString()+" votes":"TMDB Rating: Not rated";
 renderTmdbCredits(tmdb);
 const dl=$("#movieDownloadButton");dl.hidden=true;dl.removeAttribute("href");dl.removeAttribute("download");
 const downloadsSection=$("#movieDownloadsSection"),downloadsList=$("#movieDownloadsList");
 if(downloadsSection&&downloadsList){downloadsSection.hidden=true;downloadsList.replaceChildren();if(m.type==="movie"&&window.AgasobanuyeDB?.configured){try{const links=await window.AgasobanuyeDB.getMovieDownloadLinks(m.id);const safe=links.filter(item=>{try{return ["https:","http:"].includes(new URL(item.url).protocol)}catch(_){return false}});if(safe.length){downloadsList.innerHTML=safe.map(item=>'<a class="movie-download-option" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer"><span>↓</span><strong>'+esc(item.label||"Download")+'</strong></a>').join("");downloadsSection.hidden=false;}}catch(error){console.warn("Additional downloads unavailable:",error);}}}
 $("#seriesEpisodesSection").hidden=m.type!=="series";
 $("#commentsSection").hidden=false;
 if(m.type==="series"){
  document.body.classList.add("is-series-episode-watch");
  $("#watchPlayer").innerHTML='<div class="player-placeholder"><div class="play-large">▣</div><h2>Choose an episode</h2><p>Select an episode below to start watching.</p></div>';
  const episodes=await loadSeriesEpisodes(m.id);
  renderSeriesEpisodeStrip(episodes,{id:""});
  await loadComments();return;
 }
 if(m.downloadUrl){dl.href=m.downloadUrl;dl.hidden=false;dl.target="_blank";dl.rel="noopener noreferrer"}
 let movieParts=[];
 if(m.type==="movie"&&window.AgasobanuyeDB?.configured){try{movieParts=await window.AgasobanuyeDB.getMovieParts(m.id)}catch(error){console.warn("Movie parts could not be loaded:",error)}}
 const partsSection=$("#moviePartsSection"),partsList=$("#moviePartsList");
 if(partsSection)partsSection.hidden=!movieParts.length;
 if(partsList)partsList.innerHTML=movieParts.map((part,index)=>'<button type="button" class="movie-part-button '+(index===0?'active':'')+'" data-movie-part="'+index+'"><span>'+esc(part.part_label)+'</span><small>'+(index===0?'Now playing':'Play part')+'</small></button>').join("");
 if(movieParts.length){
  const playPart=async index=>{
   const part=movieParts[index];if(!part)return;
   partsList.querySelectorAll(".movie-part-button").forEach((button,i)=>{button.classList.toggle("active",i===index);button.querySelector("small").textContent=i===index?"Now playing":"Play part"});
   try{
    if(part.watch_url){if(!mountCustomPlayer(part.watch_url))throw new Error("This part has an invalid watch URL.");const activeVideo=$("#watchPlayer video");if(activeVideo)activeVideo.addEventListener("ended",()=>{if(index+1<movieParts.length)playPart(index+1)});}
    else if(part.video_path){const playUrl=await window.AgasobanuyeDB.getVideoUrl(part.video_path);const v=document.createElement("video");v.controls=true;v.playsInline=true;v.preload="metadata";v.src=playUrl;v.addEventListener("ended",()=>{if(index+1<movieParts.length)playPart(index+1)});$("#watchPlayer").replaceChildren(v);}
    else throw new Error("No watch URL or uploaded video is available for this part.");
    let downloadUrl=part.download_url||m.downloadUrl||"";if(!downloadUrl&&part.video_path)downloadUrl=await window.AgasobanuyeDB.getVideoUrl(part.video_path,true);
    if(downloadUrl){dl.href=downloadUrl;dl.hidden=false;dl.textContent="↓ Download "+part.part_label;dl.target="_blank";dl.rel="noopener noreferrer";}else{dl.hidden=true;dl.removeAttribute("href");}
   }
   catch(error){const p=$("#watchPlayer .player-placeholder");if(p){p.querySelector("h2").textContent="This part is not available";p.querySelector("p").textContent=error.message||"Please try again."}else{const note=document.createElement("p");note.className="player-error-note";note.textContent=error.message||"Please try again.";$("#watchPlayer").append(note);}}
  };
  partsList.onclick=e=>{const button=e.target.closest("[data-movie-part]");if(button)playPart(Number(button.dataset.moviePart))};
  await playPart(0);
 }else if(m.watchUrl&&mountCustomPlayer(m.watchUrl)){await loadComments();return;
 }else if(m.videoPath&&window.AgasobanuyeDB?.configured){
  try{const [playUrl,downloadUrl]=await Promise.all([window.AgasobanuyeDB.getVideoUrl(m.videoPath),window.AgasobanuyeDB.getVideoUrl(m.videoPath,true)]);const v=document.createElement("video");v.controls=true;v.playsInline=true;v.preload="metadata";v.src=playUrl;$("#watchPlayer").replaceChildren(v);if(!m.downloadUrl){dl.href=downloadUrl;dl.hidden=false;dl.setAttribute("download","")}}
  catch(e){const p=$("#watchPlayer .player-placeholder");if(p){p.querySelector("h2").textContent="Video is not available right now";p.querySelector("p").textContent=e.message||"Please contact support."}}
 }else if(m.trailerUrl){const p=document.createElement("p");p.textContent="A trailer is available, but full playback requires an authorized video file.";const placeholder=$("#watchPlayer").querySelector(".player-placeholder");if(placeholder)placeholder.appendChild(p)}
 await loadComments();
}
function renderRelated(){
 const current=String(title?.id||"");
 const categories=String(title?.genre||"").split(/[,/&|]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
 let related=allTitles.filter(x=>x.type!=="episode"&&x.type!=="series"&&String(x.id)!==current);
 if(categories.length){const matched=related.filter(x=>String(x.genre||"").split(/[,/&|]/).some(g=>categories.some(c=>g.trim().toLowerCase()===c||g.trim().toLowerCase().includes(c))));related=[...matched,...related.filter(x=>!matched.includes(x))]}
 related=related.slice(0,8);
 const host=$("#relatedRow");
 if(!host)return;
 host.innerHTML=related.map(m=>'<article class="watch-recommendation-card" data-id="'+esc(m.id)+'" tabindex="0" role="button" aria-label="Watch '+esc(m.title)+'"><div class="watch-recommendation-poster"><img src="'+esc(imageKitAsset(m.poster)||"assets/agasobanuye257-logo.svg")+'" alt="" loading="lazy" decoding="async"><span class="watch-recommendation-genre">'+esc((m.genre||"Movie").split(/[,/&|]/)[0])+'</span><span class="watch-recommendation-year">'+esc(m.year||"")+'</span>'+(Number(m.partsCount||0)>1?'<span class="watch-recommendation-parts">'+Number(m.partsCount)+' parts</span>':'')+'</div><div class="watch-recommendation-info"><strong>'+esc(m.title)+'</strong><small>'+esc(m.language||"AGASOBANUYE257")+'</small></div></article>').join("")||'<p class="comments-empty">More titles will appear here as the catalogue grows.</p>';
 const openCard=c=>{if(!c)return;const m=allTitles.find(x=>String(x.id)===c.dataset.id);if(m){sessionStorage.setItem("agasobanuyeSelectedTitle",JSON.stringify(m));location.href="watch.html?id="+encodeURIComponent(m.slug||m.id)}};
 host.onclick=e=>openCard(e.target.closest("[data-id]"));
 host.onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-id]")){e.preventDefault();openCard(e.target)}};
}
$("#commentForm").addEventListener("submit",async e=>{e.preventDefault();const input=$("#commentInput"),name=$("#commentName"),button=e.currentTarget.querySelector("button[type=submit]"),message=$("#commentMessage"),body=input.value.trim(),author=name.value.trim();if(!body||!author)return;button.disabled=true;message.textContent="Posting…";try{await window.AgasobanuyeDB.addComment(commentTarget(title),author,body);input.value="";message.textContent="Your comment has been posted.";await loadComments()}catch(err){message.textContent=err.message||"Could not post your comment."}finally{button.disabled=false}});
$("#commentsList").addEventListener("click",async e=>{const b=e.target.closest("[data-delete-comment]");if(!b)return;if(!confirm("Delete your comment?"))return;try{await window.AgasobanuyeDB.removeComment(b.dataset.deleteComment);await loadComments()}catch(err){alert(err.message)}});
$("#seriesEpisodes").addEventListener("click",async e=>{const b=e.target.closest("[data-episode-download]");if(!b)return;const old=b.textContent;b.disabled=true;b.textContent="Preparing…";try{const url=await window.AgasobanuyeDB.getVideoUrl(b.dataset.episodeDownload,true);const a=document.createElement("a");a.href=url;a.download="";a.rel="noopener";document.body.appendChild(a);a.click();a.remove()}catch(err){alert(err.message||"Download unavailable")}finally{b.disabled=false;b.textContent=old}});
$("#watchNowButton").onclick=()=>{$("#watchPlayer").scrollIntoView({behavior:"smooth",block:"center"});const media=$("#watchPlayer video, #watchPlayer iframe");if(media)media.focus?.()};
$("#watchlistButton").onclick=async()=>{if(!window.AgasobanuyeDB?.configured||!title?.id){alert("Sign in and connect your account to save titles.");return}try{await window.AgasobanuyeDB.toggleWatchlist(title.id,false);$("#watchlistButton").textContent="✓ Saved"}catch(e){alert(e.message||"Please sign in to save titles.")}};
async function init(){
 if(!window.AgasobanuyeDB?.configured){if(title)await showTitle(title);return}
 try{
  const rows=await window.AgasobanuyeDB.getMovies();allTitles=rows||[];
  let found=allTitles.find(m=>String(m.id)===id||String(m.slug)===id);
  if(!found&&id)found=await window.AgasobanuyeDB.getTitleById(id);
  if(found){await showTitle(found);if(found.type==="episode"&&found.seriesId){const parent=allTitles.find(x=>String(x.id)===found.seriesId);if(parent){$("#seriesEpisodesSection").hidden=false;const episodes=await loadSeriesEpisodes(parent.id);renderSeriesEpisodeStrip(episodes,found);}}}
  else if(title&&String(title.id)===id)await showTitle(title);else $("#watchTitle").textContent="Title not found";
  renderRelated();
 }catch(e){console.error("Watch page:",e);if(title)await showTitle(title);else $("#watchTitle").textContent="Unable to load this title"}
}
init();
