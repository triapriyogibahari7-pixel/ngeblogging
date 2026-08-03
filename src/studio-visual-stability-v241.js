import "./studio-visual-stability-v241.css";
import { openProfile } from "./studio-finalization-v178.js";
import { loadAnalytics } from "./studio-analytics-v41.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS } from "./widget-system.js";

export const RELEASE = "studio-visual-stability-v241-20260803";

let frame = 0;
let accountMenu = null;
let attachmentPortal = null;
let widgetPicker = null;
const boundShadowRoots = new WeakSet();

const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
const smallFamily = () => document.documentElement.dataset.v238Family === "small"
  || document.documentElement.dataset.studioDeviceMode === "small";

function removeNode(node) {
  node?.remove?.();
}

function closeAccountMenu() {
  removeNode(accountMenu);
  accountMenu = null;
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
}

function closeAttachmentPortal() {
  removeNode(attachmentPortal);
  attachmentPortal = null;
}

function closeWidgetPicker() {
  removeNode(widgetPicker);
  widgetPicker = null;
}

function viewportPosition(anchor, box, preferred = "below") {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(Number(box.dataset.preferredWidth || 340), Math.max(260, innerWidth - 20));
  const maxHeight = Math.min(Number(box.dataset.preferredHeight || 480), Math.max(220, innerHeight - 20));
  const left = Math.min(innerWidth - width - 10, Math.max(10, rect.left + rect.width - width));
  let top = preferred === "above" ? rect.top - maxHeight - 8 : rect.bottom + 8;
  if (top < 10 || top + maxHeight > innerHeight - 10) top = Math.max(10, Math.min(innerHeight - maxHeight - 10, rect.top - maxHeight - 8));
  Object.assign(box.style, { width: `${width}px`, maxHeight: `${maxHeight}px`, left: `${left}px`, top: `${top}px` });
}

function accountAction(action) {
  const avatar = document.querySelector(".sn-avatar");
  closeAccountMenu();
  if (action === "profile") {
    openProfile(avatar);
    return;
  }
  if (action === "settings") {
    document.documentElement.dataset.v239AccountSurface = "settings";
    document.querySelector(".sn-account-settings-v135")?.click();
    return;
  }
  if (action === "add-site") {
    document.querySelector(".sn-workspace")?.click();
    return;
  }
  if (action === "view-site") {
    document.querySelector(".sn-view-site[href],.sn-secondary-link[href]")?.click();
    return;
  }
  if (action === "logout") document.querySelector(".sn-account-logout-v135")?.click();
}

function openAccountMenu(anchor) {
  closeAccountMenu();
  document.querySelector(".sn-profile-menu-v150")?.remove();
  const menu = document.createElement("div");
  menu.className = "v241-account-menu";
  menu.dataset.preferredWidth = "330";
  menu.dataset.preferredHeight = "430";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Menu profil pengguna");
  menu.innerHTML = `
    <button type="button" role="menuitem" data-action="profile"><b>Profil</b><small>Avatar, identitas, biografi, dan website</small></button>
    <button type="button" role="menuitem" data-action="settings"><b>Pengaturan</b><small>Konfigurasi situs aktif</small></button>
    <button type="button" role="menuitem" data-action="add-site"><b>Tambahkan situs</b><small>Buat atau kelola workspace lain</small></button>
    <button type="button" role="menuitem" data-action="view-site"><b>Lihat situs</b><small>Buka situs publik aktif</small></button>
    <button type="button" role="menuitem" class="danger" data-action="logout"><b>Keluar</b><small>Akhiri sesi pada perangkat ini</small></button>`;
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (button) accountAction(button.dataset.action);
  });
  document.body.append(menu);
  viewportPosition(anchor, menu, "below");
  accountMenu = menu;
  anchor.setAttribute("aria-expanded", "true");
  menu.querySelector("button")?.focus({ preventScroll: true });
}

function bindAccountPortal() {
  if (document.documentElement.dataset.v241AccountBinding === RELEASE) return;
  document.documentElement.dataset.v241AccountBinding = RELEASE;
  document.addEventListener("click", (event) => {
    const avatar = event.target.closest(".sn-avatar");
    if (!avatar) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (accountMenu) closeAccountMenu();
    else openAccountMenu(avatar);
  }, true);
}

function naraInput(kind) {
  const composer = document.querySelector(".nara-composer");
  if (!composer) return null;
  if (kind === "camera") return composer.querySelector('input[type="file"][capture]');
  if (kind === "photo") return [...composer.querySelectorAll('input[type="file"][accept*="image"]')].find((input) => !input.hasAttribute("capture"));
  return [...composer.querySelectorAll('input[type="file"]')].find((input) => /txt|markdown|csv|json/i.test(input.getAttribute("accept") || ""));
}

