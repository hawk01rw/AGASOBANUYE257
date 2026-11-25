(() => {
  "use strict";
  const config = window.AGASOBANUYE257_CONFIG || {};
  if (!config.supabaseUrl || !config.supabaseAnonKey) return;

  const url = new URL("/rest/v1/site_announcements", config.supabaseUrl);
  const params = new URLSearchParams({
    select: "id,title,message,tone,starts_at,ends_at,created_at",
    is_active: "eq.true",
    order: "created_at.desc",
    limit: "5"
  });
  const now = new Date().toISOString();
  params.append("or", "(starts_at.is.null,starts_at.lte." + now + ")");
  params.append("or", "(ends_at.is.null,ends_at.gt." + now + ")");
  url.search = params.toString();

  fetch(url, {
    headers: { apikey: config.supabaseAnonKey, Accept: "application/json" },
    cache: "no-store"
  }).then(response => {
    if (!response.ok) throw new Error("Announcement request failed");
    return response.json();
  }).then(rows => {
    const now = Date.now();
    const active = (Array.isArray(rows) ? rows : []).filter(item =>
      (!item.starts_at || new Date(item.starts_at).getTime() <= now) &&
      (!item.ends_at || new Date(item.ends_at).getTime() > now)
    ).slice(0, 3);
    if (!active.length) return;

    const region = document.createElement("section");
    region.className = "site-announcements";
    region.setAttribute("aria-label", "Site announcements");
    region.setAttribute("aria-live", "polite");

    active.forEach(item => {
      const card = document.createElement("article");
      card.className = "site-announcement tone-" + (["info", "success", "warning"].includes(item.tone) ? item.tone : "info");

      const mark = document.createElement("span");
      mark.className = "site-announcement-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = item.tone === "warning" ? "!" : item.tone === "success" ? "✓" : "i";

      const copy = document.createElement("div");
      copy.className = "site-announcement-copy";
      const heading = document.createElement("strong");
      heading.textContent = item.title || "Announcement";
      const message = document.createElement("p");
      message.textContent = item.message || "";
      copy.append(heading, message);

      const close = document.createElement("button");
      close.className = "site-announcement-close";
      close.type = "button";
      close.setAttribute("aria-label", "Dismiss announcement");
      close.textContent = "×";
      close.addEventListener("click", () => {
        card.remove();
        if (!region.children.length) region.remove();
      });

      card.append(mark, copy, close);
      region.appendChild(card);
    });

    const header = document.querySelector(".premium-header");
    if (header) header.insertAdjacentElement("afterend", region);
    else document.body.prepend(region);
  }).catch(error => console.warn("Announcements unavailable:", error));
})();
