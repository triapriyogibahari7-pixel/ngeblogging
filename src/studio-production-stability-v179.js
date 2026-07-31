import "./studio-production-stability-v179.css";

const RELEASE = "studio-production-stability-v179-20260731";
const NARA_SIZE_KEY = "ngeblogging-nara-size-v148";
let frame = 0;

function sync() {
  frame = 0;
  document.documentElement.dataset.studioProductionStabilityV179 = RELEASE;
  const shell = document.querySelector(".sn-shell");
  shell?.querySelector(".sn-main")?.removeAttribute("inert");

  const profile = document.querySelector(".sn-profile-menu-v150");
  if (profile) {
    if (profile.parentElement !== document.body) document.body.append(profile);
    profile.dataset.profileMenuV179 = RELEASE;
    profile.setAttribute("aria-label", "Menu profil pengguna");
  }

  const sidebar = document.querySelector("#ngeblogging-studio-sidebar");
  const drawerOpen = Boolean(sidebar?.classList.contains("mobile-open"));
  sidebar?.setAttribute("data-drawer-v179", drawerOpen ? "open" : "closed");
  if (!drawerOpen) {
    document.body.classList.remove("sn-mobile-sidebar-open", "sn-mobile-sidebar-open-v176", "sm176-drawer-open", "sm177-drawer-open");
    document.body.style.removeProperty("overflow");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const nara = layer?.querySelector(".nara-assistant-shell");
  if (layer && nara) {
    const size = ["small", "medium", "full"].includes(nara.dataset.naraSize) ? nara.dataset.naraSize : "small";
    const full = size === "full";
    nara.dataset.naraSize = size;
    nara.dataset.naraStableV179 = RELEASE;
    layer.dataset.naraInteractionV179 = full ? "modal" : "nonmodal";
    layer.setAttribute("aria-modal", String(full));
    const backdrop = layer.querySelector(".nara-assistant-backdrop");
    if (backdrop) {
      backdrop.hidden = !full;
      backdrop.setAttribute("aria-hidden", String(!full));
      backdrop.tabIndex = full ? 0 : -1;
    }
    document.body.classList.toggle("nara-full-v179", full);
    if (!full) {
      document.body.classList.remove("nara-fullscreen-open-v148", "nara-fullscreen-open-v176", "sm177-nara-full");
      document.body.style.removeProperty("overflow");
    }
  } else {
    document.body.classList.remove("nara-full-v179");
  }

  document.querySelector(".sn-media-tools nav")?.setAttribute("data-media-filter-v179", RELEASE);
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-nara-size", "aria-expanded", "inert"],
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".nara-floating-button")) {
    try { localStorage.setItem(NARA_SIZE_KEY, "small"); } catch { /* optional */ }
  }
  if (event.target.closest("#ngeblogging-studio-sidebar button")) {
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
