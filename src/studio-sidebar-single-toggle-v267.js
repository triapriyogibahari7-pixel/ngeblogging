import "./studio-final-device-authority-v268.css";

export const RELEASE = "studio-sidebar-single-toggle-v267-20260804";

function internalMark(target) {
  return target?.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark") || null;
}

function reactToggle() {
  return document.querySelector(".sn-top .sn-sidebar-toggle");
}

function activate(event) {
  const mark = internalMark(event.target);
  if (!mark) return;
  if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;

  // v229 and v231 are retained as compatibility backups and both historically
  // attached target listeners to this same mark. Capture the interaction first,
  // stop those duplicate target listeners, and call the single React-owned
  // toggle exactly once. This removes the open-close/open-close "macet" effect.
  event.preventDefault();
  event.stopImmediatePropagation();
  mark.dataset.sidebarSingleToggleV267 = RELEASE;
  const toggle = reactToggle();
  if (!toggle) return;
  toggle.click();
  requestAnimationFrame(() => {
    const side = document.getElementById("ngeblogging-studio-sidebar");
    if (!side) return;
    const small = document.documentElement.dataset.studioDeviceMode === "small";
    const expanded = small ? side.classList.contains("mobile-open") : !side.classList.contains("collapsed");
    mark.setAttribute("aria-expanded", String(expanded));
  });
}

if (typeof document !== "undefined") {
  document.documentElement.dataset.studioSidebarSingleToggleV267 = RELEASE;
  document.addEventListener("click", activate, true);
  document.addEventListener("keydown", activate, true);
}
