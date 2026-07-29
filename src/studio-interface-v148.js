const RELEASE = "studio-interface-v148-20260729";
const NARA_SIZE_KEY = "ngeblogging-nara-size-v148";
const NARA_VOICE_KEY = "ngeblogging-nara-auto-voice-v148";
const VALID_NARA_SIZES = new Set(["small", "medium", "full"]);
const REQUIRED_MENU_LABELS = [
  "Buat Post",
  "Ringkasan",
  "Posts",
  "Pages",
  "Tema",
  "Media",
  "Analitik",
  "Anggota",
  "Komentar",
  "Domain",
  "API Keys",
  "Pengaturan",
  "Keluar",
];
const MODE_LABELS = {
  application: "Aplikasi",
  phone: "Handphone",
  mobile: "Mobile",
  compact: "Perangkat kecil",
  tablet: "Tablet",
  desktop: "Situs desktop",
  laptop: "Laptop",
  computer: "Komputer",
};

let scheduledFrame = 0;
let observedAssistantMessages = new WeakSet();
let lastActiveMenu = null;

function safeStorageGet(key, fallback = "") {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Mode privat atau storage browser yang dibatasi tidak boleh merusak Studio.
  }
}

function buttonLabel(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function normalizedMode() {
  const root = document.documentElement;
  const responsive = root.dataset.studioResponsiveMode || "desktop";
  const variant = root.dataset.studioDeviceVariant || responsive;
  return MODE_LABELS[variant] ? variant : responsive;
}

function updateModeBadge(shell) {
  const top = shell.querySelector(":scope > .sn-main > .sn-top");
  if (!top) return;
  let badge = top.querySelector(":scope > .sn-device-mode-badge-v148");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "sn-device-mode-badge-v148";
    badge.setAttribute("aria-live", "polite");
    const actions = top.querySelector(":scope > .sn-top-actions");
    top.insertBefore(badge, actions || null);
  }
  const mode = normalizedMode();
  badge.dataset.mode = mode;
  badge.textContent = MODE_LABELS[mode] || "Responsif";
}

function synchronizeSidebar(shell) {
  const sidebar = shell.querySelector(":scope > .sn-side");
  const main = shell.querySelector(":scope > .sn-main");
  if (!sidebar || !main) return;

  const responsiveMode = document.documentElement.dataset.studioResponsiveMode || "desktop";
  const variant = document.documentElement.dataset.studioDeviceVariant || responsiveMode;
  const collapsed = sidebar.classList.contains("collapsed");
  shell.dataset.interfaceRelease = RELEASE;
  shell.dataset.responsiveMode = responsiveMode;
  shell.dataset.deviceVariant = variant;
  shell.dataset.sidebarState = collapsed ? "collapsed" : "expanded";
  shell.style.setProperty("--sn-active-sidebar-width", collapsed ? "var(--sn-v148-sidebar-closed)" : "var(--sn-v148-sidebar-open)");

  const allButtons = [
    sidebar.querySelector(":scope > .sn-new"),
    ...sidebar.querySelectorAll(":scope > nav > button"),
    ...sidebar.querySelectorAll(":scope > .sn-account-footer > button"),
  ].filter(Boolean);

  const present = new Set(allButtons.map(buttonLabel));
  shell.dataset.menuComplete = String(REQUIRED_MENU_LABELS.every((label) => present.has(label)));

  for (const button of allButtons) {
    const label = buttonLabel(button);
    if (!label) continue;
    button.hidden = false;
    button.disabled = false;
    button.removeAttribute("aria-hidden");
    button.setAttribute("title", label);
    button.setAttribute("aria-label", label);
    if (button.classList.contains("active")) {
      button.setAttribute("aria-current", "page");
      if (lastActiveMenu && lastActiveMenu !== button) lastActiveMenu.removeAttribute("aria-current");
      lastActiveMenu = button;
    } else {
      button.removeAttribute("aria-current");
    }
  }

  sidebar.querySelector(":scope > .sn-logo > b")?.setAttribute("title", "Ngeblogging");
  main.querySelectorAll(":scope > *").forEach((child) => child.style.setProperty("min-width", "0"));
  updateModeBadge(shell);
}

function iconForNaraSize(size) {
  if (size === "small") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="m3 3 6 6"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><path d="m21 21-6-6"/></svg>';
  }
  if (size === "medium") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
}

