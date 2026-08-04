export const RELEASE = "studio-theme-layout-right4-v256-20260804";

let frame = 0;

function sync() {
  frame = 0;
  document.querySelectorAll(".tn-layout-studio").forEach((studio) => {
    studio.dataset.layoutRight4V256 = RELEASE;
    studio.setAttribute("aria-label", "Peta tata letak dengan empat widget kiri, Post atau Page di tengah, dan empat widget kanan");
  });
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  new MutationObserver((records) => {
    if (records.some((record) => record.addedNodes.length || record.removedNodes.length)) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  schedule();
}