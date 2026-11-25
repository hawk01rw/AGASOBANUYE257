// Legacy homepage hash links now open their dedicated pages.
const legacyPages = {"#movies":"movies.html","#series":"series.html","#favorite":"favorite.html","#vip":"vip.html"};
if (location.pathname.endsWith("/") && legacyPages[location.hash]) location.replace(legacyPages[location.hash]);
// AGASOBANUYE257 homepage catalogue
// Demo entries are text-only until real titles and ImageKit artwork are added.
let movies = [];
let activeFilter = "All";
let featuredIndex = 0;
const SAVED_KEY = "agasobanuye257-favorites";
let savedIds = new Set();
try { savedIds = new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]").map(String)); } catch (_) {}
const $ = selector => document.querySelector(selector);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
}

// Only display artwork hosted by ImageKit. TMDB is used for metadata, not images.
function imageKitURL(value, transform = "w-420,h-630,fo-auto,q-82") {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.href);
    const config = window.AGASOBANUYE257_CONFIG || {};
    const endpoint = config.imagekitUrlEndpoint || "";
    const endpointHost = endpoint ? new URL(endpoint).hostname : "";
    const allowed = url.protocol === "https:" &&
      (url.hostname === "ik.imagekit.io" || url.hostname.endsWith(".imagekit.io") ||
       (endpointHost && url.hostname === endpointHost));
    if (!allowed) return "";
    if (!url.searchParams.has("tr")) url.searchParams.set("tr", transform);
    return url.href;
  } catch (_) {
    return "";
  }
}

function card(movie) {
  const poster = imageKitURL(movie.poster);
  const title = escapeHTML(movie.title || "Untitled");
  const genre = escapeHTML(movie.genre || "Uncategorised");
  const year = escapeHTML(movie.year || "—");
  const rating = escapeHTML(movie.rating || movie.voteAverage || "—");
  const tag = escapeHTML(movie.tag || "MOVIE");
  const artwork = poster
    ? '<img src="' + escapeHTML(poster) + '" alt="' + title + ' poster" loading="lazy" decoding="async">'
    : '<div class="poster-placeholder" aria-hidden="true"><span>AGASOBANUYE<span>257</span></span></div>';
  const isSaved = savedIds.has(String(movie.id));
  return '<article class="poster-card" data-id="' + escapeHTML(movie.id) +
    '" tabindex="0" role="button" aria-label="Open ' + title + '">' +
    '<div class="poster-image">' + artwork + '<span class="poster-label">' + tag +
    '</span><button class="favorite-toggle' + (isSaved ? ' is-saved' : '') + '" data-favorite-id="' + escapeHTML(movie.id) +
    '" type="button" aria-label="' + (isSaved ? 'Remove from' : 'Add to') + ' favorites" aria-pressed="' + isSaved + '">♥</button></div><div class="poster-info"><h3>' + title +
    '</h3><div class="poster-meta"><span>' + genre + ' · ' + year +
    '</span><span>★ ' + rating + '</span></div></div></article>';
}

const HOME_CATEGORIES = ["Action", "Drama", "Animation", "Erotic", "Romance", "Horror", "Comedy", "HighSchool", "Others"];

function genreMatches(movie, category) {
  const genres = String(movie.genre || "").split(/[,/&|]/).map(value => value.trim().toLowerCase()).filter(Boolean);
  if (category === "Others") return !genres.some(value => HOME_CATEGORIES.slice(0, 8).some(name => name.toLowerCase() === value));
  return genres.includes(category.toLowerCase()) || genres.some(value => value.includes(category.toLowerCase()));
}

