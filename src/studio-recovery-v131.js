const RELEASE = "studio-recovery-v131-20260729";
const SIZE_KEY = "ngeblogging-nara-panel-size-v131";
const LEGACY_SIZE_KEY = "ngeblogging-nara-panel-size-v130";
const VALID_SIZES = new Set(["compact", "medium", "full"]);
let frame = 0;

function ensureStylesheet() {
  if (document.querySelector('link[data-studio-recovery="v131"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/src/studio-recovery-v131.css?v=131";
  link.dataset.studioRecovery = "v131";
  document.head.append(link);
}

function labelOf(button) {
  return button?.querySelector(":scope > span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function removeDuplicateNaraSidebar() {
  document.querySelectorAll(".sv124-side nav button,.sn-side nav button").forEach((button) => {
    if (labelOf(button).toLowerCase() !== "nara ai") return;
    button.dataset.naraSidebarDuplicate = "true";
    button.hidden = true;
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
  });
}

function storedSize() {
  try {
    const value = localStorage.getItem(SIZE_KEY);
    return VALID_SIZES.has(value) ? value : "compact";
  } catch {
    return "compact";
  }
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

function sizeLabel(size) {
  if (size === "compact") return "Nara kecil mengambang";
  if (size === "medium") return "Nara ukuran sedang";
  return "Nara layar penuh";
}

function applySize(shell, size, persist = true) {
  const next = VALID_SIZES.has(size) ? size : "compact";
  shell.dataset.naraSize = next;
  shell.closest(".nara-assistant-layer")?.setAttribute("data-nara-size", next);
  shell.querySelectorAll(".nara-window-controls button[data-size]").forEach((button) => {
    const active = button.dataset.size === next;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (persist) {
    try {
      localStorage.setItem(SIZE_KEY, next);
      localStorage.setItem(LEGACY_SIZE_KEY, next);
    } catch {
      // Storage is optional.
    }
  }
}

function ensureControls(shell) {
  const header = shell.querySelector(".nara-assistant-header");
  if (!header) return;
  let controls = header.querySelector(".nara-window-controls");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "nara-window-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Ukuran jendela Nara");
    ["compact", "medium", "full"].forEach((size) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.size = size;
      button.title = sizeLabel(size);
      button.setAttribute("aria-label", sizeLabel(size));
      button.innerHTML = icon(size);
      controls.append(button);
    });
    const resetButton = header.querySelector('button[title="Percakapan baru"]');
    header.insertBefore(controls, resetButton || null);
  }
  controls.querySelectorAll("button[data-size]").forEach((button) => {
    if (button.dataset.v131Bound === "true") return;
    button.dataset.v131Bound = "true";
    button.addEventListener("click", () => applySize(shell, button.dataset.size, true));
  });
}

function syncNara() {
  const shells = [...document.querySelectorAll(".nara-assistant-shell")];
  document.body.classList.toggle("nara-modal-open", shells.length > 0);
  shells.forEach((shell) => {
    ensureControls(shell);
    if (shell.dataset.v131Initialized !== "true") {
      shell.dataset.v131Initialized = "true";
      applySize(shell, storedSize(), false);
    } else {
      applySize(shell, shell.dataset.naraSize || "compact", false);
    }
  });
}

function decorateMobileToggle() {
  document.querySelectorAll(".sv124-mobile-toggle,.sn-mobile-toggle").forEach((button) => {
    if (button.dataset.v131PanelIcon === "true") return;
    button.dataset.v131PanelIcon = "true";
    button.setAttribute("aria-label", "Buka sidebar");
    button.setAttribute("title", "Buka sidebar");
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9-3 3 3 3"/></svg>';
  });
}

function sync() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    ensureStylesheet();
    removeDuplicateNaraSidebar();
    decorateMobileToggle();
    syncNara();
    document.documentElement.dataset.studioRecoveryV131 = RELEASE;
  });
}

new MutationObserver(sync).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class"],
});
window.addEventListener("resize", sync, { passive: true });
window.addEventListener("orientationchange", sync, { passive: true });
window.addEventListener("pageshow", sync, { passive: true });
sync();
