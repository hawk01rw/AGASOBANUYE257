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
function imageKitURL(value) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.href);
    const config = window.AGASOBANUYE257_CONFIG || {};
    const endpoint = config.imagekitUrlEndpoint || "";
    const endpointHost = endpoint ? new URL(endpoint).hostname : "";
    const allowed = url.protocol === "https:" &&
      (url.hostname === "ik.imagekit.io" || url.hostname.endsWith(".imagekit.io") ||
       (endpointHost && url.hostname === endpointHost));
    return allowed ? url.href : "";
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
    ? '<img src="' + escapeHTML(poster) + '" alt="' + title + ' poster" loading="lazy">'
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

const HOME_CATEGORIES = ["Action", "Drama", "Animation", "Erotic", "Romance", "Horror", "Comedy", "Others"];

function genreMatches(movie, category) {
  const genres = String(movie.genre || "").split(/[,/&|]/).map(value => value.trim().toLowerCase()).filter(Boolean);
  if (category === "Others") return !genres.some(value => HOME_CATEGORIES.slice(0, 7).some(name => name.toLowerCase() === value));
  return genres.includes(category.toLowerCase()) || genres.some(value => value.includes(category.toLowerCase()));
}

function renderRows() {
  const query = ($("#searchInput").value || "").trim().toLowerCase();
  const filtered = movies.filter(movie =>
    (activeFilter === "All" || genreMatches(movie, activeFilter)) &&
    (!query || (String(movie.title) + " " + String(movie.genre)).toLowerCase().includes(query))
  );
  $("#movieRow").innerHTML = filtered.map(card).join("");
  $("#latestRow").innerHTML = movies.slice(0, 12).map(card).join("") || '<p class="empty-state">No movies have been published yet. New titles will appear here.</p>';
  const series = movies.filter(movie => movie.type === "series");
  $("#seriesRow").innerHTML = series.length
    ? series.map(card).join("")
    : '<p class="empty-state">Series will appear here when added in Admin Studio.</p>';
  HOME_CATEGORIES.forEach(category => {
    const row = document.getElementById("category-row-" + category.toLowerCase());
    if (!row) return;
    const matches = movies.filter(movie => genreMatches(movie, category));
    row.innerHTML = matches.length ? matches.map(card).join("") :
      '<p class="empty-state">No ' + escapeHTML(category.toLowerCase()) + ' titles published yet.</p>';
  });
  $("#emptyState").textContent = query ? "No titles found. Try another search." : "No published movies yet. Add and publish a movie in Admin Studio to show it here.";
  $("#emptyState").hidden = filtered.length > 0;
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
  if (savedIds.has(key)) savedIds.delete(key); else savedIds.add(key);
  persistFavorites();
  renderRows();
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
  const movie = movies[featuredIndex % movies.length];
  $("#featureTitle").textContent = movie.title || "Discover your next favourite";
  $("#featureDescription").textContent = movie.description || "Discover this title on AGASOBANUYE257.";
  $("#featureTags").innerHTML =
    "<span>" + escapeHTML(movie.type === "series" ? "Series" : "Movie") +
    "</span><span>" + escapeHTML(movie.genre || "Discover") +
    "</span><span>" + escapeHTML(movie.year || "—") + "</span>";
  const backdrop = imageKitURL(movie.backdrop || movie.poster);
  $("#featureImage").style.backgroundImage = backdrop ? 'url("' + backdrop.replace(/["\\\\]/g, "") + '")' : "none";
  $("#featureWatch").onclick = event => { event.preventDefault(); openWatch(movie); };
  $("#featureDetails").onclick = event => { event.preventDefault(); openWatch(movie); };
  $("#heroCount").textContent = String(featuredIndex + 1).padStart(2, "0") +
    " / " + String(movies.length).padStart(2, "0");
}

function applyFilter(category) {
  activeFilter = category;
  document.querySelectorAll(".filter-chip").forEach(button =>
    button.classList.toggle("selected", button.dataset.filter === category)
  );
  const target = category === "All" ? $("#movies") : document.getElementById("genre-" + category.toLowerCase());
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
$("#filterRow").addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (button) applyFilter(button.dataset.filter);
});
$("#heroPrev").onclick = () => {
  featuredIndex = (featuredIndex - 1 + movies.length) % movies.length;
  renderFeature();
};
$("#heroNext").onclick = () => {
  featuredIndex = (featuredIndex + 1) % movies.length;
  renderFeature();
};
$("#menuButton").onclick = () => { const open = $(".top-links").classList.toggle("menu-open"); $("#menuButton").setAttribute("aria-expanded", String(open)); };
$("#profileButton").onclick = $("#bottomProfile").onclick = () => $("#profileDialog").showModal();
$("#profileClose").onclick = () => $("#profileDialog").close();
$("#profileOkay").onclick = () => $("#profileDialog").close();
$("#savedTop").onclick = () => $("#favorite").scrollIntoView({behavior:"smooth"});
$("#backTop").onclick = () => window.scrollTo({top:0, behavior:"smooth"});
const yearNode = $("#year");
if (yearNode) yearNode.textContent = new Date().getFullYear();
$("#newsletterForm").onsubmit = event => {
  event.preventDefault();
  $("#newsletterMessage").textContent = "Thanks for subscribing!";
  event.target.reset();
};

renderRows();
renderFeature();
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
