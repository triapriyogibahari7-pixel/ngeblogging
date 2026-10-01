import "./studio-sidebar-direct-v300.css";
import "./studio-theme-mobile-v312.css";
import "./studio-theme-final-v340.js";
import "./studio-theme-surface-final-v341.js";

export const STUDIO_SIDEBAR_DIRECT_RELEASE_V300 = "studio-sidebar-direct-v300-20260805";
export const STUDIO_SIDEBAR_DIRECT_OWNER_V300 = "studio-sidebar-direct-target-owner-v300";

let boundMark = null;
let frame = 0;

const root = () => document.documentElement;
const shell = () => document.querySelector(".sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");
const reactToggle = () => document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");

function family() {
  return shell()?.dataset?.deviceMode === "large" ? "large" : "small";
}

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("inert");
  node.removeAttribute("aria-hidden");
  if ("disabled" in node) node.disabled = false;
  if (node.style?.display === "none") node.style.removeProperty("display");
  if (node.style?.visibility === "hidden") node.style.removeProperty("visibility");
  if (node.style?.opacity === "0") node.style.removeProperty("opacity");
}

function updateMarkState() {
  const side = sidebar();
  const mark = side?.querySelector(".sn-logo-mark");
  if (!side || !mark) return;
  const expanded = family() === "large" ? !side.classList.contains("collapsed") : side.classList.contains("mobile-open");
  mark.dataset.v300DirectOwner = STUDIO_SIDEBAR_DIRECT_OWNER_V300;
  mark.setAttribute("role", "button");
  mark.setAttribute("tabindex", "0");
  mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
  mark.setAttribute("aria-expanded", String(expanded));
  mark.setAttribute("aria-label", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
  mark.setAttribute("title", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
  const letter = mark.querySelector("strong");
  if (letter) {
    letter.textContent = "n";
    letter.style.removeProperty("opacity");
    letter.style.removeProperty("visibility");
    letter.style.removeProperty("filter");
    letter.style.removeProperty("transform");
    letter.style.removeProperty("color");
  }
}

function syncSidebarSurface() {
  const side = sidebar();
  if (!side) return false;
  reveal(side);
  side.dataset.v300Family = family();
  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  const brand = side.querySelector(":scope>.sn-logo>b");
  if (brand) {
    brand.textContent = "Ngeblogging";
    brand.removeAttribute("hidden");
    brand.removeAttribute("aria-hidden");
  }
  side.querySelectorAll(":scope>.sn-new,:scope>nav,:scope>nav>button,:scope>.sn-account-footer,:scope>.sn-account-footer>button").forEach(reveal);
  side.querySelectorAll(":scope>.sn-new,:scope>nav>button,:scope>.sn-account-footer>button").forEach((button) => {
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("title", label);
    button.setAttribute("aria-label", label);
  });
  updateMarkState();
  return true;
}

function directToggle(event) {
  event.preventDefault();
  event.stopPropagation();
  const side = sidebar();
  const toggle = reactToggle();
  if (toggle && !toggle.disabled) {
    toggle.click();
  } else if (side) {
    if (family() === "small") side.classList.toggle("mobile-open");
    else side.classList.toggle("collapsed");
    root().dataset.studioSidebarFallbackV300 = "used";
  }
  requestAnimationFrame(() => {
    syncSidebarSurface();
    schedule(60);
  });
}

function bindDirectTarget() {
  const mark = sidebar()?.querySelector(".sn-logo-mark");
  if (!mark) return false;
  if (boundMark === mark && mark.dataset.v300Bound === "true") return true;
  if (boundMark) boundMark.removeEventListener("click", directToggle);
  mark.addEventListener("click", directToggle, { passive:false });
  mark.dataset.v300Bound = "true";
  boundMark = mark;
  return true;
}

function sync() {
  frame = 0;
  if (!shell()) return false;
  root().dataset.studioSidebarDirectV300 = STUDIO_SIDEBAR_DIRECT_RELEASE_V300;
  const ok = syncSidebarSurface();
  bindDirectTarget();
  document.querySelectorAll(".sn-side-backdrop").forEach((backdrop) => {
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.style.setProperty("display", "none", "important");
    backdrop.style.setProperty("pointer-events", "none", "important");
  });
  document.body.style.removeProperty("filter");
  document.body.style.removeProperty("backdrop-filter");
  document.documentElement.style.removeProperty("filter");
  return ok;
}

function schedule(delay = 0) {
  if (delay > 0) {
    window.setTimeout(schedule, delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function boot(attempt = 0) {
  if (sync()) return;
  if (attempt >= 6) return;
  window.setTimeout(() => boot(attempt + 1), [30,70,140,260,480,800,1200][attempt] || 480);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("pageshow", () => boot(), { passive:true });
  window.addEventListener("resize", () => schedule(40), { passive:true });
  window.addEventListener("orientationchange", () => schedule(80), { passive:true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule());
  window.addEventListener("ngeblogging:auth-session-ready", () => schedule(30));
  window.addEventListener("ngeblogging:auth-callback-complete", () => schedule(30));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => boot(), { once:true });
  else boot();

  // v301 deliberately loads after the v300 direct target has installed its one
  // click owner. v301 only owns final geometry and therefore cannot double-toggle.
  import("./studio-sidebar-hard-lock-v301.js").catch((error) => console.error("Studio v301 hard-lock failed to load", error));
}