function openAttachmentPortal(anchor) {
  closeAttachmentPortal();
  const portal = document.createElement("div");
  portal.className = "v241-nara-attachment-portal";
  portal.dataset.preferredWidth = smallFamily() ? "300" : "320";
  portal.dataset.preferredHeight = "230";
  portal.setAttribute("role", "menu");
  portal.setAttribute("aria-label", "Tambah lampiran Nara AI");
  portal.innerHTML = `
    <button type="button" data-kind="camera"><span>📷</span><div><b>Kamera</b><small>Ambil foto sekarang</small></div></button>
    <button type="button" data-kind="photo"><span>▧</span><div><b>Foto</b><small>Pilih gambar dari perangkat</small></div></button>
    <button type="button" data-kind="file"><span>▤</span><div><b>File</b><small>TXT, Markdown, CSV, atau JSON</small></div></button>`;
  portal.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-kind]");
    if (!button) return;
    const input = naraInput(button.dataset.kind);
    closeAttachmentPortal();
    input?.click();
  });
  document.body.append(portal);
  viewportPosition(anchor, portal, "above");
  attachmentPortal = portal;
}

function bindNaraAttachmentPortal() {
  if (document.documentElement.dataset.v241NaraAttachmentBinding === RELEASE) return;
  document.documentElement.dataset.v241NaraAttachmentBinding = RELEASE;
  document.addEventListener("click", (event) => {
    const plus = event.target.closest(".nara-attachment-menu-wrap > button");
    if (!plus) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    document.querySelector(".nara-attachment-menu")?.remove();
    if (attachmentPortal) closeAttachmentPortal();
    else openAttachmentPortal(plus);
  }, true);
}

function addAreaOptions(select) {
  if (!select) return;
  for (const area of LAYOUT_AREAS) {
    if ([...select.options].some((option) => option.value === area.id)) continue;
    const option = document.createElement("option");
    option.value = area.id;
    option.textContent = area.label;
    select.append(option);
  }
}

function waitForWidgetStudio(callback, remaining = 32) {
  const studio = document.querySelector(".tn-widget-studio");
  if (studio) return callback(studio);
  if (remaining > 0) requestAnimationFrame(() => waitForWidgetStudio(callback, remaining - 1));
}

