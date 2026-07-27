const RELEASE = "sidebar-settings-v81-20260728";
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
  let footer = side.querySelector(":scope > .sn-side-footer-v81");
  if (!footer) {
    footer = document.createElement("div");
    footer.className = "sn-side-footer-v81";
    footer.dataset.release = RELEASE;
    footer.setAttribute("role", "navigation");
    footer.setAttribute("aria-label", "Pengaturan dan sesi");
    footer.innerHTML = `
      <button type="button" class="sn-footer-action-v81 settings" data-sidebar-action="settings" aria-label="Buka Pengaturan">
        ${icon("settings")}<span>Pengaturan</span>
      </button>
      <button type="button" class="sn-footer-action-v81 logout" data-sidebar-action="logout" aria-label="Keluar dari Ngeblogging">
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
      sourceButton(currentSide, "Keluar")?.click();
    });
    side.append(footer);
  }
  return footer;
}

function hideSource(button, key) {
  if (!button) return;
  button.dataset.sidebarSourceV81 = key;
  button.setAttribute("aria-hidden", "true");
  button.tabIndex = -1;
  button.style.setProperty("display", "none", "important");
}

function sync() {
  document.documentElement.dataset.sidebarSettingsV81 = RELEASE;
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

  settingsProxy?.classList.toggle("active", Boolean(settings?.classList.contains("active")));
  settingsProxy?.setAttribute("aria-current", settings?.classList.contains("active") ? "page" : "false");
  if (logoutProxy) logoutProxy.disabled = !logout;

  side.dataset.sidebarFooterAuthority = RELEASE;
  footer.hidden = false;
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

const style = document.createElement("style");
style.dataset.release = RELEASE;
style.textContent = `
  .sn-side{min-height:100dvh!important;overflow:hidden!important;display:flex!important;flex-direction:column!important}
  .sn-side>nav{flex:1 1 auto!important;min-height:0!important;overflow-x:hidden!important;overflow-y:auto!important;padding-bottom:8px!important}
  .sn-side-footer-v81{flex:0 0 auto!important;display:grid!important;gap:4px!important;padding:9px 8px max(10px,env(safe-area-inset-bottom))!important;border-top:1px solid #e2e7ee!important;background:#fff!important;box-shadow:0 -10px 22px rgba(23,37,60,.05)!important}
  .sn-footer-action-v81{width:100%!important;min-height:42px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;border:0!important;border-radius:9px!important;padding:0 11px!important;background:transparent!important;color:#64738a!important;font:900 9px/1 "DM Sans",sans-serif!important;text-align:left!important;cursor:pointer!important}
  .sn-footer-action-v81:hover,.sn-footer-action-v81.active{background:#eaf2ff!important;color:#245fc9!important}
  .sn-footer-action-v81.logout{background:#fff0f2!important;color:#a23c49!important}
  .sn-footer-action-v81.logout:hover{background:#ffe7ea!important}
  .sn-footer-action-v81:disabled{opacity:.5!important;cursor:not-allowed!important}
  .sn-footer-action-v81 svg{width:17px!important;height:17px!important;flex:0 0 auto!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}
  .sn-side.collapsed .sn-footer-action-v81{width:46px!important;min-width:46px!important;max-width:46px!important;height:46px!important;min-height:46px!important;max-height:46px!important;margin:0 auto!important;padding:0!important;display:grid!important;place-items:center!important}
  .sn-side.collapsed .sn-footer-action-v81 span{display:none!important}
  html[data-layout-mode="tablet"] .sn-side-footer-v81{padding-inline:8px!important}
  html[data-layout-mode="tablet"] .sn-footer-action-v81{width:48px!important;min-width:48px!important;max-width:48px!important;height:48px!important;min-height:48px!important;max-height:48px!important;margin:0 auto!important;padding:0!important;display:grid!important;place-items:center!important}
  html[data-layout-mode="tablet"] .sn-footer-action-v81 span{display:none!important}
  @media(max-width:760px){
    html:not([data-desktop-layout-requested="true"]) .sn-side-footer-v81{display:grid!important;padding:7px 8px max(8px,env(safe-area-inset-bottom))!important}
    html:not([data-desktop-layout-requested="true"]) .sn-side.collapsed .sn-side-footer-v81{padding-inline:8px!important}
  }
`;
document.head.append(style);

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.type === "childList" || mutation.attributeName === "class")) schedule();
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
window.addEventListener("pageshow", schedule);
schedule();