function setNaraSize(shell, requestedSize) {
  const size = VALID_NARA_SIZES.has(requestedSize) ? requestedSize : "small";
  shell.dataset.naraSize = size;
  shell.dataset.naraInterfaceRelease = RELEASE;
  document.documentElement.dataset.naraAssistantSize = size;
  document.body.classList.toggle("nara-fullscreen-open-v148", size === "full");
  safeStorageSet(NARA_SIZE_KEY, size);

  shell.querySelectorAll(".nara-size-controls-v147 button").forEach((button) => {
    const active = button.dataset.size === size;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function enhanceNaraSizeControls(shell) {
  const controls = shell.querySelector(":scope > .nara-assistant-header > .nara-size-controls-v147");
  if (!controls) return;
  controls.classList.add("nara-size-controls-v148");

  controls.querySelectorAll("button[data-size]").forEach((button) => {
    const size = button.dataset.size;
    if (!VALID_NARA_SIZES.has(size)) return;
    button.classList.add("nara-size-button-v148");
    button.innerHTML = iconForNaraSize(size);
    button.setAttribute("aria-label", size === "small" ? "Ukuran kecil" : size === "medium" ? "Ukuran medium" : "Layar penuh");
    button.setAttribute("title", size === "small" ? "Kecil" : size === "medium" ? "Medium" : "Layar penuh");
    if (!button.dataset.naraV148Bound) {
      button.dataset.naraV148Bound = RELEASE;
      button.addEventListener("click", () => setNaraSize(shell, size));
    }
  });

  const stored = safeStorageGet(NARA_SIZE_KEY, "small");
  if (!shell.dataset.naraV148Initialized) {
    shell.dataset.naraV148Initialized = RELEASE;
    setNaraSize(shell, stored);
  } else {
    setNaraSize(shell, shell.dataset.naraSize || stored);
  }
}

function autoVoiceEnabled() {
  return safeStorageGet(NARA_VOICE_KEY, "false") === "true";
}

function enhanceNaraVoice(shell) {
  const header = shell.querySelector(":scope > .nara-assistant-header");
  if (!header) return;
  let toggle = header.querySelector(":scope > .nara-auto-voice-v148");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nara-auto-voice-v148";
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    toggle.addEventListener("click", () => {
      const next = !autoVoiceEnabled();
      safeStorageSet(NARA_VOICE_KEY, String(next));
      toggle.classList.toggle("active", next);
      toggle.setAttribute("aria-pressed", String(next));
      toggle.title = next ? "Matikan balasan suara otomatis" : "Aktifkan balasan suara otomatis";
      if (!next) {
        try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
      }
    });
    const resetButton = header.querySelector(':scope > button[title="Percakapan baru"]');
    header.insertBefore(toggle, resetButton || null);
  }

  const enabled = autoVoiceEnabled();
  toggle.classList.toggle("active", enabled);
  toggle.setAttribute("aria-pressed", String(enabled));
  toggle.setAttribute("aria-label", "Balasan suara otomatis");
  toggle.title = enabled ? "Matikan balasan suara otomatis" : "Aktifkan balasan suara otomatis";

  shell.querySelectorAll(".nara-message.assistant").forEach((message) => {
    if (observedAssistantMessages.has(message) || !enabled) return;
    const speechButton = message.querySelector(".nara-speech-action-v147");
    const hasContent = message.querySelector(".nara-message-content")?.textContent?.trim();
    if (speechButton && hasContent) {
      observedAssistantMessages.add(message);
      setTimeout(() => speechButton.click(), 120);
    }
  });
}

function enhanceNara() {
  document.querySelectorAll(".nara-assistant-shell").forEach((shell) => {
    enhanceNaraSizeControls(shell);
    enhanceNaraVoice(shell);
    const intelligence = shell.querySelector(".nara-select.intelligence select");
    if (intelligence) {
      const labels = { light: "Instan", standard: "Sedang", high: "Tinggi", xhigh: "Maksimal" };
      [...intelligence.options].forEach((option) => {
        if (labels[option.value]) option.textContent = `${labels[option.value]}${option.value === "high" || option.value === "xhigh" ? " · Pro" : ""}`;
      });
    }
  });
}

function enrichAnalytics(shell) {
  const activeLabel = shell.querySelector(":scope > .sn-side nav > button.active span")?.textContent?.trim();
  if (activeLabel !== "Analitik") return;
  const page = shell.querySelector(":scope > .sn-main > .sn-view-pad");
  if (!page || page.querySelector(":scope > .sn-analytics-roadmap-v148")) return;

  const roadmap = document.createElement("section");
  roadmap.className = "sn-analytics-roadmap-v148";
  roadmap.innerHTML = `
    <header><div><small>PUSAT ANALITIK</small><h2>Data nyata, bukan angka contoh</h2></div><span>Siap dihubungkan</span></header>
    <div class="sn-analytics-roadmap-grid-v148">
      <article><b>Realtime</b><p>Pengunjung aktif, halaman yang dibuka, perangkat, negara, dan sumber trafik setelah collector produksi aktif.</p><small>Tanpa membuat angka palsu</small></article>
      <article><b>Konten & SEO</b><p>Impresi, klik, CTR, kata kunci, halaman masuk, performa Core Web Vitals, dan indeks mesin pencari.</p><small>Siap untuk integrasi Search Console</small></article>
      <article><b>Konversi</b><p>Tujuan, formulir, tombol, langganan, funnel, dan atribusi kampanye dengan persetujuan privasi.</p><small>Event dapat diaudit</small></article>
      <article><b>Laporan</b><p>Rentang waktu, perbandingan periode, filter segmen, ekspor CSV, serta akses anggota berdasarkan peran.</p><small>Kontrol workspace</small></article>
    </div>`;
  page.append(roadmap);
}

function enhanceThemeEditor(shell) {
  shell.querySelectorAll(".tn-code-modal,.tn-html-modal,[class*='code-modal']").forEach((modal) => {
    modal.dataset.splitPreview = "true";
    modal.setAttribute("aria-label", modal.getAttribute("aria-label") || "Editor HTML dan preview situs");
  });
}

function enhanceStudio() {
  scheduledFrame = 0;
  const shell = document.querySelector(".sn-shell");
  if (shell) {
    synchronizeSidebar(shell);
    enrichAnalytics(shell);
    enhanceThemeEditor(shell);
  }
  enhanceNara();
  document.documentElement.dataset.studioInterfaceRelease = RELEASE;
}

function schedule() {
  if (scheduledFrame) return;
  scheduledFrame = requestAnimationFrame(enhanceStudio);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-studio-responsive-mode", "data-studio-device-variant"],
});
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

schedule();

export {
  RELEASE,
  REQUIRED_MENU_LABELS,
  MODE_LABELS,
  enhanceStudio,
  setNaraSize,
};
