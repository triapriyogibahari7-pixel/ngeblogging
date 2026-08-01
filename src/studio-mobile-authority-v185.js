import "./studio-mobile-authority-v185.css";

const RELEASE = "studio-mobile-authority-v185-20260801";
let frame = 0;

function text(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function naraSize(shell) {
  return shell?.dataset.naraSize
    || shell?.getAttribute("data-nara-size")
    || document.documentElement.dataset.naraAssistantSize
    || "small";
}

function normalizeDrawer() {
  const sidebar = document.querySelector(".sn-shell > .sn-side");
  const main = document.querySelector(".sn-shell > .sn-main");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));

  main?.removeAttribute("inert");
  sidebar?.removeAttribute("inert");
  sidebar?.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
  });

  if (sidebar) sidebar.setAttribute("aria-hidden", open ? "false" : "true");
  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) backdrop.removeAttribute("inert");
    else backdrop.setAttribute("inert", "");
  }

  if (!open) {
    document.body.classList.remove("sn-mobile-sidebar-open", "sm177-drawer-open", "v179-drawer-open", "v181-drawer-open");
  }
}

function normalizeNara() {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) return;
  const full = naraSize(shell) === "full";
  layer.dataset.v185Mode = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", full ? "false" : "true");
    backdrop.tabIndex = full ? 0 : -1;
  }

  const close = shell.querySelector('[data-nara-close-v177],button[title="Tutup"],button[aria-label*="Tutup" i]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("aria-hidden");
  }

  if (!full) {
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
    for (const className of ["nara-scroll-lock", "nara-fullscreen-open", "nara-fullscreen-open-v148", "sm177-nara-full", "v179-nara-full"]) {
      document.body.classList.remove(className);
      document.documentElement.classList.remove(className);
    }
  }
}

function revealThemeActions() {
  document.querySelectorAll(".tn-hero-actions button,.tn-theme-actions button,.tn-active-actions button,.tn-hero-actions a,.tn-theme-actions a,.tn-active-actions a").forEach((node) => {
    const label = text(node);
    if (!/(preview|pratinjau|gunakan|sesuaikan|tata letak|html|css|javascript|widget|riwayat|cadangan|pulihkan|download|lihat situs|simpan|terbitkan)/i.test(label)) return;
    node.hidden = false;
    node.removeAttribute("aria-hidden");
    node.removeAttribute("inert");
    if (node.tagName === "BUTTON") node.disabled = false;
  });
}

function normalizeMediaTools() {
  document.querySelectorAll(".sn-media-tools nav").forEach((nav) => {
    nav.removeAttribute("inert");
    nav.querySelectorAll("button").forEach((button) => {
      button.hidden = false;
      button.disabled = false;
      button.removeAttribute("aria-hidden");
    });
  });
}

function normalizeInteraction() {
  document.querySelector(".sn-shell")?.removeAttribute("inert");
  document.querySelector(".sn-main")?.removeAttribute("inert");
  normalizeDrawer();
  normalizeNara();
  revealThemeActions();
  normalizeMediaTools();
  document.documentElement.dataset.studioMobileAuthorityV185 = RELEASE;
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    normalizeInteraction();
  });
}

const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "inert", "aria-hidden", "data-nara-size"],
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".sn-side nav button,.sn-side > .sn-new,.sn-account-footer button")) {
    requestAnimationFrame(() => {
      document.querySelector(".sn-main")?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
      window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    });
  }
}, true);

window.addEventListener("resize", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
normalizeInteraction();

export { RELEASE, normalizeDrawer, normalizeInteraction, normalizeMediaTools, normalizeNara, revealThemeActions };
