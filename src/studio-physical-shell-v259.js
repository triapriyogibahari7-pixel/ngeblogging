export const RELEASE = "studio-physical-shell-v259-20260804";

const SMALL = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function viewportWidth() {
  const layout = Number(document.documentElement?.clientWidth || window.innerWidth || 1);
  const visual = Number(window.visualViewport?.width || layout || 1);
  return Math.max(1, Math.min(layout || visual, visual || layout));
}

function isInstalledApplication() {
  try {
    return Boolean(
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      window.navigator?.standalone === true ||
      String(document.referrer || "").startsWith("android-app://")
    );
  } catch {
    return false;
  }
}

function physicalMode() {
  const width = viewportWidth();
  if (isInstalledApplication() && width <= 760) return "application";
  if (width <= 430) return "phone";
  if (width <= 600) return "mobile";
  if (width <= 760) return "compact";
  if (width <= 1180) return "tablet";
  if (width <= 1536) return "laptop";
  return "computer";
}

function physicalFamily(mode = physicalMode()) {
  return SMALL.has(mode) ? "small" : "large";
}

function syncSidebarState(root, small) {
  const side = document.getElementById("ngeblogging-studio-sidebar");
  if (!side) return;

  const open = small ? side.classList.contains("mobile-open") : !side.classList.contains("collapsed");
  root.dataset.studioV259Sidebar = small ? (open ? "open" : "closed") : (open ? "expanded" : "collapsed");
  side.dataset.studioV259Physical = small ? "drawer" : "rail";

  const topToggle = document.querySelector(".sn-sidebar-toggle");
  if (topToggle) {
    topToggle.setAttribute("aria-expanded", String(small && open));
    topToggle.setAttribute("aria-label", small ? "Buka menu Studio" : "Menu Studio");
  }

  const logo = side.querySelector(".sn-logo-mark");
  if (logo) {
    logo.setAttribute("aria-label", small ? "Tutup menu Studio" : open ? "Ciutkan menu Studio" : "Perluas menu Studio");
    logo.setAttribute("title", logo.getAttribute("aria-label") || "Menu Studio");
    const letter = logo.querySelector("strong");
    if (letter) letter.textContent = "n";
  }

  const brand = side.querySelector(".sn-logo>b");
  if (brand) brand.textContent = "Ngeblogging";

  const backdrop = document.querySelector(".sn-side-backdrop");
  if (backdrop) {
    backdrop.setAttribute("aria-hidden", String(!(small && open)));
    backdrop.dataset.studioV259Backdrop = small && open ? "close-drawer" : "inactive";
  }
}

function syncOperationalSurfaces(small) {
  document.querySelectorAll(".ce-app").forEach((node) => {
    node.dataset.studioV259PhysicalEditor = small ? "small" : "large";
  });
  document.querySelectorAll(".tn-code-workspace").forEach((node) => {
    node.dataset.studioV259PhysicalCode = small ? "stacked" : "split";
  });
  document.querySelectorAll(".tn-layout-studio").forEach((node) => {
    node.dataset.studioV259PhysicalLayout = small ? "compact-map" : "wide-map";
  });
  document.querySelectorAll(".nara-floating-button").forEach((node) => {
    node.dataset.studioV259Launcher = "fixed-safe-corner";
    node.removeAttribute("hidden");
    node.setAttribute("aria-hidden", "false");
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  if (!root) return;
  const mode = physicalMode();
  const family = physicalFamily(mode);
  const small = family === "small";

  root.dataset.studioPhysicalV259 = RELEASE;
  root.dataset.studioV259Mode = mode;
  root.dataset.studioV259Family = family;
  root.style.setProperty("--studio-physical-width-v259", `${Math.round(viewportWidth())}px`);

  document.querySelector(".sn-shell")?.setAttribute("data-studio-physical-v259", RELEASE);
  syncSidebarState(root, small);
  syncOperationalSurfaces(small);
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.attributeName === "class" || record.attributeName === "hidden")) {
      schedule();
    }
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "hidden"],
  });

  for (const name of ["pageshow", "resize", "orientationchange", "online"]) {
    window.addEventListener(name, schedule, { passive: true });
  }
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.matchMedia?.("(display-mode: standalone)")?.addEventListener?.("change", schedule);
  schedule();
}

export { physicalFamily, physicalMode, schedule, sync, viewportWidth };
