import "./studio-nara-theme-v194.css";

const RELEASE = "studio-nara-theme-v194-20260801";
let frame = 0;

function setAttributeIfChanged(node, name, value) {
  if (!node) return;
  const next = String(value);
  if (node.getAttribute(name) !== next) node.setAttribute(name, next);
}

function setBooleanIfChanged(node, name, value) {
  if (!node) return;
  const next = Boolean(value);
  if (node[name] !== next) node[name] = next;
}

function normalizeNaraV194() {
  const root = document.documentElement;
  root.dataset.studioNaraThemeV194 = RELEASE;

  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());
  const launcher = launchers[0];
  if (launcher) {
    launcher.dataset.naraLauncherV194 = "stable";
    launcher.style.setProperty("animation", "none", "important");
    launcher.style.setProperty("transition", "none", "important");
    launcher.style.setProperty("filter", "none", "important");
    launcher.style.setProperty("opacity", "1", "important");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  const mode = full ? "modal" : "nonmodal";
  layer.dataset.naraModeV194 = mode;
  shell.dataset.naraUiV194 = "single-row-controls";

  setAttributeIfChanged(layer, "aria-modal", String(full));
  setAttributeIfChanged(shell, "aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    setBooleanIfChanged(backdrop, "hidden", !full);
    setBooleanIfChanged(backdrop, "inert", !full);
    if (backdrop.tabIndex !== (full ? 0 : -1)) backdrop.tabIndex = full ? 0 : -1;
    setAttributeIfChanged(backdrop, "aria-hidden", String(!full));
  }

  const close = shell.querySelector('button[title="Tutup"],button[aria-label="Tutup Nara AI"],button[aria-label="Tutup Nara"]');
  if (close) {
    setBooleanIfChanged(close, "hidden", false);
    setBooleanIfChanged(close, "disabled", false);
    setAttributeIfChanged(close, "aria-label", "Tutup Nara AI");
    close.removeAttribute("aria-hidden");
  }

  if (!full) {
    document.body.style.removeProperty("overflow");
    root.style.removeProperty("overflow");
    for (const className of [
      "nara-fullscreen-open-v148",
      "nara-scroll-lock",
      "sm177-nara-full",
      "v179-nara-full",
    ]) {
      document.body.classList.remove(className);
      root.classList.remove(className);
    }
  }
}

function normalizeThemeV194() {
  const studio = document.querySelector(".tn-studio");
  if (!studio) return;
  studio.dataset.themeFlowV194 = "isolated-from-global-header";
  document.querySelectorAll(".tn-library>header,.tn-layout-studio-header,.tn-code-preview-pane>header").forEach((header) => {
    header.removeAttribute("inert");
    header.dataset.themeHeaderV194 = "normal-flow";
  });
}

function syncV194() {
  frame = 0;
  document.documentElement.dataset.studioNaraThemeV194 = RELEASE;
  normalizeNaraV194();
  normalizeThemeV194();
}

function scheduleV194() {
  if (!frame) frame = requestAnimationFrame(syncV194);
}

/* Deliberately do not observe aria-modal/hidden/class. Older recovery layers
   may update those attributes; observing them again would create the repeated
   mutation/repaint loop that looked like Nara was blinking. */
new MutationObserver(scheduleV194).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["data-nara-size", "data-studio-responsive-mode", "data-studio-handheld"],
});

for (const name of ["resize", "orientationchange", "pageshow"]) {
  window.addEventListener(name, scheduleV194, { passive: true });
}
window.visualViewport?.addEventListener("resize", scheduleV194, { passive: true });

syncV194();

export { RELEASE, normalizeNaraV194, normalizeThemeV194, syncV194 };
