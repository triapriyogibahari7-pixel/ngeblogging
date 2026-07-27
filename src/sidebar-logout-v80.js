const RELEASE = "sidebar-footer-v82-20260728";
let frame = 0;

function label(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function sourceButton(side, name) {
  return [...(side?.querySelectorAll(":scope > nav > button") || [])]
    .find((button) => label(button) === name) || null;
}

function icon(name) {
  if (name === "settings") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.04.08h-4l-.04-.08a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.08-.04v-4L4 9.92a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.04-.08h4l.04.08a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.08.38.3.74.6 1l.08.04v4L20 14.08c-.3.26-.52.62-.6 1Z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg>';
}

function ensureFooter(side) {
  let footer = side.querySelector(":scope > .sn-side-footer-v82");
  if (!footer) {
    side.querySelectorAll(":scope > .sn-side-footer-v80, :scope > .sn-side-footer-v81").forEach((node) => node.remove());
    footer = document.createElement("div");
    footer.className = "sn-side-footer-v82";
    footer.dataset.release = RELEASE;
    footer.setAttribute("role", "navigation");
    footer.setAttribute("aria-label", "Pengaturan dan sesi akun");
    footer.innerHTML = `
      <button type="button" class="sn-footer-action-v82 settings" data-sidebar-action="settings" aria-label="Buka Pengaturan">
        ${icon("settings")}<span>Pengaturan</span>
      </button>
      <button type="button" class="sn-footer-action-v82 logout" data-sidebar-action="logout" aria-label="Keluar dari Ngeblogging">
        ${icon("logout")}<span>Keluar</span>
      </button>`;
    footer.addEventListener("click", (event) => {
      const action = event.target.closest("[data-sidebar-action]")?.dataset.sidebarAction;
      if (!action) return;
      const currentSide = footer.closest(".sn-side");
      if (action === "settings") {
        const settings = sourceButton(currentSide, "Pengaturan");
        if (settings) settings.click();
        else document.querySelector(".sn-avatar")?.click();
        return;
      }
      const logout = sourceButton(currentSide, "Keluar");
      if (logout) logout.click();
    });
    side.append(footer);
  }
  return footer;
}

function hideSource(button, key) {
  if (!button) return;
  button.dataset.sidebarSourceV82 = key;
  button.setAttribute("aria-hidden", "true");
  button.tabIndex = -1;
  button.style.setProperty("display", "none", "important");
}

function sync() {
  document.documentElement.dataset.sidebarFooterV82 = RELEASE;
  const side = document.querySelector(".sn-shell > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  if (!side || !nav) return;

  const settings = sourceButton(side, "Pengaturan");
  const logout = sourceButton(side, "Keluar");
  const footer = ensureFooter(side);
  const settingsProxy = footer.querySelector('[data-sidebar-action="settings"]');
  const logoutProxy = footer.querySelector('[data-sidebar-action="logout"]');

  hideSource(settings, "settings");
  hideSource(logout, "logout");

  const settingsActive = Boolean(settings?.classList.contains("active"));
  settingsProxy?.classList.toggle("active", settingsActive);
  settingsProxy?.setAttribute("aria-current", settingsActive ? "page" : "false");
  if (settingsProxy) settingsProxy.disabled = !settings && !document.querySelector(".sn-avatar");
  if (logoutProxy) logoutProxy.disabled = !logout;

  side.dataset.sidebarFooterAuthority = RELEASE;
  footer.hidden = false;
  footer.style.setProperty("display", "grid", "important");
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

const style = document.createElement("style");
style.dataset.release = RELEASE;
style.textContent = `
  .sn-side{
    --sn-footer-v82-height:132px;
    min-height:100dvh!important;
    height:100dvh!important;
    overflow:hidden!important;
    display:flex!important;
    flex-direction:column!important;
    position:fixed!important;
  }
  .sn-side>nav{
    flex:1 1 auto!important;
    min-height:0!important;
    overflow-x:hidden!important;
    overflow-y:auto!important;
    padding-bottom:calc(var(--sn-footer-v82-height) + 12px)!important;
    overscroll-behavior:contain!important;
  }
  .sn-side-footer-v82{
    position:absolute!important;
    left:0!important;
    right:0!important;
    bottom:0!important;
    z-index:8!important;
    min-height:var(--sn-footer-v82-height)!important;
    display:grid!important;
    grid-template-columns:minmax(0,1fr)!important;
    align-content:center!important;
    gap:8px!important;
    padding:11px 12px max(12px,env(safe-area-inset-bottom))!important;
    border-top:1px solid #dfe6ef!important;
    background:rgba(255,255,255,.98)!important;
    box-shadow:0 -16px 34px rgba(23,37,60,.09)!important;
    backdrop-filter:blur(16px)!important;
    box-sizing:border-box!important;
  }
  .sn-footer-action-v82{
    width:100%!important;
    min-width:0!important;
    min-height:48px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:flex-start!important;
    gap:12px!important;
    border:1px solid transparent!important;
    border-radius:12px!important;
    padding:0 14px!important;
    background:#f7f9fc!important;
    color:#52647c!important;
    font-family:"DM Sans",system-ui,sans-serif!important;
    font-size:12px!important;
    line-height:1!important;
    font-weight:800!important;
    letter-spacing:0!important;
    text-align:left!important;
    cursor:pointer!important;
    box-sizing:border-box!important;
    transition:background .16s ease,color .16s ease,border-color .16s ease,transform .16s ease!important;
  }
  .sn-footer-action-v82:hover,
  .sn-footer-action-v82:focus-visible,
  .sn-footer-action-v82.active{
    background:#eaf2ff!important;
    border-color:#cfe0fb!important;
    color:#245fc9!important;
    outline:none!important;
  }
  .sn-footer-action-v82:active{transform:translateY(1px)!important}
  .sn-footer-action-v82.logout{
    background:#fff2f3!important;
    border-color:#f7dfe3!important;
    color:#a23c49!important;
  }
  .sn-footer-action-v82.logout:hover,
  .sn-footer-action-v82.logout:focus-visible{
    background:#ffe7ea!important;
    border-color:#efc8cf!important;
  }
  .sn-footer-action-v82:disabled{opacity:.48!important;cursor:not-allowed!important}
  .sn-footer-action-v82 svg{
    width:20px!important;
    min-width:20px!important;
    height:20px!important;
    flex:0 0 20px!important;
    fill:none!important;
    stroke:currentColor!important;
    stroke-width:1.8!important;
    stroke-linecap:round!important;
    stroke-linejoin:round!important;
  }
  .sn-footer-action-v82 span{display:block!important;white-space:nowrap!important}

  .sn-side.collapsed{--sn-footer-v82-height:124px}
  .sn-side.collapsed .sn-side-footer-v82{padding-inline:10px!important}
  .sn-side.collapsed .sn-footer-action-v82{
    width:48px!important;
    min-width:48px!important;
    max-width:48px!important;
    height:48px!important;
    min-height:48px!important;
    max-height:48px!important;
    margin:0 auto!important;
    padding:0!important;
    display:grid!important;
    place-items:center!important;
  }
  .sn-side.collapsed .sn-footer-action-v82 span{display:none!important}

  html[data-layout-mode="tablet"] .sn-side{--sn-footer-v82-height:128px}
  html[data-layout-mode="tablet"] .sn-footer-action-v82{
    width:50px!important;
    min-width:50px!important;
    max-width:50px!important;
    height:50px!important;
    min-height:50px!important;
    max-height:50px!important;
    margin:0 auto!important;
    padding:0!important;
    display:grid!important;
    place-items:center!important;
  }
  html[data-layout-mode="tablet"] .sn-footer-action-v82 span{display:none!important}

  @media(max-width:760px){
    html:not([data-desktop-layout-requested="true"]) .sn-side{--sn-footer-v82-height:158px}
    html:not([data-desktop-layout-requested="true"]) .sn-side-footer-v82{
      gap:10px!important;
      padding:12px 14px max(14px,env(safe-area-inset-bottom))!important;
    }
    html:not([data-desktop-layout-requested="true"]) .sn-footer-action-v82{
      min-height:58px!important;
      border-radius:14px!important;
      padding:0 18px!important;
      gap:15px!important;
      font-size:15px!important;
      font-weight:800!important;
    }
    html:not([data-desktop-layout-requested="true"]) .sn-footer-action-v82 svg{
      width:23px!important;
      min-width:23px!important;
      height:23px!important;
      flex-basis:23px!important;
    }
    html:not([data-desktop-layout-requested="true"]) .sn-side.collapsed{--sn-footer-v82-height:128px}
    html:not([data-desktop-layout-requested="true"]) .sn-side.collapsed .sn-side-footer-v82{padding:10px 8px max(10px,env(safe-area-inset-bottom))!important}
    html:not([data-desktop-layout-requested="true"]) .sn-side.collapsed .sn-footer-action-v82{
      width:48px!important;
      min-width:48px!important;
      max-width:48px!important;
      height:48px!important;
      min-height:48px!important;
      max-height:48px!important;
      padding:0!important;
    }
    html:not([data-desktop-layout-requested="true"]) .sn-side.collapsed .sn-footer-action-v82 span{display:none!important}
  }
`;
document.head.append(style);

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.type === "childList" || mutation.attributeName === "class")) schedule();
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
window.addEventListener("pageshow", schedule);
window.addEventListener("resize", schedule, { passive: true });
schedule();