function configureWidget(widget, area) {
  document.documentElement.dataset.v241WidgetAutoconfigure = "true";
  document.querySelector(".tn-layout-studio-header button")?.click();
  waitForWidgetStudio((studio) => {
    const findArticle = () => [...studio.querySelectorAll(".tn-widget-grid > article")]
      .find((node) => text(node.querySelector(".tn-widget-toggle b")?.textContent) === widget.name);
    let article = findArticle();
    if (!article) {
      delete document.documentElement.dataset.v241WidgetAutoconfigure;
      return;
    }
    if (!article.classList.contains("active")) article.querySelector(".tn-widget-toggle")?.click();
    const finish = (remaining = 24) => {
      article = findArticle();
      const select = article?.querySelector(".tn-widget-settings select");
      if (!select && remaining > 0) return requestAnimationFrame(() => finish(remaining - 1));
      if (select) {
        addAreaOptions(select);
        select.value = area;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      requestAnimationFrame(() => {
        const save = [...document.querySelectorAll(".tn-modal footer button")]
          .find((button) => /simpan widget/i.test(text(button.textContent)));
        save?.click();
        delete document.documentElement.dataset.v241WidgetAutoconfigure;
      });
    };
    finish();
  });
}

function openWidgetPicker(anchor, area) {
  closeWidgetPicker();
  const picker = document.createElement("div");
  picker.className = "v241-widget-picker";
  picker.dataset.preferredWidth = "370";
  picker.dataset.preferredHeight = "500";
  picker.setAttribute("role", "dialog");
  picker.setAttribute("aria-label", "Pilih widget untuk slot tata letak");
  picker.innerHTML = `<header><div><small>SLOT TATA LETAK</small><b>${text(anchor.textContent) || area}</b></div><button type="button" data-close aria-label="Tutup">×</button></header><div class="v241-widget-options"></div><footer><button type="button" data-code>Edit HTML · CSS · JavaScript</button></footer>`;
  const options = picker.querySelector(".v241-widget-options");
  for (const widget of BUILT_IN_WIDGETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.widget = widget.id;
    button.innerHTML = `<span>${widget.icon}</span><div><b>${widget.name}</b><small>${widget.category}${widget.id === "custom-html" ? " · HTML / JavaScript kustom" : ""}</small></div>`;
    button.addEventListener("click", () => {
      closeWidgetPicker();
      configureWidget(widget, area);
    });
    options.append(button);
  }
  picker.querySelector("[data-close]").addEventListener("click", closeWidgetPicker);
  picker.querySelector("[data-code]").addEventListener("click", () => {
    closeWidgetPicker();
    [...document.querySelectorAll(".tn-hero-actions button,.tn-command button")]
      .find((button) => /edit html/i.test(text(button.textContent)))?.click();
  });
  document.body.append(picker);
  viewportPosition(anchor, picker, "below");
  widgetPicker = picker;
}

function shadowOverrideCss() {
  return `
    :host{container-type:inline-size;display:block;width:100%;max-width:100%;min-width:0}
    .frame{width:min(1080px,100%)!important;min-width:0!important;max-width:100%!important;padding:8px!important;overflow:visible!important}
    .content{grid-template-columns:minmax(130px,.25fr) minmax(0,.5fr) minmax(130px,.25fr)!important;min-width:0!important;min-height:390px!important}
    .side button{min-width:0!important;min-height:72px!important;padding:8px!important;font-size:12px!important;line-height:1.25!important;white-space:normal!important}
    .post{min-width:0!important;padding:clamp(16px,4cqw,38px)!important}.post strong{font-size:clamp(22px,4cqw,42px)!important;line-height:1.05!important}
    @media(max-width:700px){
      .frame{width:100%!important;padding:5px!important;gap:6px!important}
      .content{grid-template-columns:minmax(78px,.28fr) minmax(0,.44fr) minmax(78px,.28fr)!important;gap:6px!important;min-height:430px!important}
      .side{gap:6px!important}.side button{min-height:92px!important;padding:5px!important;font-size:10px!important}
      .post{padding:12px!important}.post small{font-size:9px!important}.post strong{font-size:clamp(18px,5cqw,28px)!important;margin:.4rem 0 1rem!important}
      .strip{font-size:11px!important}.header{min-height:54px!important}.nav{min-height:40px!important}.after{min-height:44px!important}.footer{min-height:58px!important}
    }
    @media(max-width:380px){
      .content{grid-template-columns:minmax(68px,.29fr) minmax(0,.42fr) minmax(68px,.29fr)!important;gap:4px!important}.side{gap:4px!important}.side button{font-size:9px!important}
    }`;
}

function repairShadowMaps() {
  document.querySelectorAll(".tn-layout-canvas").forEach((canvas) => {
    const root = canvas.shadowRoot;
    if (!root) return;
    let style = root.getElementById("v241-shadow-map-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "v241-shadow-map-style";
      style.textContent = shadowOverrideCss();
      root.append(style);
    }
    if (boundShadowRoots.has(root)) return;
    boundShadowRoots.add(root);
    root.addEventListener("click", (event) => {
      const button = event.composedPath().find((node) => node instanceof HTMLElement && node.matches?.("button[data-area]"));
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openWidgetPicker(button, button.dataset.area);
    }, true);
  });
}

function ensureAnalytics() {
  const view = [...document.querySelectorAll(".sn-view-pad")]
    .find((node) => /^analitik$/i.test(text(node.querySelector(":scope > .sn-page-title h1")?.textContent)));
  if (!view || view.dataset.v241AnalyticsRequested === "true") return;
  view.dataset.v241AnalyticsRequested = "true";
  loadAnalytics(view, 30, false).catch(() => {
    delete view.dataset.v241AnalyticsRequested;
  });
}

function syncNaraMode() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) return;
  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize) ? shell.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.v241NaraMode = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  shell.dataset.v241NaraSize = size;
  if (!full) {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
  }
}

function syncSidebarAndProfile() {
  const avatar = document.querySelector(".sn-avatar");
  if (avatar) {
    avatar.hidden = false;
    avatar.removeAttribute("inert");
    avatar.dataset.v241Profile = "five-action-menu";
    avatar.setAttribute("aria-haspopup", "menu");
  }
  const sidebar = document.querySelector("#ngeblogging-studio-sidebar");
  const mark = sidebar?.querySelector(".sn-logo-mark");
  if (mark) {
    mark.hidden = false;
    mark.dataset.v241InternalN = "single-toggle";
  }
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioVisualStabilityV241 = RELEASE;
  bindAccountPortal();
  bindNaraAttachmentPortal();
  syncSidebarAndProfile();
  syncNaraMode();
  repairShadowMaps();
  ensureAnalytics();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-nara-size", "data-v238-family", "aria-expanded"],
});
for (const eventName of ["resize", "orientationchange", "pageshow"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeAccountMenu();
  closeAttachmentPortal();
  closeWidgetPicker();
});
document.addEventListener("click", (event) => {
  if (accountMenu && !accountMenu.contains(event.target) && !event.target.closest?.(".sn-avatar")) closeAccountMenu();
  if (attachmentPortal && !attachmentPortal.contains(event.target) && !event.target.closest?.(".nara-attachment-menu-wrap")) closeAttachmentPortal();
  if (widgetPicker && !widgetPicker.contains(event.target)) closeWidgetPicker();
});

sync();