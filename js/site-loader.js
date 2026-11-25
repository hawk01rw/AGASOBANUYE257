/* Short, fail-safe branded loader. Never wait for every image or third-party script. */
(() => {
  const hide = () => {
    const loader = document.getElementById("siteLoader");
    if (!loader || loader.dataset.dismissed === "true") return;
    loader.dataset.dismissed = "true";
    loader.classList.add("is-hidden");
    window.setTimeout(() => loader.remove(), 500);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.setTimeout(hide, 700), { once: true });
  } else {
    window.setTimeout(hide, 700);
  }
  // Independent JS failsafe; CSS also contains its own timeout.
  window.setTimeout(hide, 4000);
})();
