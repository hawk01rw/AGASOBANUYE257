/* AGASOBANUYE257 two-number WhatsApp contact picker. */
(() => {
  const widget = document.querySelector(".contact-float");
  if (!widget) return;
  const trigger = widget.querySelector(".contact-float__trigger");
  const panel = widget.querySelector(".contact-float__panel");
  if (!trigger || !panel) return;
  const setOpen = (open) => {
    widget.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  };
  trigger.addEventListener("click", () => setOpen(!widget.classList.contains("is-open")));
  document.addEventListener("click", (event) => {
    if (!widget.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
})();
