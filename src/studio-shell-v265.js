import { currentStudioDeviceMode, currentStudioResponsiveMode } from "./studio-device-mode-v140.js";

export const RELEASE = "studio-shell-v265-20260804";

let frame = 0;

function root() {
  return document.documentElement;
}

function shell() {
  return document.querySelector(".sn-shell");
}

function sidebar() {
  return document.getElementById("ngeblogging-studio-sidebar");
}

function syncFamilyClass() {
  const mode = currentStudioDeviceMode();
  const responsive = currentStudioResponsiveMode();
  const html = root();
  html.classList.toggle("studio-v265-large", mode === "large");
  html.classList.toggle("studio-v265-small", mode === "small");
  html.dataset.studioV265Family = mode;
  html.dataset.studioV265Responsive = responsive;
  html.dataset.studioShellV265 = RELEASE;
  shell()?.setAttribute("data-shell-v265", RELEASE);
}

function syncNavigation() {
  const side = sidebar();
  if (!side) return;
  side.hidden = false;
  side.removeAttribute("hidden");
  side.removeAttribute("aria-hidden");
  side.removeAttribute("inert");

  const logo = side.querySelector(".sn-logo-mark");
  if (logo) {
    logo.dataset.v265SingleLogo = "true";
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");
    logo.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    const small = currentStudioDeviceMode() === "small";
    const expanded = small ? side.classList.contains("mobile-open") : !side.classList.contains("collapsed");
    logo.setAttribute("aria-expanded", String(expanded));
    logo.setAttribute("aria-label", small ? (expanded ? "Tutup menu Studio" : "Buka menu Studio") : (expanded ? "Ciutkan menu Studio" : "Perluas menu Studio"));
    logo.setAttribute("title", logo.getAttribute("aria-label"));
    const letter = logo.querySelector("strong");
    if (letter) letter.textContent = "n";
  }

  const brand = side.querySelector(".sn-logo > b");
  if (brand) brand.textContent = "Ngeblogging";

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    button.hidden = false;
    button.removeAttribute("hidden");
    button.removeAttribute("aria-hidden");
    button.removeAttribute("inert");
    if (button.classList.contains("sn-account-logout-v135")) return;
    button.disabled = false;
  });
}

function accountMode() {
  const requested = String(root().dataset.studioAccountViewV189 || "settings").toLowerCase();
  return requested === "profile" ? "profile" : "settings";
}

function syncAccountView() {
  const grid = document.querySelector(".sn-settings-grid");
  if (!grid) return;
  const view = grid.closest(".sn-view-pad") || grid.parentElement;
  if (!view) return;
  const mode = accountMode();
  view.classList.toggle("sn-account-view-profile-v263", mode === "profile");
  view.classList.toggle("sn-account-view-settings-v263", mode === "settings");
  view.dataset.accountViewV265 = mode;

  const title = view.querySelector(".sn-page-title h1");
  const description = view.querySelector(".sn-page-title p");
  if (mode === "profile") {
    if (title) title.textContent = "Profil";
    if (description) description.textContent = "Identitas, avatar, biografi, website, bahasa, dan zona waktu akun.";
  } else {
    if (title) title.textContent = "Pengaturan";
    if (description) description.textContent = "Nama situs, deskripsi, bahasa, zona waktu, serta konfigurasi workspace aktif.";
  }
}

function lineCount(value) {
  return Math.min(10_000, Math.max(1, String(value || "").split("\n").length));
}

function updateGutter(textarea, gutter) {
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
    let gutter = pane.querySelector(":scope > .tn-code-gutter-v265");
    if (!gutter) {
      gutter = document.createElement("div");
      gutter.className = "tn-code-gutter-v265";
      gutter.setAttribute("aria-hidden", "true");
      pane.append(gutter);
    }
    if (!textarea.dataset.codeGutterV265) {
      textarea.dataset.codeGutterV265 = RELEASE;
      textarea.addEventListener("scroll", () => updateGutter(textarea, gutter), { passive: true });
      textarea.addEventListener("input", () => updateGutter(textarea, gutter));
    }
    updateGutter(textarea, gutter);
  });
}

function syncNaraState() {
  const launcher = document.querySelector(".nara-floating-button");
  const layer = document.querySelector(".nara-assistant-layer");
  const panel = layer?.querySelector(".nara-assistant-shell");
  if (!panel || !layer) {
    if (launcher) launcher.dataset.v265Position = "fixed-corner";
    return;
  }
  const size = ["small", "medium", "full"].includes(panel.dataset.naraSize) ? panel.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.naraV265Size = size;
  layer.dataset.naraV265Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    backdrop.tabIndex = full ? 0 : -1;
  }
  if (!full) {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.documentElement.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("touch-action");
  }
  panel.querySelector(".nara-attachment-menu")?.setAttribute("data-v265-placement", "above-composer");
}

function sync() {
  frame = 0;
  syncFamilyClass();
  syncNavigation();
  syncAccountView();
  syncCodeGutters();
  syncNaraState();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".sn-account-settings-v135")) {
      root().dataset.studioAccountViewV189 = "settings";
    }
    requestAnimationFrame(schedule);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") requestAnimationFrame(schedule);
  }, true);

  new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.attributeName === "class" || record.attributeName === "data-nara-size" || record.attributeName === "data-studio-account-view-v189")) schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-nara-size", "data-studio-account-view-v189"],
  });

  for (const eventName of ["pageshow", "resize", "orientationchange", "online"] ) {
    window.addEventListener(eventName, schedule, { passive: true });
  }
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  schedule();
}
