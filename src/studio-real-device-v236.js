import "./studio-real-device-v236.css";

export const RELEASE = "studio-real-device-v236-20260803";

let frame = 0;
let navCollapseTimer = 0;

function currentFamily() {
  const root = document.documentElement;
  if (root.dataset.v235Family === "large" || root.dataset.studioDesktopSitePhone === "true" || root.dataset.v232ModeLock === "desktop-site-large") return "large";
  if (root.dataset.v235Family === "small") return "small";
  const responsive = root.dataset.studioResponsiveMode || root.dataset.studioDeviceVariant || "";
  if (["tablet","laptop","desktop","computer"].includes(responsive)) return "large";
  if (["application","phone","mobile","compact"].includes(responsive)) return "small";
  const width = Math.min(Number(screen?.width || innerWidth || 0), Number(screen?.height || innerHeight || 0));
  const handheld = navigator.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod|Windows Phone|Opera Mini|IEMobile/i.test(navigator.userAgent || "");
  if (handheld && width < 768) return "small";
  return Number(document.documentElement.clientWidth || innerWidth || 0) >= 768 ? "large" : "small";
}

function markDomain() {
  document.querySelectorAll(".sv124-domain-page,.sn-domain-page").forEach((page) => {
    page.dataset.v236Domain = "bounded";
    page.querySelectorAll("button,a").forEach((control) => {
      const text = String(control.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|utama|buka/.test(text)) {
        control.dataset.v236DomainAction = "true";
      }
    });
  });
}

function markEditor() {
  document.querySelectorAll(".ce-app").forEach((editor) => {
    editor.dataset.v236Editor = currentFamily() === "small" ? "small-safe" : "large-safe";
    editor.querySelector(".ce-titlebar")?.setAttribute("data-v236-titlebar", "bounded-actions");
    editor.querySelector(".ce-actions")?.setAttribute("data-v236-editor-actions", "preview-publish-visible");
    editor.querySelector(".ce-ribbon")?.setAttribute("data-v236-ribbon", "horizontal-scroll");
  });
}

function markTheme() {
  document.querySelectorAll(".tn-studio").forEach((studio) => {
    studio.dataset.v236Theme = "one-hundred-browseable";
    studio.querySelector(".tn-category-tabs")?.setAttribute("data-v236-theme-tabs", "scroll-not-collide");
    studio.querySelector(".tn-theme-grid")?.setAttribute("data-v236-theme-grid", "responsive");
  });
  document.querySelectorAll(".tn-modal").forEach((modal) => {
    modal.dataset.v236Modal = "bounded-typography";
    if (modal.querySelector(".tn-widget-studio")) modal.dataset.v236WidgetModal = "readable-26";
    if (modal.querySelector(".tn-code-workspace")) modal.dataset.v236CodeModal = "responsive-preview-code";
  });
}

function addCreateSiteAction() {
  document.querySelectorAll(".v235-profile-menu").forEach((menu) => {
    if (menu.querySelector('[data-action="create-site"]')) return;
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.dataset.action = "create-site";
    button.innerHTML = "<b>+ Tambahkan situs</b><small>Buat situs baru di akun ini</small>";
    const viewSite = menu.querySelector('[data-action="view-site"]');
    if (viewSite) menu.insertBefore(button, viewSite);
    else menu.append(button);
    menu.dataset.v236ProfileMenu = "profile-avatar-sites-create-view-settings-logout";
  });
}

function markNara() {
  document.querySelectorAll(".nara-assistant-shell").forEach((shell) => {
    shell.dataset.v236Nara = "controls-visible";
    const plus = shell.querySelector(".nara-attachment-menu-wrap>button");
    if (plus) {
      plus.dataset.v236Attachment = "camera-photo-file";
      plus.setAttribute("aria-label", "Tambah kamera, foto, atau file");
    }
  });
  document.querySelectorAll(".v235-nara-attachment-portal").forEach((portal) => {
    portal.dataset.v236AttachmentPortal = "viewport-safe";
    portal.querySelectorAll("button").forEach((button) => button.removeAttribute("inert"));
  });
}

function suppressTextInflation() {
  document.querySelectorAll(".tn-modal>header,.tn-widget-summary,.ce-titlebar,.sv124-free-domain").forEach((node) => {
    node.dataset.v236TextGeometry = "stable";
    node.style.setProperty("-webkit-text-size-adjust", "100%", "important");
    node.style.setProperty("text-size-adjust", "100%", "important");
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV236 = RELEASE;
  root.dataset.v236Family = currentFamily();
  markDomain();
  markEditor();
  markTheme();
  addCreateSiteAction();
  markNara();
  suppressTextInflation();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

function openSiteManager() {
  const workspace = document.querySelector(".sn-workspace");
  if (workspace) {
    workspace.click();
    return true;
  }
  const home = [...document.querySelectorAll("#ngeblogging-studio-sidebar nav button")].find((button) => /ringkasan/i.test(button.textContent || ""));
  home?.click();
  window.dispatchEvent(new CustomEvent("ngeblogging:toast", {
    detail: { type: "info", message: "Buka Ringkasan untuk menambah situs baru." },
  }));
  return false;
}

function collapseLargeSidebarAfterNavigation(target) {
  if (currentFamily() !== "large") return;
  const sidebar = target.closest("#ngeblogging-studio-sidebar");
  if (!sidebar || sidebar.classList.contains("collapsed")) return;
  if (!target.closest("nav button,.sn-new")) return;
  clearTimeout(navCollapseTimer);
  navCollapseTimer = window.setTimeout(() => {
    const liveSidebar = document.getElementById("ngeblogging-studio-sidebar");
    if (!liveSidebar || liveSidebar.classList.contains("collapsed")) return;
    document.querySelector(".sn-sidebar-toggle")?.click();
    schedule();
  }, 40);
}

// v235 owns all primary interactions. v236 only adds the requested create-site action
// and the optional auto-collapse after a large-layout navigation has completed.
window.addEventListener("click", (event) => {
  const createSite = event.target.closest?.('.v235-profile-menu [data-action="create-site"]');
  if (createSite) {
    event.preventDefault();
    event.stopPropagation();
    openSiteManager();
    schedule();
    return;
  }
  const navigationTarget = event.target.closest?.("#ngeblogging-studio-sidebar nav button,#ngeblogging-studio-sidebar .sn-new");
  if (navigationTarget) collapseLargeSidebarAfterNavigation(navigationTarget);
}, true);

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class","data-v235-family","data-studio-responsive-mode","data-studio-device-variant","data-nara-size"],
});

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
document.addEventListener("visibilitychange", schedule, { passive: true });

sync();
