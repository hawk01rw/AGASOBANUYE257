const $=s=>document.querySelector(s);
let title=null,allTitles=[];
try{title=JSON.parse(sessionStorage.getItem("agasobanuyeSelectedTitle")||"null")}catch(e){}
const id=new URLSearchParams(location.search).get("id");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function showTitle(m){
  if(!m)return;title=m;document.title=m.title+" — AGASOBANUYE257";
  $("#watchTitle").textContent=m.title;$("#watchDescription").textContent=m.description||"Watch this title on AGASOBANUYE257.";
  $("#watchSynopsis").textContent=m.description||"No synopsis has been added yet.";
  const kind=m.type==="series"?"SERIES":m.type==="episode"?"EPISODE":"MOVIE";
  $("#watchMeta").textContent=kind+" · "+(m.genre||"Entertainment")+" · "+(m.year||"");
  $("#watchBackdrop").style.backgroundImage='url("'+(m.backdrop||m.poster||"")+'")';
  $("#watchChips").innerHTML=["HD EXPERIENCE",m.genre,m.year].filter(Boolean).map(x=>"<span>"+esc(x)+"</span>").join("");
  $("#watchLanguage").textContent="Language: "+(m.language||"Not specified");
  $("#watchDuration").textContent="Duration: "+(m.duration?m.duration+" minutes":"Not specified");
  $("#watchRating").textContent="Rating: "+(m.rating||m.voteAverage||"Not rated");
  $("#movieDownloadButton").hidden=true;$("#movieDownloadButton").removeAttribute("href");
  $("#seriesEpisodesSection").hidden=m.type!=="series";
  if(m.type==="series"){
    $("#watchPlayer").innerHTML='<div class="player-placeholder"><div class="play-large">▣</div><h2>Series library</h2><p>Select an episode below to start watching.</p></div>';
    try{
      const episodes=await window.AgasobanuyeDB.getEpisodes(m.id);
      $("#seriesEpisodes").innerHTML=episodes.length?episodes.map(ep=>'<a class="episode-row" href="watch.html?id='+encodeURIComponent(ep.slug||ep.id)+'"><span class="episode-number">S'+ep.season_number+' · E'+ep.episode_number+'</span><strong>'+esc(ep.episode_title||ep.title)+'</strong><span>Watch →</span></a>').join(""):'<p class="admin-hint">No published episodes yet.</p>';
    }catch(e){$("#seriesEpisodes").textContent="Episodes could not be loaded.";}
    return;
  }
  if(m.downloadUrl){
    $("#movieDownloadButton").href=m.downloadUrl;
    $("#movieDownloadButton").hidden=false;
    $("#movieDownloadButton").target="_blank";
    $("#movieDownloadButton").rel="noopener noreferrer";
  }
  if(m.videoPath&&window.AgasobanuyeDB?.configured){
    try{
      const [playUrl,downloadUrl]=await Promise.all([window.AgasobanuyeDB.getVideoUrl(m.videoPath),window.AgasobanuyeDB.getVideoUrl(m.videoPath,true)]);
      const v=document.createElement("video");v.controls=true;v.playsInline=true;v.preload="metadata";v.src=playUrl;
      $("#watchPlayer").replaceChildren(v);
      if(!m.downloadUrl){$("#movieDownloadButton").href=downloadUrl;$("#movieDownloadButton").hidden=false;}
      $("#movieDownloadButton").setAttribute("download","");
    }catch(e){$("#playerMessage").textContent="Video is not available right now";}
  }else if(m.trailerUrl){
    const p=document.createElement("p");p.textContent="A trailer is available, but full movie playback requires an authorized video file.";
    const placeholder=$("#watchPlayer").querySelector(".player-placeholder");if(placeholder)placeholder.appendChild(p);
  }
}
function renderRelated(){
  const related=allTitles.filter(x=>x.type!=="episode"&&String(x.id)!==String(title?.id)).slice(0,8);
  $("#relatedRow").innerHTML=related.map(m=>'<article class="poster-card" data-id="'+esc(m.id)+'"><div class="poster-image"><img src="'+esc(m.poster||"assets/agasobanuye257-logo.svg")+'" alt="" loading="lazy"></div><div class="poster-info"><h3>'+esc(m.title)+'</h3><div class="poster-meta"><span>'+esc(m.genre)+'</span><span>'+esc(m.year)+'</span></div></div></article>').join("");
  $("#relatedRow").onclick=e=>{const c=e.target.closest("[data-id]");if(!c)return;const m=allTitles.find(x=>String(x.id)===c.dataset.id);if(m){sessionStorage.setItem("agasobanuyeSelectedTitle",JSON.stringify(m));location.href="watch.html?id="+encodeURIComponent(m.slug||m.id)}};
}
showTitle(title);
if(window.AgasobanuyeDB?.configured){
  window.AgasobanuyeDB.getMovies().then(rows=>{
    allTitles=rows||[];const found=allTitles.find(m=>String(m.id)===id||String(m.slug)===id);
    if(found)showTitle(found);else if(!title)$("#watchTitle").textContent="Title not found";
    renderRelated();
  }).catch(()=>{allTitles=title?[title]:[];renderRelated()});
}else{allTitles=title?[title]:[];renderRelated()}
$("#watchlistButton").onclick=async()=>{
  if(!window.AgasobanuyeDB?.configured||!title?.id){alert("Sign in and connect your account to save titles.");return}
  try{await window.AgasobanuyeDB.toggleWatchlist(title.id,false);$("#watchlistButton").textContent="✓ Saved"}
  catch(e){alert(e.message||"Please sign in to save titles.")}
};