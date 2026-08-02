import "./studio-production-v205.css";

const RELEASE = "studio-production-v205-20260802";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;
let startupTimer = 0;
let startupAttempts = 0;

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function physicalShortEdge() {
  try {
    const values = [
      Number(screen?.width || 0),
      Number(screen?.height || 0),
      Number(visualViewport?.width || 0),
      Number(visualViewport?.height || 0),
    ].filter((value) => Number.isFinite(value) && value > 0);
    return values.length ? Math.min(...values) : 0;
  } catch {
    return 0;
  }
}

function mobileLike() {
  const root = document.documentElement;
  const family = root.dataset.studioResponsiveMode
    || root.dataset.studioResponsiveFamilyV193
    || root.dataset.studioResponsiveFamily
    || "";
  let cssWidth = 0;
  try {
    cssWidth = Number.parseFloat(getComputedStyle(root).getPropertyValue("--studio-physical-width")) || 0;
  } catch {
    cssWidth = 0;
  }
  return root.dataset.studioMobileV204 === "true"
    || root.dataset.studioMobileV203 === "true"
    || root.dataset.studioPhysicalMobileV193 === "true"
    || root.dataset.studioPhysicalMobileV191 === "true"
    || root.dataset.studioHandheld === "true"
    || root.dataset.studioDesktopSitePhone === "true"
    || MOBILE_FAMILIES.has(family)
    || navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || (physicalShortEdge() > 0 && physicalShortEdge() <= 760)
    || (cssWidth > 0 && cssWidth <= 760)
    || window.innerWidth <= 760;
}

function normalizeTheme() {
  const studio = document.querySelector(".tn-studio");
  if (!studio) return;
  studio.dataset.v205Theme = "single-actions-readable-layout";

  const hero = studio.querySelector(".tn-hero-actions");
  if (hero) {
    const layout = hero.querySelector('button[data-v202-theme-action="layout"],button.v202-theme-layout-button');
    const customize = [...hero.querySelectorAll(":scope > button")].find((node) => /sesuaikan/i.test(node.textContent || ""));
    const code = [...hero.querySelectorAll(":scope > button")].find((node) => /edit\s*(kode|html|css|javascript|java\s*script)/i.test(node.textContent || ""));
    const site = [...hero.querySelectorAll(":scope > button")].find((node) => /lihat situs|buka situs/i.test(node.textContent || ""));
    const widget = [...hero.querySelectorAll(":scope > button")].find((node) => /widget/i.test(node.textContent || ""));

    for (const button of [customize, layout, code, site]) {
      if (!button) continue;
      button.hidden = false;
      button.disabled = false;
      button.removeAttribute("hidden");
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
    }
    if (widget && widget !== layout) {
      widget.dataset.v205HeroWidget = "moved-to-layout-map";
      widget.setAttribute("aria-hidden", "true");
      widget.tabIndex = -1;
    }
    if (layout) {
      layout.dataset.v205ThemeAction = "layout";
      layout.setAttribute("aria-label", "Edit Tata Letak");
      layout.title = "Edit Tata Letak";
    }
    if (code) {
      code.dataset.v205ThemeAction = "code";
      code.setAttribute("aria-label", "Edit Kode HTML CSS JavaScript");
      code.title = "Edit Kode HTML, CSS, dan JavaScript";
    }
  }

  const map = studio.querySelector(".tn-layout-studio");
  if (map) {
    map.dataset.v205Layout = mobileLike() ? "physical-mobile" : "desktop";
    map.removeAttribute("inert");
  }
  const codeWorkspace = document.querySelector(".tn-code-workspace");
  if (codeWorkspace) codeWorkspace.dataset.v205Code = mobileLike() ? "stacked" : "split";
}

