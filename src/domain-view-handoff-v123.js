/* Ensure the original manager module is evaluated even when the compatibility
   import was served from an older PWA cache before the React Domain view existed. */
import "./domain-manager-v80.js";

const RELEASE = "domain-view-handoff-v123-20260729";
const RETRY_DELAYS = [0, 60, 220, 700, 1800];
const pendingTimers = new WeakMap();

function currentSite() {
  const site = window.__ngebloggingActiveSite;
  return site?.id && site?.slug ? site : null;
}

function signalManager(view) {
  if (!(view instanceof HTMLElement) || !view.isConnected) return;
  view.dataset.domainHandoffV123 = "waiting";
  document.documentElement.dataset.domainViewHandoffV123 = RELEASE;

  /* domain-manager-v80 owns a pageshow listener that always schedules scan().
     Active-site events cover an already-mounted controller. */
  window.dispatchEvent(new Event("pageshow"));
  const site = currentSite();
  if (site) {
    window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: site }));
  }
}

function installRetry(view) {
  const preload = view.querySelector(":scope > .dm112-preload");
  if (!(preload instanceof HTMLElement) || view.querySelector(":scope > .d80-host")) return;
  preload.classList.add("dm123-stalled");
  preload.dataset.domainHandoffV123 = "stalled";
  const title = preload.querySelector("h1");
  const description = preload.querySelector("p");
  if (title) title.textContent = "Pengelola Domain belum tersambung.";
  if (description) description.textContent = "Sesi dan situs aktif tetap aman. Tekan Coba lagi untuk menyambungkan ulang halaman Domain tanpa keluar dari Studio.";
  if (!preload.querySelector(".dm123-retry")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dm123-retry";
    button.textContent = "Coba lagi";
    button.addEventListener("click", () => {
      preload.classList.remove("dm123-stalled");
      preload.dataset.domainHandoffV123 = "waiting";
      signalManager(view);
      window.setTimeout(() => installRetry(view), 2200);
    });
    preload.querySelector("div")?.append(button);
  }
}

function scheduleView(view) {
  if (!(view instanceof HTMLElement) || pendingTimers.has(view)) return;
  const timers = RETRY_DELAYS.map((delay) => window.setTimeout(() => {
    if (!view.isConnected || view.querySelector(":scope > .d80-host")) return;
    signalManager(view);
  }, delay));
  timers.push(window.setTimeout(() => installRetry(view), 2600));
  pendingTimers.set(view, timers);
}

function syncDomainHandoff() {
  document.querySelectorAll(".sn-main > .sn-view-pad[data-domain-manager-host-v112='true']")
    .forEach((view) => {
      if (!(view instanceof HTMLElement) || view.querySelector(":scope > .d80-host")) return;
      if (!view.querySelector(":scope > .dm112-preload")) return;
      scheduleView(view);
    });
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncDomainHandoff);
}

function start() {
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("ngeblogging:active-site-ready", schedule);
  window.addEventListener("ngeblogging:active-site-change", schedule);
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

export { RELEASE, syncDomainHandoff };
