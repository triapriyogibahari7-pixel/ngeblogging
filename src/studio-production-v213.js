import "./studio-production-v213.css";

const RELEASE = "studio-production-v213-20260802";
let frame = 0;

function lockMainContentSlot() {
  const slot = document.querySelector('.tn-layout-canvas-v170[data-v212-layout-map] > .content-main');
  if (!slot) return;
  slot.dataset.v213LockedContent = "true";
  slot.setAttribute("aria-disabled", "true");
  slot.setAttribute("tabindex", "-1");
  slot.setAttribute("title", "Konten utama Post/Page — bukan slot widget");
  const badge = slot.querySelector(":scope > span");
  const title = slot.querySelector(":scope > small");
  const description = slot.querySelector(":scope > b");
  if (badge) badge.textContent = "POST / PAGE";
  if (title) title.textContent = "Konten utama";
  if (description) description.textContent = "Area utama tetap penuh hingga editor 5.000 kata; widget hanya berada di sekelilingnya.";
}

function markAnalytics() {
  document.querySelectorAll(".op41-panel").forEach((panel) => panel.dataset.v213Analytics = "factual-detail");
  document.querySelectorAll(".op41-line-v213").forEach((chart) => chart.dataset.v213Chart = "smooth-time-series");
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioProductionV213 = RELEASE;
  lockMainContentSlot();
  markAnalytics();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
document.addEventListener("click", (event) => {
  if (!event.target.closest('.tn-layout-canvas-v170[data-v212-layout-map] > .content-main')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
window.addEventListener("pageshow", schedule, { passive:true });
sync();

export { RELEASE, lockMainContentSlot, markAnalytics, sync };