function renderRows() {
  const query = ($("#searchInput").value || "").trim().toLowerCase();
  $("#latestRow").innerHTML = movies.slice(0, 6).map(card).join("") || '<p class="empty-state">No movies have been published yet. New titles will appear here.</p>';
  const series = movies.filter(movie => movie.type === "series");
  $("#seriesRow").innerHTML = series.length
    ? series.slice(0, 6).map(card).join("")
    : '<p class="empty-state">Series will appear here when added in Admin Studio.</p>';
  HOME_CATEGORIES.forEach(category => {
    const row = document.getElementById("category-row-" + category.toLowerCase());
    if (!row) return;
    const matches = movies.filter(movie => genreMatches(movie, category));
    row.innerHTML = matches.length ? matches.slice(0, 6).map(card).join("") :
      '<p class="empty-state">No ' + escapeHTML(category.toLowerCase()) + ' titles published yet.</p>';
  });
  renderFavorites();
}

function persistFavorites() {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify([...savedIds])); } catch (_) {}
}
function renderFavorites() {
  const row = $("#favoriteRow");
  if (!row) return;
  const saved = movies.filter(movie => savedIds.has(String(movie.id)));
  $("#savedCount").textContent = saved.length + (saved.length === 1 ? " saved" : " saved");
  row.innerHTML = saved.length ? saved.map(card).join("") :
    '<p class="empty-state">No favorites yet. Tap the heart on a movie or series to save it here.</p>';
}
async function toggleFavorite(id) {
  const key = String(id);
  const wasSaved = savedIds.has(key);
  if (wasSaved) savedIds.delete(key); else savedIds.add(key);
  persistFavorites();
  renderRows();
  try {
    if (window.AgasobanuyeDB?.configured) {
      const session = await window.AgasobanuyeDB.getSession();
      if (session) await window.AgasobanuyeDB.toggleWatchlist(id, wasSaved);
    }
  } catch (error) {
    console.warn("Cloud favorites sync:", error);
  }
}
function openWatch(movie) {
  try { sessionStorage.setItem("agasobanuyeSelectedTitle", JSON.stringify(movie)); } catch (_) {}
  location.href = "watch.html?id=" + encodeURIComponent(movie.slug || movie.id);
}

function renderFeature() {
  if (!movies.length) {
    $("#featureTitle").textContent = "Discover your next favourite story";
    $("#featureDescription").textContent = "New movies and series will appear here as soon as they are published.";
    $("#featureTags").innerHTML = "<span>AGASOBANUYE257</span><span>Movies & Series</span>";
    $("#featureImage").style.backgroundImage = "none";
    $("#heroCount").textContent = "00 / 00";
    return;
  }
  const heroMovies = movies.slice(0, 10);\n  const movie = heroMovies[featuredIndex % heroMovies.length];
  const hero = $("#featureHero");
  if (hero) hero.classList.add("hero-changing");
  $("#featureTitle").textContent = movie.title || "Discover your next favourite";
  $("#featureDescription").textContent = movie.description || "Discover this title on AGASOBANUYE257.";
  $("#featureTags").innerHTML =
    "<span>" + escapeHTML(movie.type === "series" ? "Series" : "Movie") +
    "</span><span>" + escapeHTML(movie.genre || "Discover") +
    "</span><span>" + escapeHTML(movie.year || "—") + "</span>";
  const backdrop = imageKitURL(movie.backdrop || movie.poster, "w-1600,h-900,fo-auto,q-82");
  $("#featureImage").style.backgroundImage = backdrop ? 'url("' + backdrop.replace(/["\\\\]/g, "") + '")' : "none";
  $("#featureWatch").onclick = event => { event.preventDefault(); openWatch(movie); };
  $("#featureDetails").onclick = event => { event.preventDefault(); openWatch(movie); };
  $("#heroCount").textContent = String(featuredIndex + 1).padStart(2, "0") +
    " / " + String(Math.min(movies.length, 10)).padStart(2, "0");
  if (hero) { window.setTimeout(() => hero.classList.remove("hero-changing"), 380); }
}

function advanceFeature(direction = 1) {
  if (movies.length < 2) return;
  featuredIndex = (featuredIndex + direction + movies.length) % movies.length;
  renderFeature();
}

function applyFilter(category) {
  activeFilter = category;
  document.querySelectorAll(".filter-chip").forEach(button =>
    button.classList.toggle("selected", button.dataset.filter === category)
  );
  const target = category === "All" ? $("#latest") : document.getElementById("genre-" + category.toLowerCase());
  (target || $("#movies")).scrollIntoView({behavior:"smooth"});
  renderRows();
}

document.addEventListener("click", event => {
  const favoriteButton = event.target.closest("[data-favorite-id]");
  if (favoriteButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(favoriteButton.dataset.favoriteId);
    return;
  }
  const navLink = event.target.closest(".top-links a");
  if (navLink) $(".top-links").classList.remove("menu-open");
  const cardElement = event.target.closest(".poster-card");
  if (cardElement) {
    const movie = movies.find(item => String(item.id) === cardElement.dataset.id);
    if (movie) openWatch(movie);
  }
  const category = event.target.closest("[data-category]");
  if (category) applyFilter(category.dataset.category);
});

document.addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches(".poster-card")) {
    event.preventDefault();
    const movie = movies.find(item => String(item.id) === event.target.dataset.id);
    if (movie) openWatch(movie);
  }
});

