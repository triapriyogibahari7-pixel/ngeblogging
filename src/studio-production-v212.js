import "./studio-production-v212.css";
import "./studio-production-v212-fix.css";

const RELEASE = "studio-production-v212-20260802";
let frame = 0;

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function physicalShortEdge() {
  try {
    const values = [
      finite(globalThis.screen?.width),
      finite(globalThis.screen?.height),
      finite(globalThis.visualViewport?.width),
      finite(globalThis.visualViewport?.height),
    ].filter(Boolean);
    return values.length ? Math.min(...values) : Math.min(window.innerWidth || 0, window.innerHeight || 0);
  } catch {
    return Math.min(window.innerWidth || 0, window.innerHeight || 0);
  }
}

function handheld() {
  const root = document.documentElement;
  const family = root.dataset.studioResponsiveMode || root.dataset.studioResponsiveFamilyV193 || "";
  const shortEdge = physicalShortEdge();
  return root.dataset.studioPhysicalMobileV193 === "true"
    || root.dataset.studioDesktopSitePhone === "true"
    || ["application", "phone", "mobile", "compact"].includes(family)
    || navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || (shortEdge > 0 && shortEdge <= 760);
}

function markDevice() {
  const root = document.documentElement;
  const shortEdge = physicalShortEdge();
  const isHandheld = handheld();
  root.dataset.studioV212 = RELEASE;
  root.dataset.studioV212Device = isHandheld ? "handheld" : shortEdge >= 768 ? "large" : "standard";
  root.dataset.studioV212ShortEdge = String(Math.round(shortEdge || 0));
}

function stabilizeNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v212Mode = full ? "modal" : "nonmodal";
  shell.dataset.v212Size = size;
  layer.setAttribute("aria-modal", String(full));
  if (!full) {
    layer.style.setProperty("pointer-events", "none", "important");
    layer.style.setProperty("background", "transparent", "important");
    const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
    if (backdrop) backdrop.style.setProperty("display", "none", "important");
    shell.style.setProperty("pointer-events", "auto", "important");
    document.documentElement.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
  } else {
    layer.style.removeProperty("pointer-events");
    const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
    backdrop?.style.removeProperty("display");
  }

  const attachmentTrigger = shell.querySelector('button[aria-controls="nara-attachment-menu-v211"]');
  if (attachmentTrigger) {
    attachmentTrigger.dataset.v212AttachmentTrigger = "native";
    attachmentTrigger.setAttribute("aria-label", "Tambah Kamera, Foto, atau File");
  }
  const menu = shell.querySelector("#nara-attachment-menu-v211");
  if (menu) {
    menu.dataset.v212AttachmentMenu = "camera-photo-file";
    menu.removeAttribute("hidden");
    menu.removeAttribute("inert");
    menu.style.setProperty("display", "grid", "important");
    menu.style.setProperty("visibility", "visible", "important");
    menu.style.setProperty("opacity", "1", "important");
    menu.style.setProperty("pointer-events", "auto", "important");
  }
}

function stabilizeShell() {
  const sidebar = document.querySelector(".sn-side");
  const launcher = document.querySelector(".nara-floating-button");
  for (const node of [sidebar, launcher]) {
    if (!node) continue;
    node.style.setProperty("animation", "none", "important");
    node.style.setProperty("transition", "none", "important");
    node.style.setProperty("filter", "none", "important");
  }
  const mobileLogo = document.querySelector(".sn-mobile-brand,.sn-mobile-menu,.sn-logo-mark");
  if (mobileLogo) mobileLogo.dataset.v212Logo = "centered";
}

function scan() {
  frame = 0;
  markDevice();
  stabilizeNara();
  stabilizeShell();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(scan);
}

new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:["data-nara-size", "aria-expanded", "class"] });
window.addEventListener("resize", schedule, { passive:true });
window.visualViewport?.addEventListener?.("resize", schedule, { passive:true });
window.addEventListener("orientationchange", schedule, { passive:true });
document.addEventListener("click", (event) => {
  if (event.target.closest('button[aria-controls="nara-attachment-menu-v211"]')) requestAnimationFrame(schedule);
}, true);

schedule();
