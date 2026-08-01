import "./studio-production-v185.css";

const RELEASE = "studio-production-source-v185-20260801";
let frame = 0;

function drawerState() {
  const sidebar = document.querySelector(".sn-shell > .sn-side");
  return { sidebar, open: Boolean(sidebar?.classList.contains("mobile-open")) };
}

function repairDrawer() {
  const { sidebar, open } = drawerState();
  const main = document.querySelector(".sn-main");
  const backdrop = document.querySelector(".sn-side-backdrop");

  main?.removeAttribute("inert");
  sidebar?.removeAttribute("inert");
  sidebar?.setAttribute("aria-hidden", open ? "false" : "true");

  sidebar?.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
  });

  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
    if (open) backdrop.removeAttribute("inert");
    else backdrop.setAttribute("inert", "");
  }

  if (!open) {
    document.body.classList.remove(
      "sn-mobile-sidebar-open",
      "sm177-drawer-open",
      "v179-drawer-open",
      "v181-drawer-open",
    );
    document.body.style.removeProperty("overflow");
  }
}

function repairNara() {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());

  document.querySelectorAll(".nara-assistant-layer").forEach((layer) => {
    const shell = layer.querySelector(":scope > .nara-assistant-shell");
    if (!shell) return;
    const size = shell.dataset.naraSize || "small";
    const full = size === "full";
    layer.dataset.naraMode = full ? "modal" : "nonmodal";
    layer.dataset.productionV185 = RELEASE;
    layer.setAttribute("aria-modal", String(full));

    const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
    if (backdrop) {
      backdrop.hidden = !full;
      backdrop.tabIndex = full ? 0 : -1;
      backdrop.setAttribute("aria-hidden", String(!full));
    }

    const close = shell.querySelector('button[title="Tutup"],button[aria-label*="Tutup" i]');
    if (close) {
      close.hidden = false;
      close.disabled = false;
      close.removeAttribute("aria-hidden");
      close.setAttribute("aria-label", "Tutup Nara AI");
    }

    if (!full) {
      for (const className of [
        "nara-scroll-lock",
        "nara-fullscreen-open",
        "nara-fullscreen-open-v148",
        "sm177-nara-full",
        "v179-nara-full",
      ]) {
        document.body.classList.remove(className);
        document.documentElement.classList.remove(className);
      }
      document.body.style.removeProperty("overflow");
    }
  });
}

function repairProfile() {
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!menu) return;
  if (menu.parentElement !== document.body) document.body.append(menu);
  menu.dataset.productionV185 = RELEASE;
  menu.setAttribute("aria-label", "Menu profil pengguna");
}

function repairPanels() {
  document.querySelector(".sn-media-tools nav")?.setAttribute("data-media-toolbar-v185", RELEASE);
  document.querySelectorAll(".sn-main,.sn-main>*,.sn-view-pad,.sv124-page,.mv176-page,.sn-api-page,.ce-app")
    .forEach((node) => node.removeAttribute("inert"));
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioProductionV185 = RELEASE;
  document.documentElement.dataset.studioResponsiveFamiliesV185 = "application phone mobile compact tablet desktop laptop computer";
  document.documentElement.dataset.studioSessionPolicyV185 = "persist-until-explicit-logout";
  repairDrawer();
  repairNara();
  repairProfile();
  repairPanels();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "inert", "aria-hidden", "data-nara-size"],
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".sn-side nav button,.sn-side>.sn-new,.sn-account-footer button")) {
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
window.addEventListener("online", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

sync();

export { RELEASE, repairDrawer, repairNara, repairPanels, repairProfile, sync };
