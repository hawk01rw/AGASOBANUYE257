/* Hide the initial loader once the page and its assets have loaded. */
(() => {
  const loader = document.getElementById("siteLoader");
  if (!loader) return;
  let hidden = false;
  const hide = () => {
    if (hidden) return;
    hidden = true;
    loader.classList.add("is-hidden");
    window.setTimeout(() => loader.remove(), 550);
  };
  if (document.readyState === "complete") window.setTimeout(hide, 450);
  else window.addEventListener("load", () => window.setTimeout(hide, 450), { once: true });
  window.setTimeout(hide, 10000);
})();