function normalizeLogoAndDrawer() {
  const root = document.documentElement;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const main = document.querySelector(".sn-main");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));

  root.dataset.studioDrawerV205 = open ? "open" : "closed";
  for (const node of [sidebar, main, toggle]) {
    node?.removeAttribute("inert");
    node?.removeAttribute("aria-hidden");
  }
  if (sidebar && open) {
    sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
      node.removeAttribute("inert");
      node.removeAttribute("aria-hidden");
      setImportant(node, "pointer-events", "auto");
    });
  }
  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
    setImportant(backdrop, "background", "transparent");
    setImportant(backdrop, "filter", "none");
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
  }
  if (main) {
    setImportant(main, "filter", "none");
    setImportant(main, "opacity", "1");
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v205Launcher = "stable";
    for (const property of ["animation", "transition", "filter", "transform"]) setImportant(launcher, property, "none");
    setImportant(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v205Mode = full ? "modal" : "nonmodal";
  shell.dataset.v205Controls = "native-plus-menu-compact";
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
  }

  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "background", "transparent");
    setImportant(layer, "backdrop-filter", "none");
    setImportant(layer, "-webkit-backdrop-filter", "none");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  } else {
    layer.style.removeProperty("pointer-events");
  }

  const close = shell.querySelector('button[title="Tutup"],button[aria-label="Tutup Nara AI"],button[aria-label="Tutup Nara"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("hidden");
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
  }

  shell.querySelectorAll([
    ".nara-size-controls-v147 button",
    ".nara-auto-voice-v148",
    ".nara-select",
    ".nara-select *",
    ".nara-composer-tools > button",
    ".nara-attachment-menu-wrap > button",
  ].join(",")).forEach((node) => {
    setImportant(node, "animation", "none");
    setImportant(node, "transition", "none");
    setImportant(node, "filter", "none");
    setImportant(node, "transform", "none");
  });
}

function verifiedUserKnown() {
  return Boolean(
    window.__ngebloggingVerifiedSession?.user?.id
    || window.__ngebloggingVerifiedSession?.session?.user?.id
  );
}

function normalizeStartup() {
  const startup = document.querySelector(".so75-startup");
  if (!startup) {
    if (startupTimer) window.clearTimeout(startupTimer);
    startupTimer = 0;
    return;
  }
  if (!verifiedUserKnown()) return;

  const heading = startup.querySelector("section > h1");
  const kicker = startup.querySelector("section > small");
  const paragraph = startup.querySelector("section > p");
  const retry = startup.querySelector("section > button.so75-primary,section > button");
  const isFailure = Boolean(retry && /koneksi data|sinkronisasi data/i.test(heading?.textContent || ""));
  startup.dataset.v205Session = "verified";
  if (!isFailure) return;

  if (heading) heading.textContent = "Login berhasil. Data Studio sedang disinkronkan.";
  if (kicker) kicker.textContent = "SESI LOGIN AKTIF · SINKRONISASI RUANG KERJA";
  if (paragraph && /koneksi|jaringan|data|studio/i.test(paragraph.textContent || "")) {
    paragraph.textContent = "Akun tetap masuk. Sistem sedang memuat situs dan hak akses Anda; gangguan sinkronisasi sementara tidak akan mengeluarkan sesi.";
  }
  retry?.setAttribute("data-v205-studio-retry", "verified-session");

  if (!startupTimer && startupAttempts < 2 && navigator.onLine !== false && retry && !retry.disabled) {
    const delay = startupAttempts === 0 ? 900 : 2400;
    startupTimer = window.setTimeout(() => {
      startupTimer = 0;
      if (!document.contains(retry) || retry.disabled || !verifiedUserKnown()) return;
      startupAttempts += 1;
      retry.click();
    }, delay);
  }
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*",
    ".tn-studio", ".tn-studio>*", ".tn-layout-studio", ".tn-layout-canvas-v170",
    ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane",
    ".ce-app", ".ce-app>*", ".mv176-page", ".sv124-page", ".sn-api-page",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV205 = RELEASE;
  root.dataset.studioMobileV205 = String(mobileLike());
  normalizeLogoAndDrawer();
  normalizeTheme();
  normalizeNara();
  normalizeStartup();
  normalizeContainment();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class", "data-nara-size", "data-studio-responsive-mode", "data-studio-handheld",
    "data-studio-physical-mobile-v193", "data-studio-physical-mobile-v191", "data-studio-desktop-site-phone",
  ],
});

for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
  window.addEventListener(eventName, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();

export {
  RELEASE,
  mobileLike,
  normalizeTheme,
  normalizeLogoAndDrawer,
  normalizeNara,
  normalizeStartup,
  normalizeContainment,
  sync,
};
