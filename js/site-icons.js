/* AGASOBANUYE257 shared Lucide icon system. */
(() => {
  const icon = (node, name) => {
    if (!node || node.querySelector(":scope > [data-lucide], :scope > svg")) return;
    node.replaceChildren();
    const el = document.createElement("i");
    el.setAttribute("data-lucide", name);
    el.setAttribute("aria-hidden", "true");
    node.appendChild(el);
  };
  const leading = (node, name) => {
    if (!node || node.querySelector("[data-lucide], svg")) return;
    const first = node.firstChild;
    if (first && first.nodeType === Node.TEXT_NODE) {
      first.textContent = first.textContent.replace(/^\s*[⌂▣▤▦✦◉◷⚙⇧◎↪]+\s*/, "");
    }
    const el = document.createElement("i");
    el.setAttribute("data-lucide", name);
    el.setAttribute("aria-hidden", "true");
    node.insertBefore(el, node.firstChild);
  };
  const refresh = () => {
    document.querySelectorAll(".heading-icon").forEach(node => {
      const heading = node.parentElement?.querySelector("h2")?.textContent.toLowerCase() || "";
      const name = heading.includes("latest") ? "clock-3" : heading.includes("movie") ? "clapperboard" : heading.includes("series") ? "tv" : heading.includes("action") ? "zap" : heading.includes("drama") ? "drama" : heading.includes("animation") ? "film" : heading.includes("romance") ? "heart" : heading.includes("horror") ? "ghost" : heading.includes("comedy") ? "laugh" : heading.includes("school") ? "graduation-cap" : "tags";
      icon(node, name);
    });
    document.querySelectorAll(".saved-action,.favorite-toggle").forEach(n => icon(n, "heart"));
    document.querySelectorAll(".profile-action").forEach(n => icon(n, "user-round"));
    document.querySelectorAll(".menu-action").forEach(n => icon(n, "menu"));
    document.querySelectorAll(".newsletter-icon").forEach(n => icon(n, "mail"));
    document.querySelectorAll(".agas-footer-spark").forEach(n => icon(n, "sparkles"));
    document.querySelectorAll(".vip-page-benefits b,.vip-benefits b").forEach(n => icon(n, "badge-check"));
    document.querySelectorAll("#heroPrev").forEach(n => icon(n, "chevron-left"));
    document.querySelectorAll("#heroNext").forEach(n => icon(n, "chevron-right"));
    document.querySelectorAll("#backTop").forEach(n => icon(n, "arrow-up"));
    document.querySelectorAll(".pro-nav a").forEach(n => {
      const label = n.textContent.toLowerCase();
      const name = label.includes("overview") ? "layout-dashboard" : label.includes("movies") ? "clapperboard" : label.includes("series") ? "tv" : label.includes("categories") ? "tags" : label.includes("translator") ? "languages" : label.includes("announcement") ? "megaphone" : label.includes("super admin") ? "shield-check" : label.includes("analytics") ? "chart-no-axes-combined" : "settings";
      leading(n, name);
    });
    document.querySelectorAll(".quick-actions button").forEach(n => {
      const label = n.textContent.toLowerCase();
      const name = label.includes("movie") ? "clapperboard" : label.includes("series") ? "tv" : label.includes("categor") ? "tags" : "cloud-upload";
      leading(n, name);
    });
    document.querySelectorAll(".row-heading>a,.agas-footer-note>a").forEach(n => {
      const text = n.textContent.trim();
      if (/view all|explore the collection/i.test(text) && !n.querySelector("[data-lucide], svg")) {
        const span = document.createElement("i"); span.setAttribute("data-lucide","arrow-right"); span.setAttribute("aria-hidden","true"); n.appendChild(span);
      }
    });
    // Shared navigation and action icons across every public and admin page.
    document.querySelectorAll(".premium-header a,.member-header a,.site-nav a,.mobile-nav a").forEach(n => {
      const label=(n.getAttribute("aria-label")||n.title||n.textContent).toLowerCase();
      const name=label.includes("home")?"house":label.includes("movie")?"clapperboard":label.includes("series")?"tv":label.includes("favorite")||label.includes("saved")?"heart":label.includes("vip")?"crown":label.includes("search")?"search":label.includes("profile")||label.includes("account")?"user-round":label.includes("sign in")?"log-in":label.includes("sign out")?"log-out":label.includes("menu")?"menu":null;
      if(name) leading(n,name);
    });
    document.querySelectorAll("button,a,[role=button]").forEach(n => {
      if(n.querySelector("[data-lucide],svg")) return;
      const label=((n.getAttribute("aria-label")||"")+" "+(n.getAttribute("title")||"")+" "+n.textContent).trim().toLowerCase();
      const name=label.includes("search")?"search":label.includes("watch now")||label==="watch"?"play":label.includes("download")?"download":label.includes("trailer")?"clapperboard":label.includes("share")?"share-2":label.includes("back")?"arrow-left":label.includes("next")?"arrow-right":label.includes("previous")?"chevron-left":label.includes("close")?"x":label.includes("edit")?"pencil":label.includes("delete")?"trash-2":label.includes("upload")?"upload-cloud":label.includes("refresh")?"refresh-cw":label.includes("filter")?"sliders-horizontal":label.includes("sort")?"arrow-down-wide-n":label.includes("favorite")||label.includes("save")?"heart":label.includes("settings")?"settings":null;
      if(name && (n.children.length===0 || n.classList.contains("icon-button") || n.classList.contains("admin-icon-button"))) leading(n,name);
    });
    document.querySelectorAll(".social-links a,.social-icon a,[data-social]").forEach(n => {
      const label=((n.getAttribute("aria-label")||"")+" "+n.href).toLowerCase();
      const name=label.includes("youtube")?"youtube":label.includes("facebook")?"facebook":label.includes("instagram")?"instagram":label.includes("tiktok")?"music-2":label.includes("whatsapp")?"message-circle":null;
      if(name) icon(n,name);
    });
    if (window.lucide?.createIcons) window.lucide.createIcons({attrs:{"stroke-width":2}});

  };
  // Run once only. A subtree MutationObserver here caused expensive repeated full-page scans
  // while other scripts update the catalogue, which could freeze slower mobile browsers.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh, {once:true});
  else refresh();
})();