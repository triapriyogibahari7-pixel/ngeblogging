import "./studio-interaction-precision-v183.css";

const RELEASE = "studio-interaction-precision-v183-20260731";
let frame = 0;
let startupRetryTimer = 0;

function visible(node) {
  if (!node?.isConnected) return false;
  const style = getComputedStyle(node);
  return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length > 0;
}

function isCompactViewport() {
  const width = window.visualViewport?.width || window.innerWidth || 0;
  return width <= 820 || document.documentElement.dataset.studioLayoutFamilyV179 !== "desktop";
}

function syncDrawer() {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector(":scope > .sn-side");
  const main = shell?.querySelector(":scope > .sn-main");
  const backdrop = shell?.querySelector(":scope > .sn-side-backdrop");
  if (!shell || !sidebar || !main) return;

  const mobile = isCompactViewport();
  const open = mobile && sidebar.classList.contains("mobile-open");
  document.documentElement.dataset.v183Drawer = open ? "open" : "closed";
  document.body.classList.toggle("v183-drawer-open", open);

  sidebar.removeAttribute("inert");
  sidebar.setAttribute("aria-hidden", mobile && !open ? "true" : "false");
  sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
    node.removeAttribute("inert");
    if (open) node.removeAttribute("aria-hidden");
  });

  if (open) {
    main.setAttribute("inert", "");
    backdrop?.removeAttribute("inert");
    backdrop?.setAttribute("aria-hidden", "false");
  } else {
    main.removeAttribute("inert");
    backdrop?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sn-mobile-sidebar-open", "sm177-drawer-open", "v179-drawer-open");
  }
}

function syncNara() {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((launcher) => launcher.remove());
  launchers[0]?.setAttribute("data-nara-launcher-v183", RELEASE);

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("v183-nara-full");
    return;
  }

  const size = shell.dataset.naraSize || shell.getAttribute("data-size") || "small";
  const full = size === "full";
  layer.dataset.naraInteractionV183 = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", full ? "true" : "false");
  document.body.classList.toggle("v183-nara-full", full);

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.toggleAttribute("inert", !full);
    backdrop.setAttribute("aria-hidden", full ? "false" : "true");
  }

  if (!full) {
    document.body.classList.remove(
      "nara-scroll-lock", "nara-fullscreen-open", "sm177-nara-full",
      "v179-nara-full", "nara-nonmodal-open-v151",
    );
    document.documentElement.classList.remove("nara-scroll-lock");
  }

  const close = shell.querySelector(
    ".nara-close-v183,[data-nara-close-v177],button[aria-label*='Tutup Nara' i],button[title='Tutup']",
  );
  if (close) {
    close.classList.add("nara-close-v183");
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara");
  }
}

function syncEditor() {
  const editor = document.querySelector(".ce-app");
  if (!editor) return;
  editor.dataset.mobileEditorV183 = RELEASE;
  editor.querySelectorAll(".ce-titlebar,.ce-file,.ce-file label,.ce-actions").forEach((node) => {
    node.removeAttribute("inert");
  });
}

function syncProfile() {
  const avatar = document.querySelector(".sn-avatar");
  if (!avatar) return;
  avatar.setAttribute("aria-label", "Buka menu profil");
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.dataset.profileSeparatedV183 = "true";
  const menu = document.querySelector(".sn-account-menu-v179,.sn-profile-menu-v150");
  if (menu) menu.dataset.profileMenuV183 = "profile-settings-logout-separated";
}

function friendlyNetworkMessages() {
  document.querySelectorAll(".bc-message,.sn-toast,.so75-startup p,[role='status'],[role='alert']").forEach((node) => {
    const value = String(node.textContent || "").trim();
    if (!/^(typeerror:\s*)?failed to fetch$/i.test(value)) return;
    node.textContent = "Koneksi data terputus sementara. Sesi login dan draf tetap tersimpan; coba lagi setelah jaringan stabil.";
    node.dataset.friendlyNetworkV183 = "true";
  });
}

function recoverStartup() {
  const startup = document.querySelector(".so75-startup");
  if (!startup || !navigator.onLine) return;
  const retry = [...startup.querySelectorAll("button")].find((button) => /coba lagi/i.test(button.textContent || ""));
  if (!retry || retry.disabled || startup.dataset.autoRetryV183 === "done") return;
  startup.dataset.autoRetryV183 = "scheduled";
  clearTimeout(startupRetryTimer);
  startupRetryTimer = window.setTimeout(() => {
    if (!visible(startup) || !navigator.onLine || retry.disabled) return;
    startup.dataset.autoRetryV183 = "done";
    retry.click();
  }, 1200);
}

function mark() {
  document.documentElement.dataset.studioInteractionPrecisionV183 = RELEASE;
  document.documentElement.dataset.sessionPolicyV183 = "persist-until-explicit-logout";
  syncDrawer();
  syncNara();
  syncEditor();
  syncProfile();
  friendlyNetworkMessages();
  recoverStartup();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(mark);
}

document.addEventListener("click", (event) => {
  const backdrop = event.target.closest(".sn-side-backdrop");
  if (backdrop) {
    event.stopPropagation();
    document.querySelector(".sn-side.mobile-open .sn-side-close")?.click();
    return;
  }

  const drawerAction = event.target.closest(".sn-side.mobile-open button,.sn-side.mobile-open a");
  if (drawerAction) requestAnimationFrame(syncDrawer);
}, true);

window.addEventListener("online", () => {
  const startup = document.querySelector(".so75-startup");
  if (startup) startup.dataset.autoRetryV183 = "";
  schedule();
}, { passive: true });
window.addEventListener("offline", schedule, { passive: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.type === "childList" || mutation.type === "attributes")) schedule();
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "inert", "aria-hidden", "data-nara-size"],
});

mark();

export { RELEASE, mark, syncDrawer, syncEditor, syncNara, syncProfile };
