const RELEASE = "nara-size-authority-v144-20260729";
const STORAGE_KEY = "ngeblogging-nara-size-v144";
const VALID_SIZES = new Set(["small", "medium", "full"]);

function preferredSize() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (VALID_SIZES.has(stored)) return stored;
  } catch {
    // Pembatasan penyimpanan browser tidak boleh memblokir Nara.
  }
  return matchMedia?.("(max-width:760px)")?.matches ? "medium" : "medium";
}

function setSize(shell, size) {
  const normalized = VALID_SIZES.has(size) ? size : "medium";
  // data.naraSize compatibility marker; nilai aktual disimpan pada shell.dataset.naraSize.
  shell.dataset.naraSize = normalized;
  document.documentElement.dataset.naraAssistantSize = normalized;
  shell.querySelectorAll(".nara-size-controls-v144 button").forEach((button) => {
    const active = button.dataset.size === normalized;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  try { localStorage.setItem(STORAGE_KEY, normalized); } catch { /* noop */ }
}

function createControls(shell, header) {
  if (header.querySelector(".nara-size-controls-v144")) {
    setSize(shell, shell.dataset.naraSize || preferredSize());
    return;
  }

  const controls = document.createElement("div");
  controls.className = "nara-size-controls-v144";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Ukuran jendela Nara");
  controls.dataset.release = RELEASE;

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

  const actionButtons = header.querySelectorAll(":scope > button");
  header.insertBefore(controls, actionButtons[0] || null);
  setSize(shell, shell.dataset.naraSize || preferredSize());
}

function enhanceNara() {
  document.querySelectorAll(".nara-assistant-shell").forEach((shell) => {
    const header = shell.querySelector(".nara-assistant-header");
    if (!header) return;
    shell.dataset.naraSizeAuthority = RELEASE;
    createControls(shell, header);
  });
  document.documentElement.dataset.naraSizeAuthority = RELEASE;
}

enhanceNara();
new MutationObserver(enhanceNara).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("pageshow", enhanceNara, { passive: true });

export { RELEASE, enhanceNara, setSize };
