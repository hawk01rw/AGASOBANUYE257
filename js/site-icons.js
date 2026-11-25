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
      const brand = label.includes("youtube") ? "youtube" : label.includes("facebook") ? "facebook" : label.includes("instagram") ? "instagram" : null;
      if (brand) {
        const paths = {
          youtube: '<path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/>',
          facebook: '<path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5v2.1H7v3.2h2.8V21h3.7Z"/>',
          instagram: '<path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.2-3.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"/>'
        };
        n.replaceChildren();
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.innerHTML = paths[brand];
        n.appendChild(svg);
      } else {
        const name = label.includes("tiktok") ? "music-2" : label.includes("whatsapp") ? "message-circle" : null;
        if (name) icon(n, name);
      }
    });
    // Brand logos are not part of Lucide's icon pack. Replace any legacy
    // data-lucide brand nodes before Lucide scans the document.
    const brandPaths = {
      youtube: '<path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/>',
      facebook: '<path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5v2.1H7v3.2h2.8V21h3.7Z"/>',
      instagram: '<path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.2-3.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"/>'
    };
    document.querySelectorAll('i[data-lucide="youtube"],i[data-lucide="facebook"],i[data-lucide="instagram"]').forEach(node => {
      const name = node.getAttribute("data-lucide");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.innerHTML = brandPaths[name];
      node.replaceWith(svg);
    });
    if (window.lucide?.createIcons) window.lucide.createIcons({attrs:{"stroke-width":2}});

  };
  // Run once only. A subtree MutationObserver here caused expensive repeated full-page scans
  // while other scripts update the catalogue, which could freeze slower mobile browsers.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh, {once:true});
  else refresh();
})();