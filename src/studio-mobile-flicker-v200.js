import "./studio-mobile-flicker-v200.css";

const RELEASE = "studio-mobile-flicker-v200-20260802";
let frame = 0;

function syncV200() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioMobileFlickerV200 = RELEASE;

  const drawer = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const open = Boolean(drawer?.classList.contains("mobile-open"));
  if (drawer) drawer.dataset.v200DrawerState = open ? "open" : "closed";
  if (backdrop) {
    if (backdrop.getAttribute("aria-hidden") !== String(!open)) backdrop.setAttribute("aria-hidden", String(!open));
    if (backdrop.hidden !== !open) backdrop.hidden = !open;
  }

  const naraShell = document.querySelector(".nara-assistant-shell");
  if (naraShell) {
    const size = naraShell.dataset.naraSize || "small";
    root.dataset.naraModeV200 = size;
    if (size !== "full") {
      document.body.style.removeProperty("overflow");
      root.style.removeProperty("overflow");
    }
  }
}

function scheduleV200() {
  if (!frame) frame = requestAnimationFrame(syncV200);
}

new MutationObserver(scheduleV200).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-nara-size", "data-studio-responsive-mode", "data-studio-handheld"],
});

for (const eventName of ["pageshow", "resize", "orientationchange"]) {
  window.addEventListener(eventName, scheduleV200, { passive: true });
}
window.visualViewport?.addEventListener("resize", scheduleV200, { passive: true });

syncV200();

export { RELEASE, syncV200 };
