/* AGASOBANUYE257 live update watcher
   Checks the currently-open page for a newly deployed HTML version.
   It never interrupts active video playback or discards unsaved form edits. */
(() => {
  "use strict";
  const CHECK_EVERY_MS = 60000;
  const PAGE_URL = location.pathname + location.search;
  let originalHTML = "";
  let updateFound = false;
  let notice = null;

  function hasUnsavedEdits() {
    return [...document.querySelectorAll("input,textarea,select")].some(field => {
      if (field.type === "password" || field.type === "file" || field.type === "submit" || field.type === "button") return false;
      if (field.type === "checkbox" || field.type === "radio") return field.checked !== field.defaultChecked;
      if (field.tagName === "SELECT") return [...field.options].some(option => option.selected !== option.defaultSelected);
      return field.value !== field.defaultValue;
    });
  }

  function safeToRefresh() {
    const videoPlaying = [...document.querySelectorAll("video,audio")].some(media => !media.paused && !media.ended);
    return !videoPlaying && !hasUnsavedEdits();
  }

  function showNotice() {
    if (notice || !document.body) return;
    notice = document.createElement("div");
    notice.setAttribute("role", "status");
    notice.style.cssText = "position:fixed;z-index:2147483000;right:18px;bottom:18px;max-width:min(360px,calc(100vw - 36px));padding:14px 16px;border:1px solid rgba(214,165,46,.55);border-radius:12px;background:#0a1b30;color:#f3f6fb;box-shadow:0 14px 40px rgba(0,0,0,.4);font:13px/1.5 system-ui,sans-serif";
    const message = document.createElement("div");
    message.textContent = "A new AGASOBANUYE257 update is ready.";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Refresh now";
    button.style.cssText = "margin-top:9px;padding:8px 12px;border:0;border-radius:7px;background:#d6a52e;color:#071426;font-weight:800;cursor:pointer";
    button.addEventListener("click", () => location.reload());
    notice.append(message, button);
    document.body.appendChild(notice);
  }

  async function getPageSource() {
    const url = new URL(PAGE_URL, location.origin);
    url.searchParams.set("__aga_live_check", String(Date.now()));
    const response = await fetch(url.href, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Cache-Control": "no-cache" }
    });
    if (!response.ok) throw new Error("Update check failed");
    return response.text();
  }

  async function checkForUpdates() {
    if (document.visibilityState === "hidden") return;
    try {
      const latestHTML = await getPageSource();
      if (!originalHTML) {
        originalHTML = latestHTML;
        return;
      }
      if (latestHTML !== originalHTML) updateFound = true;
      if (!updateFound) return;
      if (safeToRefresh()) {
        location.reload();
      } else {
        showNotice();
      }
    } catch (error) {
      // A temporary network failure should never interrupt the current page.
    }
  }

  window.addEventListener("load", () => {
    checkForUpdates();
    window.setInterval(checkForUpdates, CHECK_EVERY_MS);
  }, { once: true });
  window.addEventListener("focus", checkForUpdates);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdates();
  });
})();