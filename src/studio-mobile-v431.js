/* v431 — the closed mobile sidebar N is the React toggle, therefore it must remain interactive.
   Older accessibility authorities marked the entire closed sidebar inert because they expected
   a separate top toggle. v429 intentionally removed that top toggle, so v431 restores the
   correct single-control contract. */
const RELEASE = "studio-mobile-v431-interaction-20261001";

function smallMode() {
  const html = document.documentElement;
  return html.dataset.studioDeviceMode === "small" ||
    html.classList.contains("editor-v266-small") ||
    html.classList.contains("studio-v265-small") ||
    ["application","phone","mobile","compact"].includes(html.dataset.studioResponsiveMode);
}

function repairSidebarInteraction() {
  if (!smallMode()) return;
  const side = document.getElementById("ngeblogging-studio-sidebar");
  if (!side) return;
  side.removeAttribute("inert");
  side.setAttribute("aria-hidden", "false");
  const mark = side.querySelector(":scope > .sn-logo > .sn-logo-mark");
  if (mark) {
    mark.disabled = false;
    mark.removeAttribute("inert");
    mark.setAttribute("role", "button");
    mark.style.pointerEvents = "auto";
  }
  side.dataset.mobileInteractionAuthority = RELEASE;
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(repairSidebarInteraction);
}

new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class","inert","aria-hidden"]});
window.addEventListener("pageshow",schedule,{passive:true});
window.addEventListener("resize",schedule,{passive:true});
window.addEventListener("orientationchange",schedule,{passive:true});
schedule();
