const RELEASE = "studio-domain-single-authority-v112-20260728";
const LEGACY_SELECTORS = [
  ":scope > .sp37-domain-host",
  ":scope > .op41-host[data-surface='domains']",
  ":scope > .dm-root",
  ":scope > .dm-panel",
  ":scope > .dfz-root",
].join(",");
let frame = 0;

function domainView() {
  return document.querySelector(".sn-main > .sn-view-pad[data-domain-manager-host-v112='true']")
    || [...document.querySelectorAll(".sn-main > .sn-view-pad")].find((view) => (
      view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === "Domain & publikasi"
    ))
    || null;
}

function lock(view) {
  if (!(view instanceof HTMLElement)) return;
  view.dataset.domainManagerHostV112 = "true";
  view.dataset.domainSingleAuthority = RELEASE;
  view.querySelectorAll(LEGACY_SELECTORS).forEach((node) => node.remove());
  const host = view.querySelector(":scope > .d80-host");
  if (host instanceof HTMLElement) {
    [...view.children].forEach((child) => {
      if (child === host) return;
      child.hidden = true;
      child.setAttribute("aria-hidden", "true");
      child.style.setProperty("display", "none", "important");
    });
    host.hidden = false;
    host.removeAttribute("aria-hidden");
    host.style.setProperty("display", "block", "important");
  }
}

function sync() {
  document.documentElement.dataset.domainSingleAuthorityV112 = RELEASE;
  const view = domainView();
  if (view) lock(view);
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "attributes")) schedule();
}).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:["class","hidden","data-domain-manager-host-v112"] });

window.addEventListener("pageshow", schedule);
window.addEventListener("ngeblogging:active-site-change", schedule);
window.addEventListener("ngeblogging:active-site-ready", schedule);
sync();
