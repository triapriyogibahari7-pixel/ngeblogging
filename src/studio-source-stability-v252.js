export const RELEASE = "studio-source-stability-v252-20260804";

const DUPLICATE_CONTROLS = [
  "#ngeblogging-studio-chrome-v244",
  ".sn-sidebar-edge-toggle-v147",
  ".v227-sidebar-fab",
  ".studio-external-sidebar-toggle",
  "[data-v173-collapse-toggle]",
  "[data-v187-sidebar-toggle]",
  "[data-v208-sidebar-toggle]",
  "[data-v223-sidebar-toggle]",
  "[data-v229-sidebar-toggle]",
  "[data-studio-mode-badge]",
  "[data-device-mode-badge]",
  ".studio-device-mode-badge",
  ".v225-mode-badge",
  ".sn-device-mode-badge-v148",
].join(",");

let frame = 0;

function family() {
  const html = document.documentElement;
  const explicit = String(html.dataset.studioV251Family || html.dataset.studioV250Family || "").toLowerCase();
  if (explicit === "small" || explicit === "large") return explicit;
  const responsive = String(html.dataset.studioResponsiveMode || "").toLowerCase();
  if (["application", "phone", "mobile", "compact", "small"].includes(responsive)) return "small";
  if (["tablet", "desktop", "laptop", "computer", "large"].includes(responsive)) return "large";
  const layout = Number(document.documentElement.clientWidth || window.innerWidth || 0);
  const visual = Number(window.visualViewport?.width || layout || 0);
  return Math.min(layout || visual || 1, visual || layout || 1) <= 760 ? "small" : "large";
}

function sidebar() {
  return document.getElementById("ngeblogging-studio-sidebar");
}

function reactToggle() {
  return document.querySelector(".sn-shell .sn-sidebar-toggle");
}

function currentState(side, mode) {
  if (!side) return mode === "small" ? "closed" : "expanded";
  return mode === "small"
    ? (side.classList.contains("mobile-open") ? "open" : "closed")
    : (side.classList.contains("collapsed") ? "collapsed" : "expanded");
}

function removeDuplicateControls() {
  document.querySelectorAll(DUPLICATE_CONTROLS).forEach((node) => node.remove());
}

function normalizeNativeControls() {
  const shell = document.querySelector(".sn-shell");
  const side = sidebar();
  if (!shell || !side) return;
  const mode = family();
  const state = currentState(side, mode);
  const html = document.documentElement;

  html.dataset.studioSourceStabilityV252 = RELEASE;
  html.dataset.studioV252Family = mode;
  html.dataset.studioV252Sidebar = state;
  shell.dataset.studioSourceStabilityV252 = RELEASE;

  const logo = side.querySelector(".sn-logo-mark");
  if (logo) {
    logo.hidden = false;
    logo.removeAttribute("inert");
    logo.removeAttribute("aria-hidden");
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");
    logo.setAttribute("aria-controls", side.id);
    logo.setAttribute("aria-expanded", String(mode === "small" ? state === "open" : state === "expanded"));
    logo.setAttribute("aria-label", mode === "small"
      ? (state === "open" ? "Tutup menu Studio" : "Buka menu Studio")
      : (state === "expanded" ? "Ciutkan menu Studio" : "Perluas menu Studio"));
    logo.setAttribute("title", logo.getAttribute("aria-label"));
    const letter = logo.querySelector("strong");
    if (letter) letter.textContent = "n";
  }

  const brand = side.querySelector(".sn-logo > b");
  if (brand) brand.textContent = "Ngeblogging";

  const avatar = shell.querySelector(".sn-avatar");
  if (avatar) {
    avatar.hidden = false;
    avatar.removeAttribute("inert");
    avatar.removeAttribute("aria-hidden");
    avatar.setAttribute("aria-label", "Buka menu profil");
  }

  side.querySelector(".sn-side-close")?.setAttribute("aria-hidden", "true");
}

function normalizeBackdrop() {
  const mode = family();
  const side = sidebar();
  const open = mode === "small" && side?.classList.contains("mobile-open");
  document.querySelectorAll(".sn-side-backdrop,.sn-sidebar-backdrop,[data-legacy-sidebar-backdrop]").forEach((backdrop) => {
    backdrop.style.setProperty("background", "transparent", "important");
    backdrop.style.setProperty("filter", "none", "important");
    backdrop.style.setProperty("backdrop-filter", "none", "important");
    backdrop.style.setProperty("-webkit-backdrop-filter", "none", "important");
    backdrop.style.setProperty("opacity", "1", "important");
    if (!open) {
      backdrop.style.setProperty("display", "none", "important");
      backdrop.style.setProperty("pointer-events", "none", "important");
    }
  });
  if (!open) document.body.classList.remove("sn-mobile-sidebar-open");
}

function normalizeNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const panel = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !panel) return;
  const size = ["small", "medium", "full"].includes(panel.dataset.naraSize) ? panel.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.v252Size = size;
  layer.dataset.v252Interaction = full ? "modal" : "nonmodal";
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
  }
}

function sync() {
  frame = 0;
  removeDuplicateControls();
  normalizeNativeControls();
  normalizeBackdrop();
  normalizeNara();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function activateNativeLogo(event) {
  const logo = event.target?.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (!logo) return false;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  reactToggle()?.click();
  requestAnimationFrame(schedule);
  return true;
}

if (typeof document !== "undefined") {
  // Window capture runs before the historical document capture handlers. Only the
  // native logo is intercepted, so React remains the owner of the sidebar state.
  window.addEventListener("click", (event) => activateNativeLogo(event), true);
  window.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target?.matches?.("#ngeblogging-studio-sidebar .sn-logo-mark")) {
      activateNativeLogo(event);
    }
    if (event.key === "Escape") {
      const side = sidebar();
      if (family() === "small" && side?.classList.contains("mobile-open")) reactToggle()?.click();
    }
  }, true);

  new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.type === "attributes")) schedule();
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      "class", "style", "hidden", "inert", "aria-hidden", "data-nara-size",
      "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-device-variant",
      "data-studio-v250-family", "data-studio-v251-family",
    ],
  });

  for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
    window.addEventListener(eventName, schedule, { passive: true });
  }
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  schedule();
}
