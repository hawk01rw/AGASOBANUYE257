(()=>{"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cleanURL=value=>{try{const u=new URL(value,location.href);if(u.protocol!=="https:"||!(u.hostname==="ik.imagekit.io"||u.hostname.endsWith(".imagekit.io")))return"";if(!u.searchParams.has("tr"))u.searchParams.set("tr","w-84,h-112,fo-auto,q-75");return u.href}catch(_){return""}};
const init=()=>{
 const inputs=[...document.querySelectorAll("[data-site-search],#searchInput,#catalogSearch")];
 if(!inputs.length)return;
 let titles=[],loaded=false,loading=false;
 const db=window.AgasobanuyeDB;
 const load=()=>{if(loaded||loading)return;loading=true;if(!db?.configured){loaded=true;loading=false;return}db.getMovies().then(rows=>{titles=Array.isArray(rows)?rows:[];loaded=true;loading=false;inputs.forEach(x=>x.dispatchEvent(new Event("input")));}).catch(()=>{loaded=true;loading=false;});};
 load();
 const searchable=m=>[m.title,m.genre,m.description,m.year,m.language,m.type].join(" ").toLowerCase();
 const rank=(m,q)=>{const t=String(m.title||"").toLowerCase(),g=String(m.genre||"").toLowerCase(),hay=searchable(m),parts=q.split(/\s+/).filter(Boolean);if(!parts.every(p=>hay.includes(p)))return -1;let n=0;if(t===q)n+=120;else if(t.startsWith(q))n+=75;else if(t.includes(q))n+=55;parts.forEach(p=>{if(t.split(/\s+/).some(w=>w.startsWith(p)))n+=18;if(g.includes(p))n+=7});if(m.featured)n+=2;return n;};
 inputs.forEach(input=>{
  const host=input.closest(".cineva-search,.member-search")||input.parentElement;
  if(!host)return;
  host.classList.add("site-search-host");
  input.setAttribute("autocomplete","off");input.setAttribute("aria-autocomplete","list");
  const panel=document.createElement("div");panel.className="site-search-results";panel.hidden=true;panel.setAttribute("role","listbox");panel.id="siteSearch-"+Math.random().toString(36).slice(2,9);input.setAttribute("aria-controls",panel.id);host.appendChild(panel);
  let active=-1,last=[];
  const close=()=>{panel.hidden=true;active=-1;input.removeAttribute("aria-activedescendant");};
  const choose=i=>{const row=last[i];if(!row)return;location.href="watch.html?id="+encodeURIComponent(row.slug||row.id);};
  const paint=()=>{
   const q=input.value.trim().toLowerCase();active=-1;
   if(q.length<2){close();return}
   if(!loaded){panel.innerHTML='<div class="site-search-state"><span class="site-search-spinner"></span>Searching the library…</div>';panel.hidden=false;return}
   last=titles.map(m=>({m,score:rank(m,q)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score||String(a.m.title).localeCompare(String(b.m.title))).slice(0,8).map(x=>x.m);
   if(!last.length){panel.innerHTML='<div class="site-search-state"><strong>No titles found</strong><span>Try another title, genre, year or language.</span></div>';panel.hidden=false;return}
   panel.innerHTML='<div class="site-search-heading">SEARCH RESULTS <span>'+last.length+(last.length===8?"+":"")+'</span></div>'+last.map((m,i)=>{const poster=cleanURL(m.poster);const art=poster?'<img src="'+esc(poster)+'" alt="" loading="lazy">':'<span class="site-search-art"><i data-lucide="clapperboard"></i></span>';const kind=m.type==="series"?"Series":"Movie";const meta=[kind,m.genre,m.year].filter(Boolean).map(esc).join(" · ");return '<a class="site-search-result" role="option" aria-selected="false" data-search-index="'+i+'" href="watch.html?id='+encodeURIComponent(m.slug||m.id)+'">'+art+'<span class="site-search-copy"><strong>'+esc(m.title||"Untitled")+'</strong><small>'+meta+'</small></span><b aria-hidden="true">↗</b></a>';}).join("");
   panel.hidden=false;
  };
  const setActive=i=>{const nodes=[...panel.querySelectorAll("[data-search-index]")];if(!nodes.length)return;active=(i+nodes.length)%nodes.length;nodes.forEach((n,k)=>{n.setAttribute("aria-selected",String(k===active));n.classList.toggle("is-active",k===active)});input.setAttribute("aria-activedescendant",nodes[active].id||(nodes[active].id="siteSearchOption-"+active));nodes[active].scrollIntoView({block:"nearest"});};
  let timer;
  input.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(paint,70)});
  input.addEventListener("focus",()=>{load();if(input.value.trim().length>=2)paint()});
  input.addEventListener("keydown",e=>{if(e.key==="Escape"){close();return}if(e.key==="ArrowDown"&&!panel.hidden){e.preventDefault();setActive(active+1)}if(e.key==="ArrowUp"&&!panel.hidden){e.preventDefault();setActive(active<0?last.length-1:active-1)}if(e.key==="Enter"&&!panel.hidden&&last.length){e.preventDefault();choose(active<0?0:active)}});
  panel.addEventListener("click",e=>{const row=e.target.closest("[data-search-index]");if(row){e.preventDefault();choose(Number(row.dataset.searchIndex))}});
  document.addEventListener("click",e=>{if(!host.contains(e.target))close()});
 });
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();