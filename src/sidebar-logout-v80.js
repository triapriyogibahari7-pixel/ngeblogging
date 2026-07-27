const RELEASE = "sidebar-logout-v80-20260727";
let frame = 0;

function label(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

function sync() {
  document.documentElement.dataset.sidebarLogoutV80 = RELEASE;
  const side = document.querySelector(".sn-shell > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  if (!side || !nav) return;
  let footer = side.querySelector(":scope > .sn-side-footer-v80");
  if (!footer) {
    footer = document.createElement("div");
    footer.className = "sn-side-footer-v80";
    footer.dataset.release = RELEASE;
    side.append(footer);
  }
  const logout = [...nav.querySelectorAll(":scope > button")].find((button) => label(button) === "Keluar")
    || [...side.querySelectorAll("button")].find((button) => label(button) === "Keluar");
  if (logout && logout.parentElement !== footer) footer.append(logout);
  if (logout) {
    logout.classList.add("sn-logout-v80");
    logout.setAttribute("aria-label", "Keluar dari Ngeblogging");
  }
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

const style = document.createElement("style");
style.dataset.release = RELEASE;
style.textContent = `
@media (min-width:901px){
  .sn-side{min-height:100dvh!important;overflow:hidden!important}
  .sn-side>nav{flex:1 1 auto!important;min-height:0!important;overflow:auto!important;padding-bottom:8px!important}
  .sn-side-footer-v80{flex:0 0 auto!important;padding:10px 8px 12px!important;border-top:1px solid #e2e7ee!important;background:#fff!important;box-shadow:0 -10px 22px rgba(23,37,60,.05)!important}
  .sn-side-footer-v80>button{width:100%!important;min-height:42px!important;display:flex!important;align-items:center!important;gap:10px!important;border:0!important;border-radius:9px!important;padding:0 11px!important;background:#fff0f2!important;color:#a23c49!important;font-size:9px!important;font-weight:900!important;text-align:left!important}
  .sn-side-footer-v80>button:hover{background:#ffe7ea!important}
  .sn-side.collapsed .sn-side-footer-v80>button{justify-content:center!important}
  .sn-side.collapsed .sn-side-footer-v80 span{display:none!important}
}
@media (max-width:900px){.sn-side-footer-v80{display:none!important}}
`;
document.head.append(style);

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("pageshow", schedule);
schedule();
