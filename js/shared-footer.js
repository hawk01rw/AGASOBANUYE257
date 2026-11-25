/* One identical footer across all public AGASOBANUYE257 pages. */
(()=>{"use strict";
const init=()=>{
const footer=document.querySelector(".agas-footer");if(!footer)return;
footer.innerHTML=`
<div class="agas-footer-inner">
 <div class="agas-footer-main">
  <a class="agas-footer-brand" href="index.html" aria-label="AGASOBANUYE257 home"><img src="assets/agasobanuye257-logo.svg" alt=""><span><b>AGASOBANUYE<span>257</span></b><small>YOUR ENTERTAINMENT DESTINATION</small></span></a>
  <p class="agas-footer-intro">Your place to discover movies and series. Find your next story and enjoy the experience.</p>
  <details class="agas-footer-social-menu"><summary class="agas-footer-social-trigger" aria-label="Show social media links" title="Social media"><i data-lucide="share-2"></i></summary>
   <div class="agas-footer-social" aria-label="Follow AGASOBANUYE257">
    <a href="https://youtube.com/@daprophetstudio?si=_BvuSHQaYdnn_khO" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i data-lucide="youtube"></i><span>YouTube</span></a>
    <a href="https://www.facebook.com/share/1ADoiuvgGy/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i data-lucide="facebook"></i><span>Facebook</span></a>
    <a href="https://www.instagram.com/daprophet_official?knvt=MWpydzN4azB2dmxnOQ==" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i data-lucide="instagram"></i><span>Instagram</span></a>
    <a href="https://vm.tiktok.com/ZS9PQv8o3XTSj-JbFlj/" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><i data-lucide="music-2"></i><span>TikTok</span></a>
   </div>
  </details>
 </div>
 <div class="agas-footer-column"><h2>Explore</h2><a href="index.html">Home</a><a href="movies.html">Movies</a><a href="series.html">Series</a><a href="favorite.html">My Favorites</a></div>
 <div class="agas-footer-column"><h2>Membership</h2><a href="vip.html">VIP Experience</a><a href="watch.html">Start Watching</a></div>
 <div class="agas-footer-note"><span class="agas-footer-spark"><i data-lucide="sparkles"></i></span><h2>Every story starts here.</h2><p>Find something worth watching today.</p><a href="movies.html">Explore the collection <i data-lucide="arrow-right"></i></a></div>
</div>
<div class="agas-footer-bottom"><span>© <span data-footer-year>${new Date().getFullYear()}</span> AGASOBANUYE257. All rights reserved.</span><span class="agas-footer-credit">MADE FOR MOVIE LOVERS ✦</span></div>`;
if(window.lucide?.createIcons)window.lucide.createIcons();
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();