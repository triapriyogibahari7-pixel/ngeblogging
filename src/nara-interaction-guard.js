const PHONE_QUERY = "(max-width: 760px)";
const COMPACT_QUERY = "(max-width: 1024px)";
const RELEASE = "nara-interaction-v14-20260724";

function labelOf(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

function conceal(node) {
  if (!node) return;
  node.hidden = true;
  node.tabIndex = -1;
  node.setAttribute("aria-hidden", "true");
  node.style.setProperty("display", "none", "important");
  node.style.setProperty("pointer-events", "none", "important");
}

function ensureSingleSidebar(shell) {
  if (!shell) return;
  shell.querySelectorAll(":scope > .sn-mobile-nav, :scope > .sn-mobile-sheet-layer").forEach((node) => node.remove());
  shell.querySelectorAll(".sn-side-bottom, .sn-side-close").forEach((node) => node.remove());

  const side = shell.querySelector(":scope > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  if (nav) {
    [...nav.querySelectorAll(":scope > button")].forEach((button) => {
      if (labelOf(button) === "Nara AI") conceal(button);
    });
  }
  shell.querySelectorAll(".sn-top-actions .sn-nara-button").forEach(conceal);

  const toggles = [...shell.querySelectorAll(":scope > .sn-main > .sn-top .sn-icon")];
  const toggle = toggles.shift();
  toggles.forEach((node) => node.remove());
  shell.querySelectorAll("[data-sidebar-authority]:not(.sn-icon)").forEach((node) => node.remove());

  if (side && toggle) {
    side.id ||= "ngeblogging-studio-sidebar";
    toggle.dataset.sidebarAuthority = "single";
    toggle.setAttribute("aria-controls", side.id);
    toggle.setAttribute("aria-expanded", String(!side.classList.contains("collapsed")));
    toggle.setAttribute("aria-label", side.classList.contains("collapsed") ? "Buka menu Studio" : "Tutup menu Studio");

    if (window.matchMedia(COMPACT_QUERY).matches && shell.dataset.initialSidebarV14 !== "true") {
      shell.dataset.initialSidebarV14 = "true";
      if (!side.classList.contains("collapsed")) toggle.click();
    }
  }
}

function ensureNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.naraInteractionAuthority = RELEASE;
    launcher.hidden = false;
    launcher.tabIndex = 0;
    launcher.removeAttribute("aria-hidden");
    launcher.setAttribute("aria-label", "Buka Nara AI");
    launcher.style.setProperty("display", window.matchMedia(PHONE_QUERY).matches ? "grid" : "grid", "important");
    launcher.style.setProperty("visibility", "visible", "important");
    launcher.style.setProperty("opacity", "1", "important");
    launcher.style.setProperty("pointer-events", "auto", "important");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  document.body.classList.toggle("nara-modal-open", Boolean(layer));
  if (layer) {
    layer.dataset.naraInteractionAuthority = RELEASE;
    layer.style.setProperty("pointer-events", "auto", "important");
  }
}

function enforce() {
  document.documentElement.dataset.naraInteractionRelease = RELEASE;
  ensureSingleSidebar(document.querySelector(".sn-shell"));
  ensureNara();
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(enforce);
}

const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, { childList: true, subtree: true });

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enforce, { once: true });
else enforce();

let forcedPointer = false;
function pointInside(rect, event) {
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

/* Some legacy overlays covered the floating launcher. Capture the physical tap
   before those overlays and route it to the real React button. */
document.addEventListener("pointerdown", (event) => {
  forcedPointer = false;
  if (document.querySelector(".nara-assistant-layer")) return;
  const launcher = document.querySelector(".nara-floating-button");
  if (!launcher || launcher.contains(event.target)) return;
  if (!pointInside(launcher.getBoundingClientRect(), event)) return;
  forcedPointer = true;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

document.addEventListener("pointerup", (event) => {
  if (!forcedPointer) return;
  forcedPointer = false;
  event.preventDefault();
  event.stopImmediatePropagation();
  document.querySelector(".nara-floating-button")?.click();
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const close = document.querySelector('.nara-assistant-header button[title="Tutup"]');
  close?.click();
});

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
