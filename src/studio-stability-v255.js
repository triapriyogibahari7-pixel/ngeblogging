export const RELEASE = "studio-stability-v255-20260804";
let frame = 0;

function labelFor(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function stabilizeSidebar() {
  const root = document.documentElement;
  const shell = document.querySelector(".sn-shell");
  const side = document.getElementById("ngeblogging-studio-sidebar");
  if (!shell || !side) return;

  shell.dataset.studioStabilityV255 = RELEASE;
  const logo = side.querySelector(".sn-logo-mark");
  if (logo) {
    logo.hidden = false;
    logo.removeAttribute("hidden");
    logo.removeAttribute("inert");
    logo.removeAttribute("aria-hidden");
    const letter = logo.querySelector("strong");
    if (letter) letter.textContent = "n";
  }

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    const label = labelFor(button);
    if (!label) return;
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });

  const backdrop = shell.querySelector(":scope > .sn-side-backdrop");
  if (backdrop) {
    backdrop.style.setProperty("background", "transparent", "important");
    backdrop.style.setProperty("background-color", "transparent", "important");
    backdrop.style.setProperty("backdrop-filter", "none", "important");
    backdrop.style.setProperty("-webkit-backdrop-filter", "none", "important");
    backdrop.style.setProperty("filter", "none", "important");
  }

  const avatar = shell.querySelector(".sn-avatar");
  if (avatar) {
    avatar.hidden = false;
    avatar.removeAttribute("hidden");
    avatar.removeAttribute("inert");
    avatar.removeAttribute("aria-hidden");
    avatar.setAttribute("aria-label", "Buka menu profil");
  }

  root.dataset.studioStabilityV255 = RELEASE;
}

function stabilizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.style.setProperty("position", "fixed", "important");
    launcher.style.setProperty("animation", "none", "important");
    launcher.style.setProperty("transition", "none", "important");
    launcher.style.setProperty("filter", "none", "important");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const panel = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !panel) return;
  const size = ["small", "medium", "full"].includes(panel.dataset.naraSize)
    ? panel.dataset.naraSize
    : "small";
  const full = size === "full";
  layer.dataset.stabilityV255 = RELEASE;
  layer.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop && !full) {
    backdrop.hidden = true;
    backdrop.tabIndex = -1;
    backdrop.setAttribute("aria-hidden", "true");
  }

  if (!full) {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.documentElement.style.removeProperty("overflow");
  }

  const attachmentMenu = layer.querySelector(".nara-attachment-menu");
  if (attachmentMenu) {
    attachmentMenu.hidden = false;
    attachmentMenu.removeAttribute("hidden");
    attachmentMenu.removeAttribute("inert");
    attachmentMenu.style.setProperty("pointer-events", "auto", "important");
  }
}

function stabilizeOperationalSurfaces() {
  document.querySelectorAll([
    ".sn-main",
    ".sn-main>*",
    ".sn-view-pad",
    ".sn-view-pad>*",
    ".sv124-page",
    ".sv124-page>*",
    ".tn-studio",
    ".tn-studio>*",
    ".ce-app",
    ".ce-app>*",
  ].join(",")).forEach((node) => {
    node.style.setProperty("min-width", "0");
    node.style.setProperty("max-width", "100%");
  });
}

function sync() {
  frame = 0;
  stabilizeSidebar();
  stabilizeNara();
  stabilizeOperationalSurfaces();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  for (const eventName of ["pageshow", "resize", "orientationchange", "online", "ngeblogging:studio-device-mode-change"]) {
    window.addEventListener(eventName, schedule, { passive: true });
  }
  document.addEventListener("click", () => requestAnimationFrame(schedule), { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();
}

export { schedule as scheduleStudioStabilityV255, sync as syncStudioStabilityV255 };
