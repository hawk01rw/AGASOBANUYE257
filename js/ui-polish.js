/* Shared interface polish and accessible back-to-top control */
(() => {
  const existing = document.getElementById("backTop");
  const button = existing || document.createElement("button");
  if (!existing) {
    button.type = "button";
    button.id = "backTop";
    button.className = "back-top-premium";
    button.setAttribute("aria-label", "Back to top");
    button.setAttribute("title", "Back to top");
    button.innerHTML = "↑";
    document.body.appendChild(button);
  } else {
    button.classList.add("back-top-premium");
    button.innerHTML = "↑";
    button.setAttribute("aria-label", "Back to top");
    button.setAttribute("title", "Back to top");
  }
  const update = () => button.classList.toggle("is-visible", window.scrollY > 360);
  button.addEventListener("click", () => window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
  window.addEventListener("scroll", update, {passive:true});
  update();
})();