const RELEASE = "comments-empty-state-v123-20260729";

function syncCommentsEmptyState() {
  document.documentElement.dataset.commentsEmptyStateV123 = RELEASE;
  document.querySelectorAll(".csm-workspace-v93").forEach((workspace) => {
    const loading = workspace.querySelector(".csm-loading-v93");
    const emptyList = workspace.querySelector(".csm-empty-v93");
    const emptyDetail = workspace.querySelector(".csm-empty-detail-v93");
    const zero = !loading && Boolean(emptyList && emptyDetail);
    workspace.classList.toggle("csm-zero-comments-v123", zero);
    workspace.dataset.commentsEmptyV123 = String(zero);
  });
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncCommentsEmptyState);
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

export { RELEASE, syncCommentsEmptyState };
