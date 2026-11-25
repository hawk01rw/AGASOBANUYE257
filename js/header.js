/* AGASOBANUYE257 — shared accessible header interactions */
(() => {
  const header = document.querySelector(".premium-header");
  if (!header) return;
  const menu = header.querySelector("#menuButton");
  const nav = header.querySelector("#primaryNavigation");
  const search = header.querySelector("[data-site-search]");
  if (!menu || !nav) return;
  const setOpen = (open) => {
    nav.classList.toggle("menu-open", open);
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    document.body.classList.toggle("navigation-open", open);
  };
  menu.addEventListener("click", () => setOpen(menu.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!header.contains(event.target) && nav.classList.contains("menu-open")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("menu-open")) {
      setOpen(false);
      menu.focus();
    }
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && search) {
      event.preventDefault();
      search.focus();
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 849) setOpen(false);
  }, { passive: true });
  const current = location.pathname.split("/").pop() || "index.html";
  nav.querySelectorAll("a").forEach((link) => {
    const target = link.getAttribute("href");
    const active = target === current;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
})();
