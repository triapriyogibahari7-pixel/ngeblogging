export const DRAWER_DISMISS_RELEASE_V248 = "studio-drawer-dismiss-v248-20260803";

function smallFamily() {
  return document.documentElement.dataset.studioV248Family === "small";
}

function dismissFromOutside(event) {
  if (!smallFamily()) return;
  const side = document.getElementById("ngeblogging-studio-sidebar");
  if (!side?.classList.contains("mobile-open")) return;
  if (event.target.closest?.("#ngeblogging-studio-sidebar,.sn-sidebar-toggle")) return;
  document.querySelector(".sn-shell .sn-main .sn-sidebar-toggle")?.click();
}

if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", dismissFromOutside, true);
  document.documentElement.dataset.studioDrawerDismissV248 = DRAWER_DISMISS_RELEASE_V248;
}