$("#searchInput").addEventListener("input", renderRows);
$("#heroPrev").onclick = () => {
  advanceFeature(-1);
};
$("#heroNext").onclick = () => {
  advanceFeature(1);
};
// Shared responsive navigation behavior is handled by js/header.js.
$("#profileButton").onclick = () => $("#profileDialog").showModal();
$("#profileClose").onclick = () => $("#profileDialog").close();
$("#profileOkay").onclick = () => $("#profileDialog").close();
$("#savedTop").onclick = () => { location.href = "favorite.html"; };
$("#backTop").onclick = () => window.scrollTo({top:0, behavior:"smooth"});
const yearNode = $("#year");
if (yearNode) yearNode.textContent = new Date().getFullYear();
$("#newsletterForm").onsubmit = async event => {
  event.preventDefault();
  const form=event.currentTarget, input=form.querySelector('input[type="email"]');
  const button=form.querySelector('button[type="submit"],button');
  const email=String(input?.value||"").trim().toLowerCase();
  const status=$("#newsletterMessage");
  if(!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)){status.textContent="Enter a valid email address.";return;}
  const client=window.AgasobanuyeDB?.client;
  if(!client){status.textContent="Subscriptions are temporarily unavailable. Please try again later.";return;}
  if(button)button.disabled=true;
  status.textContent="Adding your email…";
  try{
    const {error}=await client.from("newsletter_subscribers").insert({email});
    if(error?.code==="23505"){status.textContent="This email is already on the update list.";return;}
    if(error)throw error;
    status.textContent="You're subscribed. Thanks for joining the AGASOBANUYE257 update list.";
    form.reset();
  }catch(error){
    console.error("Newsletter subscription:",error);
    status.textContent="We couldn't save your subscription. Please try again.";
  }finally{if(button)button.disabled=false;}
};

renderRows();
renderFeature();
// Auto-rotate featured titles like a streaming-service hero carousel.
window.setInterval(() => {
  const hero = $("#featureHero");
  if (!hero || document.hidden || hero.matches(":hover") || hero.contains(document.activeElement)) return;
  advanceFeature(1);
}, 6500);
window.addEventListener("hashchange", () => {
  const hash = location.hash || "#home";
  document.querySelectorAll(".top-links a,.mobile-bottom-nav a").forEach(link => link.classList.toggle("active", link.getAttribute("href") === hash));
});

if (window.AgasobanuyeDB?.configured) {
  window.AgasobanuyeDB.getMovies().then(rows => {
    movies = Array.isArray(rows) ? rows : [];
    renderRows();
    renderFeature();
    window.AgasobanuyeDB.getSession().then(session => {
      if (session) window.AgasobanuyeDB.getWatchlist().then(ids => {
        savedIds = new Set([...savedIds, ...ids.map(String)]); persistFavorites(); renderRows();
      }).catch(error => console.warn("Watchlist sync:", error));
    }).catch(() => {});
  }).catch(error => console.error("Catalogue:", error));
}
