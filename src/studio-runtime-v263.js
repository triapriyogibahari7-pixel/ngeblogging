export const RELEASE = "studio-runtime-v263-20260804";

let frame = 0;
let layoutPopover = null;

function root() {
  return document.documentElement;
}

function currentFamily() {
  const mode = String(root().dataset.studioDeviceMode || "").toLowerCase();
  if (mode === "small" || mode === "large") return mode;
  const responsive = String(root().dataset.studioResponsiveMode || "").toLowerCase();
  if (["application", "phone", "mobile", "compact"].includes(responsive)) return "small";
  if (["tablet", "desktop"].includes(responsive)) return "large";
  const viewport = Math.min(document.documentElement.clientWidth || innerWidth || 1, window.visualViewport?.width || innerWidth || 1);
  return viewport <= 760 ? "small" : "large";
}

function syncLogo() {
  const side = document.getElementById("ngeblogging-studio-sidebar");
  const logo = side?.querySelector(".sn-logo-mark");
  if (!side || !logo) return;
  const family = currentFamily();
  const expanded = family === "small" ? side.classList.contains("mobile-open") : !side.classList.contains("collapsed");
  logo.setAttribute("role", "button");
  logo.setAttribute("tabindex", "0");
  logo.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
  logo.setAttribute("aria-expanded", String(expanded));
  logo.setAttribute("aria-label", family === "small" ? "Tutup menu Studio" : expanded ? "Ciutkan menu Studio" : "Perluas menu Studio");
  logo.setAttribute("title", logo.getAttribute("aria-label"));
  logo.dataset.studioToggleV263 = RELEASE;
  const strong = logo.querySelector("strong");
  if (strong) strong.textContent = "n";
  const brand = side.querySelector(".sn-logo > b");
  if (brand) brand.textContent = "Ngeblogging";
}

function syncNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const panel = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !panel) return;
  const size = ["small", "medium", "full"].includes(panel.dataset.naraSize) ? panel.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.naraV263Modal = String(full);
  layer.dataset.naraV263Size = size;
  layer.setAttribute("aria-modal", String(full));
  panel.dataset.naraRuntimeV263 = RELEASE;

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    backdrop.tabIndex = full ? 0 : -1;
  }

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.documentElement.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("touch-action");
  }

  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.hidden = false;
    launcher.removeAttribute("aria-hidden");
    launcher.dataset.naraLauncherV263 = "viewport-fixed";
  }
}

function profileMode() {
  const requested = String(root().dataset.studioAccountViewV189 || root().dataset.studioAccountViewV263 || "settings").toLowerCase();
  return requested === "profile" ? "profile" : "settings";
}

function syncAccountView() {
  const grid = document.querySelector(".sn-settings-grid");
  if (!grid) return;
  const view = grid.closest(".sn-view-pad") || grid.parentElement;
  if (!view) return;
  const mode = profileMode();
  root().dataset.studioAccountViewV263 = mode;
  view.classList.toggle("sn-account-view-profile-v263", mode === "profile");
  view.classList.toggle("sn-account-view-settings-v263", mode === "settings");
  view.dataset.accountViewV263 = mode;

  const title = view.querySelector(".sn-page-title h1");
  const description = view.querySelector(".sn-page-title p");
  const save = view.querySelector(".sn-save-settings");
  if (mode === "profile") {
    if (title) title.textContent = "Profil";
    if (description) description.textContent = "Identitas, avatar, biografi, website, bahasa, dan zona waktu akun.";
    if (save) {
      const label = [...save.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
      if (label) label.textContent = " Simpan profil";
    }
  } else {
    if (title) title.textContent = "Pengaturan";
    if (description) description.textContent = "Nama situs, deskripsi, bahasa, zona waktu, serta konfigurasi workspace aktif.";
    if (save) {
      const label = [...save.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
      if (label) label.textContent = " Simpan pengaturan";
    }
  }
}

function syncProfileMenu() {
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!menu) return;
  menu.dataset.profileMenuV263 = "distinct-actions";
  const labels = {
    profile: ["Profil & avatar", "Identitas, avatar, dan biografi"],
    settings: ["Pengaturan situs", "Bahasa, zona waktu, dan workspace"],
    "add-site": ["Tambahkan situs", "Buat atau pilih situs lain"],
    "view-site": ["Lihat situs", "Buka situs aktif"],
    install: ["Dapatkan aplikasi", "Pasang PWA pada perangkat ini"],
    logout: ["Keluar", "Akhiri sesi pada perangkat ini"],
  };
  menu.querySelectorAll("button[data-action]").forEach((button) => {
    const copy = labels[button.dataset.action];
    if (!copy) return;
    const span = button.querySelector("span");
    const small = button.querySelector("small");
    if (span) span.textContent = copy[0];
    if (small) small.textContent = copy[1];
  });
}

function lineCount(value) {
  return Math.min(10_000, Math.max(1, String(value || "").split("\n").length));
}

function updateCodeGutter(textarea, gutter) {
  if (!textarea?.isConnected || !gutter?.isConnected) return;
  const count = lineCount(textarea.value);
  const signature = `${count}:${textarea.clientHeight}:${textarea.offsetTop}`;
  if (gutter.dataset.signature !== signature) {
    gutter.textContent = Array.from({ length: count }, (_, index) => String(index + 1)).join("\n");
    gutter.dataset.signature = signature;
  }
  gutter.style.top = `${textarea.offsetTop}px`;
  gutter.style.height = `${textarea.clientHeight}px`;
  gutter.scrollTop = textarea.scrollTop;
  gutter.dataset.maxLine = String(count);
}

function syncCodeGutters() {
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    const pane = textarea.closest(".tn-code-pane");
    if (!pane) return;
    let gutter = pane.querySelector(":scope > .tn-code-gutter-v263");
    if (!gutter) {
      gutter = document.createElement("div");
      gutter.className = "tn-code-gutter-v263";
      gutter.setAttribute("aria-hidden", "true");
      pane.append(gutter);
    }
    if (!textarea.dataset.codeGutterV263) {
      textarea.dataset.codeGutterV263 = RELEASE;
      textarea.addEventListener("scroll", () => updateCodeGutter(textarea, gutter), { passive: true });
      textarea.addEventListener("input", () => updateCodeGutter(textarea, gutter));
    }
    updateCodeGutter(textarea, gutter);
  });
}

