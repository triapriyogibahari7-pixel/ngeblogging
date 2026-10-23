const DEFAULT_BODIES = new Map([
  ["Post tanpa judul", "<h1>Judul Post</h1><p>Mulai menulis ide Anda.</p>"],
  ["Page tanpa judul", "<h1>Judul Page</h1><p>Bangun halaman profesional.</p>"],
]);

export function shouldClearDefaultDraft({ title, content, status, width, editing = false }) {
  return width >= 761 && status === "draft" && !editing && DEFAULT_BODIES.has(title) && content === DEFAULT_BODIES.get(title);
}

function boot() {
  const key = Symbol.for("ngeblogging.empty-default-draft.desktop");
  if (window[key]) return;
  window[key] = true;
  let queued = false;
  function clean() {
    queued = false;
    if (window.innerWidth < 761) return;
    for (const app of document.querySelectorAll(".ce-app:not(.ce-dialog-host)")) {
      const paper = app.querySelector(".ce-paper[contenteditable]");
      const title = app.querySelector(".ce-file input");
      const status = [...app.querySelectorAll(".ce-sidebar select")].find(select => select.querySelector('option[value="draft"]'));
      if (!paper || !title || !status) continue;
      if (!shouldClearDefaultDraft({ title: title.value, content: paper.innerHTML, status: status.value, width: window.innerWidth, editing: paper === document.activeElement || paper.contains(document.activeElement) })) continue;
      paper.innerHTML = "";
      paper.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(clean);
  }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  schedule();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot, { once: true });
}
