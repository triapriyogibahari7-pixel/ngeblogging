import "./studio-shell-content-v274.css";
import { loadAnalytics } from "./studio-analytics-v41.js";

export const RELEASE = "studio-shell-content-v274-20260804";

let frame = 0;
let analyticsHost = null;
let observer = null;

function root() { return document.documentElement; }
function sidebar() { return document.getElementById("ngeblogging-studio-sidebar"); }
function bridgeToggle() { return document.querySelector(".sn-top .sn-sidebar-toggle"); }

function viewportWidth() {
  return Math.max(
    Number(document.documentElement?.clientWidth || 0),
    Number(window.innerWidth || 0),
    Number(window.visualViewport?.width || 0),
    1,
  );
}

function compactFamily() {
  const html = root();
  if (html.dataset.studioDeviceMode === "small") return true;
  if (html.dataset.studioDeviceMode === "large") return false;
  if (["application", "phone", "mobile", "compact"].includes(html.dataset.studioResponsiveMode || "")) return true;
  if (["tablet", "laptop", "desktop", "computer"].includes(html.dataset.studioResponsiveMode || "")) return false;
  if (html.dataset.studioDesktopSitePhone === "true" || html.dataset.v232ModeLock === "desktop-site-large") return false;
  return viewportWidth() < 760;
}

function normalizeSidebar() {
  const side = sidebar();
  if (!side) return;
  const compact = compactFamily();
  const drawerOpen = compact && side.classList.contains("mobile-open");
  const collapsed = !compact && side.classList.contains("collapsed");

  side.hidden = false;
  side.removeAttribute("aria-hidden");
  side.removeAttribute("inert");
  side.dataset.v274State = compact ? (drawerOpen ? "drawer-open" : "mobile-trigger") : (collapsed ? "rail" : "expanded");
  document.body.classList.toggle("sn-mobile-sidebar-open", drawerOpen);

  const mark = side.querySelector(".sn-logo-mark");
  if (mark) {
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(compact ? drawerOpen : !collapsed));
    mark.setAttribute("aria-label", compact
      ? (drawerOpen ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging")
      : (collapsed ? "Buka menu Ngeblogging" : "Ciutkan menu Ngeblogging"));
    mark.setAttribute("title", mark.getAttribute("aria-label"));
    const n = mark.querySelector("strong");
    if (n) n.textContent = "n";
  }

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    button.hidden = false;
    button.removeAttribute("aria-hidden");
    button.removeAttribute("inert");
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });

  document.querySelectorAll([
    ".sn-side-close", ".sn-sidebar-edge-toggle-v147", ".v227-sidebar-fab", ".studio-external-sidebar-toggle",
    "[data-v173-collapse-toggle]", "[data-v187-sidebar-toggle]", "[data-v208-sidebar-toggle]",
    "[data-v223-sidebar-toggle]", "[data-v229-sidebar-toggle]", "#ngeblogging-studio-chrome-v244",
  ].join(",")).forEach((node) => {
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("tabindex", "-1");
  });

  const bridge = bridgeToggle();
  if (bridge) {
    bridge.dataset.v274Bridge = "true";
    bridge.setAttribute("aria-hidden", "true");
    bridge.setAttribute("tabindex", "-1");
  }
}

function normalizeTopbar() {
  const top = document.querySelector(".sn-main>.sn-top");
  if (!top) return;
  top.dataset.v274Topbar = "profile-right";
  const avatar = top.querySelector(".sn-avatar");
  if (avatar) {
    avatar.hidden = false;
    avatar.removeAttribute("aria-hidden");
    avatar.removeAttribute("inert");
    avatar.setAttribute("aria-haspopup", "menu");
    avatar.setAttribute("aria-label", "Buka menu profil");
  }
  top.querySelectorAll("[data-studio-mode-badge],[data-device-mode-badge],.studio-device-mode-badge,.v225-mode-badge").forEach((node) => {
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.hidden = false;
    launcher.removeAttribute("aria-hidden");
    launcher.removeAttribute("inert");
    launcher.dataset.v274Pinned = "true";
  }

  const shell = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = shell?.closest(".nara-assistant-layer");
  if (!shell || !layer) return;
  const full = shell.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
  }

  const close = shell.querySelector('button[aria-label="Tutup Nara"],button[aria-label="Tutup Nara AI"],button[title="Tutup"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("aria-hidden");
  }

  if (!full) {
    for (const node of [document.documentElement, document.body, document.getElementById("root"), document.querySelector(".sn-main")]) {
      node?.removeAttribute?.("inert");
      node?.style?.removeProperty("overflow");
      node?.style?.removeProperty("pointer-events");
      node?.style?.removeProperty("filter");
      node?.style?.removeProperty("backdrop-filter");
    }
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
  }
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".sn-content-card", ".sn-content-card>*",
    ".tn-studio", ".tn-studio>*", ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane",
    ".tn-layout-studio", ".tn-layout-map-v264", ".sv124-page", ".sv124-page>*", ".ce-app", ".ce-app>*",
  ].join(",")).forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

function normalizeThemeTools() {
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v274CodeLayout = compactFamily() ? "stacked" : "split";
  });
  document.querySelectorAll(".tn-layout-slot-v264").forEach((button) => {
    button.disabled = false;
    button.removeAttribute("inert");
    button.removeAttribute("aria-hidden");
  });
}

function restoreAnalytics() {
  const active = document.querySelector("#ngeblogging-studio-sidebar nav button.active span")?.textContent?.trim();
  const view = document.querySelector(".sn-main>.sn-view-pad");
  if (active !== "Analitik" || !view || view.querySelector(".sn-page-title h1")?.textContent?.trim() !== "Analitik") {
    analyticsHost = null;
    return;
  }
  if (view === analyticsHost && view.dataset.op41AnalyticsMode) return;
  analyticsHost = view;
  view.dataset.v274Analytics = "production-first";
  loadAnalytics(view, 30, false);
}

function sync() {
  frame = 0;
  root().dataset.studioShellContentV274 = RELEASE;
  root().dataset.v274CompactFamily = String(compactFamily());
  normalizeSidebar();
  normalizeTopbar();
  normalizeNara();
  normalizeContainment();
  normalizeThemeTools();
  restoreAnalytics();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function afterNavigation(event) {
  const button = event.target.closest?.("#ngeblogging-studio-sidebar nav>button");
  if (!button || compactFamily()) return;
  setTimeout(() => {
    const side = sidebar();
    const bridge = bridgeToggle();
    if (side && bridge && !side.classList.contains("collapsed")) bridge.click();
  }, 0);
}

function start() {
  if (!observer && document.body) {
    observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "aria-hidden", "data-nara-size", "data-studio-device-mode", "data-studio-responsive-mode"],
    });
  }
  schedule();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", afterNavigation, false);
  document.addEventListener("click", () => setTimeout(schedule, 0), true);
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("online", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
