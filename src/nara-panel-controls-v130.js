const RELEASE = "nara-panel-controls-v130-20260729";
const STORAGE_KEY = "ngeblogging-nara-panel-size-v130";
const VALID_SIZES = new Set(["compact", "medium", "full"]);
let scheduled = 0;

function physicalPhone() {
  const root = document.documentElement;
  return root.dataset.physicalScreenMobile === "true"
    || root.dataset.desktopSitePhone === "true"
    || window.matchMedia("(max-width: 760px)").matches;
}

function storedSize() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return VALID_SIZES.has(value) ? value : "";
  } catch {
    return "";
  }
}

function initialSize() {
  return storedSize() || (physicalPhone() ? "full" : "medium");
}

function icon(size) {
  if (size === "compact") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6"/></svg>';
  }
  if (size === "full") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>';
}

function label(size) {
  if (size === "compact") return "Buka Nara ukuran ringkas";
  if (size === "full") return "Buka Nara layar penuh";
  return "Buka Nara ukuran sedang";
}

function applySize(shell, size, controls = null) {
  const next = VALID_SIZES.has(size) ? size : initialSize();
  shell.dataset.naraSize = next;
  shell.setAttribute("data-nara-controls-release", RELEASE);
  shell.closest(".nara-assistant-layer")?.setAttribute("data-nara-size", next);
  const toolbar = controls || shell.querySelector(".nara-window-controls");
  toolbar?.querySelectorAll("button[data-size]").forEach((button) => {
    const active = button.dataset.size === next;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage optional */ }
  window.dispatchEvent(new CustomEvent("ngeblogging:nara-panel-size", {
    detail: { size: next, release: RELEASE },
  }));
}

function createControls(shell, header) {
  let controls = header.querySelector(".nara-window-controls");
  if (controls) {
    applySize(shell, shell.dataset.naraSize || initialSize(), controls);
    return;
  }

  controls = document.createElement("div");
  controls.className = "nara-window-controls";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Ukuran jendela Nara");
  controls.dataset.release = RELEASE;

  ["compact", "medium", "full"].forEach((size) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.size = size;
    button.setAttribute("aria-label", label(size));
    button.setAttribute("title", label(size));
    button.innerHTML = icon(size);
    button.addEventListener("click", () => applySize(shell, size, controls));
    controls.append(button);
  });

  const resetButton = header.querySelector('button[title="Percakapan baru"]') || header.querySelector("button");
  header.insertBefore(controls, resetButton || null);
  applySize(shell, initialSize(), controls);
}

function enhance() {
  cancelAnimationFrame(scheduled);
  scheduled = requestAnimationFrame(() => {
    const shells = [...document.querySelectorAll(".nara-assistant-shell")];
    document.body.classList.toggle("nara-modal-open", shells.length > 0);
    shells.forEach((shell) => {
      const header = shell.querySelector(".nara-assistant-header");
      if (!header) return;
      createControls(shell, header);
    });
    document.documentElement.dataset.naraPanelControls = RELEASE;
  });
}

new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
window.addEventListener("resize", enhance, { passive: true });
window.addEventListener("orientationchange", enhance, { passive: true });
window.addEventListener("pageshow", enhance, { passive: true });
enhance();