function removeLayoutPopover() {
  layoutPopover?.remove();
  layoutPopover = null;
}

function clickThemeButton(pattern, selector) {
  const button = [...document.querySelectorAll(selector)].find((node) => pattern.test(node.textContent || ""));
  button?.click();
  return Boolean(button);
}

function openLayoutPopover(button) {
  removeLayoutPopover();
  const rect = button.getBoundingClientRect();
  const label = button.textContent?.replace(/^\s*\d+\s*/, "").trim() || "Area tata letak";
  const popover = document.createElement("div");
  popover.className = "tn-layout-popover-v263";
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", `Pilihan ${label}`);
  popover.innerHTML = `
    <header><div><small>AREA TATA LETAK</small><b>${label.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</b></div><button type="button" data-close aria-label="Tutup">×</button></header>
    <button type="button" data-open-widgets><span><b>Pilih dari 26 widget</b><small>Aktifkan, nonaktifkan, atur area, judul, dan urutan</small></span><strong>›</strong></button>
    <button type="button" data-open-code><span><b>Custom HTML / CSS / JavaScript</b><small>Buka editor kode tema dan preview langsung</small></span><strong>›</strong></button>
    <button type="button" data-open-preview><span><b>Preview perangkat</b><small>Lihat hasil pada aplikasi, handphone, tablet, laptop, desktop, dan komputer</small></span><strong>›</strong></button>`;
  document.body.append(popover);
  layoutPopover = popover;

  const width = Math.min(310, window.innerWidth - 24);
  const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12));
  const preferredTop = rect.bottom + 8;
  const top = preferredTop + 300 < window.innerHeight ? preferredTop : Math.max(12, rect.top - 320);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;

  popover.addEventListener("click", (event) => {
    const action = event.target.closest("button")?.dataset;
    if (!action) return;
    if (action.close !== undefined) removeLayoutPopover();
    if (action.openWidgets !== undefined) {
      removeLayoutPopover();
      document.querySelector(".tn-layout-studio-header button")?.click();
    }
    if (action.openCode !== undefined) {
      removeLayoutPopover();
      clickThemeButton(/Edit HTML/i, ".tn-hero-actions button,.tn-command nav button");
    }
    if (action.openPreview !== undefined) {
      removeLayoutPopover();
      clickThemeButton(/^\s*Preview\s*$/i, ".tn-command nav button");
    }
  });
  popover.querySelector("button")?.focus({ preventScroll: true });
}

function sync() {
  frame = 0;
  root().dataset.studioRuntimeV263 = RELEASE;
  syncLogo();
  syncNara();
  syncAccountView();
  syncProfileMenu();
  syncCodeGutters();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const settings = event.target.closest?.(".sn-account-settings-v135");
    if (settings) {
      root().dataset.studioAccountViewV189 = "settings";
      root().dataset.studioAccountViewV263 = "settings";
      requestAnimationFrame(schedule);
    }

    const area = event.target.closest?.(".tn-layout-area");
    if (area) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      openLayoutPopover(area);
      return;
    }

    const naraClose = event.target.closest?.('.nara-assistant-header button[title="Tutup"]');
    if (naraClose) {
      const listening = document.querySelector(".nara-composer-tools > button.listening");
      if (listening) listening.click();
      try { window.speechSynthesis?.cancel?.(); } catch { /* noop */ }
      requestAnimationFrame(schedule);
    }

    if (layoutPopover && !event.target.closest?.(".tn-layout-popover-v263")) removeLayoutPopover();
    requestAnimationFrame(schedule);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") removeLayoutPopover();
    requestAnimationFrame(schedule);
  }, true);

  new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.type === "attributes")) schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class",
      "hidden",
      "data-nara-size",
      "data-studio-device-mode",
      "data-studio-responsive-mode",
      "data-studio-account-view-v189",
    ],
  });

  for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
    window.addEventListener(eventName, schedule, { passive: true });
  }
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  schedule();
}
