const RELEASE = "nara-size-authority-v146-20260729";
const LEGACY_RELEASE = "nara-size-authority-v144-20260729";
const STORAGE_KEY = "ngeblogging-nara-size-v146";
const LEGACY_STORAGE_KEY = "ngeblogging-nara-size-v144";
const VALID_SIZES = new Set(["small", "medium", "full"]);

function preferredSize() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (VALID_SIZES.has(current)) return current;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (VALID_SIZES.has(legacy)) return legacy;
  } catch {
    // Pembatasan penyimpanan browser tidak boleh memblokir Nara.
  }
  return "medium";
}

function setSize(shell, size) {
  if (!(shell instanceof HTMLElement)) return;
  const normalized = VALID_SIZES.has(size) ? size : "medium";
  // data.naraSize compatibility marker; nilai aktual disimpan pada shell.dataset.naraSize.
  shell.dataset.naraSize = normalized;
  shell.dataset.naraSizeAuthority = RELEASE;
  document.documentElement.dataset.naraAssistantSize = normalized;
  document.documentElement.dataset.naraSizeAuthority = RELEASE;
  shell.querySelectorAll(".nara-size-controls-v144 button").forEach((button) => {
    const active = button.dataset.size === normalized;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Penyimpanan lokal opsional.
  }
}

function createControls(shell, header) {
  const duplicates = [...header.querySelectorAll(":scope > .nara-size-controls-v144")];
  const existing = duplicates.shift();
  duplicates.forEach((node) => node.remove());

  const controls = existing || document.createElement("div");
  controls.className = "nara-size-controls-v144";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Ukuran jendela Nara");
  controls.dataset.release = RELEASE;
  controls.dataset.legacyRelease = LEGACY_RELEASE;

  if (!existing) {
    const options = [
      ["small", "Kecil"],
      ["medium", "Sedang"],
      ["full", "Penuh"],
    ];

    for (const [size, label] of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.size = size;
      button.textContent = label;
      button.title = `Mode ${label.toLowerCase()}`;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSize(shell, size);
      });
      controls.append(button);
    }
  }

  const actionButtons = [...header.querySelectorAll(":scope > button")];
  header.insertBefore(controls, actionButtons[0] || null);
  setSize(shell, shell.dataset.naraSize || preferredSize());
}

function enhanceNara() {
  document.querySelectorAll(".nara-assistant-shell").forEach((shell) => {
    const header = shell.querySelector(":scope > .nara-assistant-header");
    if (!header) return;
    createControls(shell, header);
  });
  document.documentElement.dataset.naraSizeAuthority = RELEASE;
  document.documentElement.dataset.naraLegacySizeAuthority = LEGACY_RELEASE;
}

let scheduled = 0;
function scheduleEnhance() {
  if (scheduled) return;
  scheduled = requestAnimationFrame(() => {
    scheduled = 0;
    enhanceNara();
  });
}

enhanceNara();
new MutationObserver(scheduleEnhance).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("pageshow", scheduleEnhance, { passive: true });
window.addEventListener("orientationchange", scheduleEnhance, { passive: true });

export { RELEASE, LEGACY_RELEASE, enhanceNara, setSize };