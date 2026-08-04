export const RELEASE = "studio-theme-layout-right4-v257-20260804";

let frame = 0;

function sync() {
  frame = 0;
  document.querySelectorAll(".tn-layout-studio").forEach((studio) => {
    studio.dataset.layoutRight4V257 = RELEASE;
    studio.setAttribute("aria-label", "Peta tata letak dengan empat widget kiri, Post atau Page di tengah, dan empat widget kanan");
  });
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.themeCodeLayoutV257 = "bounded-responsive";
  });
  document.documentElement.dataset.studioThemeLayoutV257 = RELEASE;
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  new MutationObserver((records) => {
    if (records.some((record) => record.addedNodes.length || record.removedNodes.length)) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  schedule();
}
