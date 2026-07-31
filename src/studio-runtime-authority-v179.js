import "./studio-runtime-authority-v179.css";

const RELEASE = "studio-runtime-authority-v179-20260731";
let frame = 0;

function naraMode(shell) {
  const size = shell?.dataset.naraSize || "small";
  return size === "full" ? "modal" : "nonmodal";
}

function syncNara() {
  document.querySelectorAll(".nara-assistant-layer").forEach((layer) => {
    const shell = layer.querySelector(":scope > .nara-assistant-shell");
    if (!shell) return;
    const mode = naraMode(shell);
    layer.dataset.runtimeModeV179 = mode;
    layer.setAttribute("aria-modal", String(mode === "modal"));
    const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
    if (backdrop) {
      backdrop.hidden = mode !== "modal";
      backdrop.tabIndex = mode === "modal" ? 0 : -1;
      backdrop.setAttribute("aria-hidden", String(mode !== "modal"));
    }
    const close = shell.querySelector(".nara-assistant-header>button:last-child");
    if (close) {
      close.dataset.naraCloseV179 = RELEASE;
      close.setAttribute("aria-label", "Tutup Nara AI");
      close.hidden = false;
    }
    if (mode === "nonmodal") {
      document.body.classList.remove("nara-fullscreen-open-v148", "nara-fullscreen-open-v176", "nara-full-v179");
      document.body.style.removeProperty("overflow");
    }
  });
}

function syncDrawer() {
  const sidebar = document.querySelector("#ngeblogging-studio-sidebar");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));
  document.documentElement.dataset.studioDrawerV179 = open ? "open" : "closed";
  document.querySelector(".sn-main")?.removeAttribute("inert");
  if (sidebar) {
    sidebar.setAttribute("aria-hidden", "false");
    sidebar.style.removeProperty("filter");
    sidebar.style.removeProperty("opacity");
  }
  if (!open) {
    document.body.classList.remove("sn-mobile-sidebar-open", "sn-mobile-sidebar-open-v176", "sm176-drawer-open", "sm177-drawer-open");
    document.body.style.removeProperty("overflow");
  }
}

function syncProfile() {
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (menu && menu.parentElement !== document.body) document.body.append(menu);
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioRuntimeAuthorityV179 = RELEASE;
  syncDrawer();
  syncNara();
  syncProfile();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-nara-size", "aria-modal", "inert"],
});

document.addEventListener("click", (event) => {
  const menuItem = event.target.closest("#ngeblogging-studio-sidebar button");
  if (menuItem) {
    requestAnimationFrame(() => {
      document.querySelector(".sn-main")?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
      window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    });
  }
  schedule();
}, true);

window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
schedule();

export { RELEASE, sync };
