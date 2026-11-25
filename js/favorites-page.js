(() => {
 const $=s=>document.querySelector(s), key="agasobanuye257-favorites";
 let saved=new Set(); let all=[];
 try{saved=new Set(JSON.parse(localStorage.getItem(key)||"[]").map(String));}catch(_){}
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function image(v){try{const u=new URL(v);return u.protocol==="https:"&&(u.hostname==="ik.imagekit.io"||u.hostname.endsWith(".imagekit.io"))?u.href:"";}catch(_){return "";}}
 function draw(){
  const rows=all.filter(m=>saved.has(String(m.id)));
  $("#savedCount").textContent=rows.length+" saved";
  $("#favoriteGrid").innerHTML=rows.length?rows.map(m=>{
   const poster=image(m.poster),title=esc(m.title||"Untitled");
   return '<article class="member-card"><button class="member-poster" data-watch="'+esc(m.slug||m.id)+'" aria-label="Watch '+title+'">'+(poster?'<img src="'+esc(poster)+'" alt="'+title+' poster" loading="lazy">':'<span class="member-placeholder">AGASOBANUYE 257</span>')+'</button><div class="member-card-info"><h2>'+title+'</h2><p>'+esc(m.genre||"")+' · '+esc(m.year||"")+'</p><div><button class="member-watch" data-watch="'+esc(m.slug||m.id)+'">▶ Watch</button><button class="member-remove" data-remove="'+esc(m.id)+'">Remove ♥</button></div></div></article>';
  }).join(""):'<div class="member-empty"><div>♡</div><h2>No favorites yet</h2><p>Browse the catalogue and tap the heart on a title to save it here.</p><a class="premium-button" href="index.html#movies">Explore movies</a></div>';
 }
 document.addEventListener("click",e=>{
  const watch=e.target.closest("[data-watch]");if(watch){location.href="watch.html?id="+encodeURIComponent(watch.dataset.watch);return;}
  const remove=e.target.closest("[data-remove]");if(remove){
   const id=remove.dataset.remove;saved.delete(String(id));try{localStorage.setItem(key,JSON.stringify([...saved]));}catch(_){}
   if(window.AgasobanuyeDB?.configured)window.AgasobanuyeDB.toggleWatchlist(id,true).catch(()=>{});
   draw();
  }
 });
 const menu=$("#menuButton");if(menu)menu.onclick=()=>{const nav=document.querySelector(".member-header .top-links");const open=nav.classList.toggle("menu-open");menu.setAttribute("aria-expanded",String(open));};
 async function load(){
  if(!window.AgasobanuyeDB?.configured){draw();$("#favoriteMessage").textContent="Your browser-saved favorites are shown here.";return;}
  try{
   all=await window.AgasobanuyeDB.getMovies()||[];
   const session=await window.AgasobanuyeDB.getSession();
   if(session){const ids=await window.AgasobanuyeDB.getWatchlist();saved=new Set([...saved,...ids.map(String)]);try{localStorage.setItem(key,JSON.stringify([...saved]));}catch(_){}}
   draw();
  }catch(err){draw();$("#favoriteMessage").textContent="Some account-saved titles could not be loaded. "+(err.message||"");}
 }
 load();
})();