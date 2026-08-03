import "./studio-final-authority-v239.css";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY, setActiveSiteId } from "./lib/studio-data.js";
import { BUILT_IN_WIDGETS } from "./widget-system.js";

export const RELEASE = "studio-final-authority-v239-20260803";

let frame = 0;
let bootstrapRescueStarted = false;
let layoutPopover = null;
let accountSurface = "settings";

const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();
const isLarge = () => document.documentElement.dataset.v238Family === "large"
  || document.documentElement.dataset.studioDeviceMode === "large";

function safeStore(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage must not break Studio */ }
}

function clickReactSidebarToggle() {
  const toggle = document.querySelector(".sn-sidebar-toggle");
  if (!toggle) return false;
  toggle.click();
  return true;
}

function bindInternalN() {
  const mark = document.querySelector("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (!mark || mark.dataset.v239ToggleBound === RELEASE) return;
  mark.dataset.v239ToggleBound = RELEASE;
  mark.classList.add("v239-internal-n");
  mark.setAttribute("role", "button");
  mark.setAttribute("tabindex", "0");
  mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
  mark.setAttribute("aria-label", "Buka atau tutup menu Studio");
  const activate = (event) => {
    if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    clickReactSidebarToggle();
  };
  mark.addEventListener("click", activate);
  mark.addEventListener("keydown", activate);
}

function bindLargeAutoCollapse() {
  const side = document.querySelector("#ngeblogging-studio-sidebar");
  if (!side || side.dataset.v239AutoCollapse === RELEASE) return;
  side.dataset.v239AutoCollapse = RELEASE;
  side.addEventListener("click", (event) => {
    const action = event.target.closest(".sn-new, nav > button, .sn-account-settings-v135");
    if (!action || !isLarge()) return;
    window.setTimeout(() => {
      const current = document.querySelector("#ngeblogging-studio-sidebar");
      if (current && !current.classList.contains("collapsed")) clickReactSidebarToggle();
    }, 32);
  });
}

function closeProfileMenu() {
  document.querySelector(".sn-profile-menu-v150")?.remove();
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
}

function applyAccountSurface() {
  const view = [...document.querySelectorAll(".sn-view-pad")].find((node) => node.querySelector(":scope > .sn-settings-grid"));
  if (!view) return;
  const title = view.querySelector(":scope > .sn-page-title h1");
  const description = view.querySelector(":scope > .sn-page-title p");
  const sections = [...view.querySelectorAll(".sn-settings-grid > section")];
  const profile = sections.find((section) => /^profil$/i.test(cleanText(section.querySelector("h2")?.textContent)));
  const site = sections.find((section) => /^situs$/i.test(cleanText(section.querySelector("h2")?.textContent)));
  document.documentElement.dataset.v239AccountSurface = accountSurface;
  if (accountSurface === "profile") {
    if (title) title.textContent = "Profil";
    if (description) description.textContent = "Kelola identitas akun, biografi, website, dan avatar Anda.";
    if (profile) {
      profile.hidden = false;
      profile.removeAttribute("aria-hidden");
      profile.style.setProperty("display", "grid", "important");
    }
    if (site) {
      site.hidden = true;
      site.setAttribute("aria-hidden", "true");
      site.style.setProperty("display", "none", "important");
    }
  } else {
    if (title) title.textContent = "Pengaturan";
    if (description) description.textContent = "Kelola konfigurasi situs aktif, bahasa, zona waktu, dan cadangan.";
    if (profile) {
      profile.hidden = true;
      profile.setAttribute("aria-hidden", "true");
      profile.style.setProperty("display", "none", "important");
    }
    if (site) {
      site.hidden = false;
      site.removeAttribute("aria-hidden");
      site.style.setProperty("display", "grid", "important");
    }
  }
}

function openAccountSurface(next) {
  accountSurface = next;
  document.documentElement.dataset.v239AccountSurface = next;
  document.querySelector(".sn-account-settings-v135")?.click();
  closeProfileMenu();
  requestAnimationFrame(() => requestAnimationFrame(applyAccountSurface));
}

function syncProfileMenu() {
  const avatar = document.querySelector(".sn-avatar");
  if (avatar) {
    avatar.dataset.v239AccountMenu = "five-actions";
    avatar.setAttribute("aria-label", "Buka menu profil");
  }
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!menu || menu.dataset.v239ProfileMenu === RELEASE) return;
  menu.dataset.v239ProfileMenu = RELEASE;
  menu.innerHTML = `
    <button type="button" role="menuitem" data-v239-action="profile"><span>Profil</span><small>Avatar, identitas, biografi, dan website</small></button>
    <button type="button" role="menuitem" data-v239-action="settings"><span>Pengaturan</span><small>Konfigurasi situs aktif</small></button>
    <button type="button" role="menuitem" data-v239-action="add-site"><span>Tambahkan situs</span><small>Buat atau kelola workspace lain</small></button>
    <button type="button" role="menuitem" data-v239-action="view-site"><span>Lihat situs</span><small>Buka situs publik aktif</small></button>
    <button type="button" role="menuitem" data-v239-action="logout"><span>Keluar</span><small>Akhiri sesi pada perangkat ini</small></button>`;
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-v239-action]");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const action = button.dataset.v239Action;
    if (action === "profile") openAccountSurface("profile");
    if (action === "settings") openAccountSurface("settings");
    if (action === "add-site") {
      closeProfileMenu();
      document.querySelector(".sn-workspace")?.click();
    }
    if (action === "view-site") {
      const link = document.querySelector(".sn-view-site, .sn-secondary-link[href]");
      closeProfileMenu();
      link?.click();
    }
    if (action === "logout") {
      closeProfileMenu();
      document.querySelector(".sn-account-logout-v135")?.click();
    }
  }, true);
}

function ensureSummaryAddSite() {
  const actions = document.querySelector(".sn-welcome > div:last-child");
  if (!actions || actions.querySelector(".v239-add-site")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "v239-add-site";
  button.innerHTML = "<span aria-hidden=\"true\">＋</span> Tambahkan situs";
  button.addEventListener("click", () => document.querySelector(".sn-workspace")?.click());
  actions.prepend(button);
}

function fixDomainCopy() {
  document.querySelectorAll(".sv124-site-strip i").forEach((node) => {
    const match = cleanText(node.textContent).match(/^(\d+)\s*\/\s*12\s+situs dalam akun$/i);
    if (match) node.textContent = `${match[1]} situs dalam akun`;
  });
  document.querySelectorAll(".sv124-metric").forEach((metric) => {
    const label = cleanText(metric.querySelector("span")?.textContent);
    if (/kapasitas akun/i.test(label)) {
      const value = metric.querySelector("b");
      if (value) value.textContent = cleanText(value.textContent).replace(/\s*\/\s*12$/, "");
      const title = metric.querySelector("span");
      if (title) title.textContent = "Situs dalam akun";
    }
  });
}

function syncNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const modal = size === "full";
  layer.dataset.v239NaraMode = modal ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", modal ? "true" : "false");
  shell.dataset.v239NaraSize = size;
  const attachment = shell.querySelector(".nara-attachment-menu");
  if (attachment) attachment.dataset.v239AttachmentMenu = "camera-photo-file";
}

function lineNumbersFor(textarea, gutter) {
  const count = Math.min(10000, Math.max(1, String(textarea.value || "").split("\n").length));
  if (gutter.dataset.lines === String(count)) return;
  gutter.dataset.lines = String(count);
  const numbers = Array.from({ length: count }, (_, index) => String(index + 1)).join("\n");
  gutter.textContent = numbers;
}

function ensureCodeGutter() {
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    if (textarea.dataset.v239CodeEditor === RELEASE) return;
    textarea.dataset.v239CodeEditor = RELEASE;
    const wrap = document.createElement("div");
    wrap.className = "v239-code-editor";
    const gutter = document.createElement("pre");
    gutter.className = "v239-code-gutter";
    gutter.setAttribute("aria-hidden", "true");
    textarea.parentNode.insertBefore(wrap, textarea);
    wrap.append(gutter, textarea);
    const sync = () => lineNumbersFor(textarea, gutter);
    textarea.addEventListener("input", sync);
    textarea.addEventListener("scroll", () => { gutter.scrollTop = textarea.scrollTop; });
    sync();
  });
}

function removeLayoutPopover() {
  layoutPopover?.remove();
  layoutPopover = null;
}

function waitForWidgetStudio(callback, attempts = 24) {
  const studio = document.querySelector(".tn-widget-studio");
  if (studio) { callback(studio); return; }
  if (attempts <= 0) {
    delete document.documentElement.dataset.v239WidgetAutoconfigure;
    return;
  }
  requestAnimationFrame(() => waitForWidgetStudio(callback, attempts - 1));
}

function autoConfigureWidget(widget, area) {
  document.documentElement.dataset.v239WidgetAutoconfigure = "true";
  document.querySelector(".tn-layout-studio-header button")?.click();
  waitForWidgetStudio((studio) => {
    const articles = [...studio.querySelectorAll(".tn-widget-grid > article")];
    let article = articles.find((node) => cleanText(node.querySelector(".tn-widget-toggle b")?.textContent) === widget.name);
    if (!article) { delete document.documentElement.dataset.v239WidgetAutoconfigure; return; }
    if (!article.classList.contains("active")) article.querySelector(".tn-widget-toggle")?.click();
    const finish = (remaining = 18) => {
      const current = [...document.querySelectorAll(".tn-widget-grid > article")].find((node) => cleanText(node.querySelector(".tn-widget-toggle b")?.textContent) === widget.name);
      const select = current?.querySelector(".tn-widget-settings select");
      if (!select && remaining > 0) { requestAnimationFrame(() => finish(remaining - 1)); return; }
      if (select) {
        select.value = area;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      requestAnimationFrame(() => {
        const save = [...document.querySelectorAll(".tn-modal footer button")].find((button) => /simpan widget/i.test(cleanText(button.textContent)));
        save?.click();
        delete document.documentElement.dataset.v239WidgetAutoconfigure;
      });
    };
    finish();
  });
}

function showLayoutPopover(anchor, area) {
  removeLayoutPopover();
  const popover = document.createElement("div");
  popover.className = "v239-layout-popover";
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", "Pilih widget untuk area tata letak");
  popover.innerHTML = `<header><div><small>AREA TERPILIH</small><b>${cleanText(anchor.textContent)}</b></div><button type="button" data-close aria-label="Tutup">×</button></header><div class="v239-layout-widget-options"></div><footer><button type="button" data-edit-code>Edit HTML · CSS · JavaScript</button></footer>`;
  const options = popover.querySelector(".v239-layout-widget-options");
  for (const widget of BUILT_IN_WIDGETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.widgetId = widget.id;
    button.innerHTML = `<span>${widget.icon}</span><div><b>${widget.name}</b><small>${widget.category}</small></div>`;
    button.addEventListener("click", () => {
      removeLayoutPopover();
      autoConfigureWidget(widget, area);
    });
    options.append(button);
  }
  popover.querySelector("[data-close]").addEventListener("click", removeLayoutPopover);
  popover.querySelector("[data-edit-code]").addEventListener("click", () => {
    removeLayoutPopover();
    const edit = [...document.querySelectorAll(".tn-hero-actions button,.tn-command button")].find((button) => /edit html/i.test(cleanText(button.textContent)));
    edit?.click();
  });
  document.body.append(popover);
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(360, Math.max(280, window.innerWidth - 24));
  const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left + rect.width / 2 - width / 2));
  const preferredTop = rect.bottom + 8;
  const top = Math.min(window.innerHeight - Math.min(460, window.innerHeight - 24), Math.max(12, preferredTop));
  Object.assign(popover.style, { width: `${width}px`, left: `${left}px`, top: `${top}px` });
  layoutPopover = popover;
}

function buildLayoutMap() {
  const canvas = document.querySelector(".tn-layout-canvas");
  if (!canvas || canvas.dataset.v239LayoutMap === RELEASE) return;
  canvas.dataset.v239LayoutMap = RELEASE;
  canvas.id = "ngeblogging-layout-map-v239";
  canvas.innerHTML = `
    <div class="v239-map-frame">
      <button class="v239-map-strip header" data-area="header-left"><span>Header</span></button>
      <button class="v239-map-strip nav" data-area="below-header"><span>Navigasi</span></button>
      <div class="v239-map-content">
        <div class="v239-map-side left">
          <button data-area="sidebar-left"><span>Widget kiri 1</span></button>
          <button data-area="sidebar-left"><span>Widget kiri 2</span></button>
          <button data-area="sidebar-left"><span>Widget kiri 3</span></button>
          <button data-area="sidebar-left"><span>Widget kiri 4</span></button>
        </div>
        <button class="v239-map-post" data-area="after-content"><small>POST / PAGE</small><strong>Konten utama</strong><i></i><i></i><i class="short"></i></button>
        <div class="v239-map-side right">
          <button data-area="sidebar-right"><span>Widget kanan 1</span></button>
          <button data-area="sidebar-right"><span>Widget kanan 2</span></button>
          <button data-area="sidebar-right"><span>Widget kanan 3</span></button>
          <button data-area="sidebar-right"><span>Widget kanan 4</span></button>
        </div>
      </div>
      <button class="v239-map-strip after" data-area="before-content"><span>Area konten tambahan</span></button>
      <button class="v239-map-strip footer" data-area="footer-wide"><span>Footer</span></button>
    </div>`;
  canvas.querySelectorAll("button[data-area]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showLayoutPopover(button, button.dataset.area);
    });
  });
}

function bootstrapRescue() {
  const startup = document.querySelector(".so75-startup");
  if (!startup || bootstrapRescueStarted || !supabaseConfigured || !supabase) return;
  bootstrapRescueStarted = true;
  const timeout = new Promise((_, reject) => window.setTimeout(() => reject(new Error("bootstrap rescue timeout")), 9000));
  Promise.race([
    (async () => {
      const sessionResult = await supabase.auth.getSession();
      const user = sessionResult.data?.session?.user;
      if (!user?.id) return null;
      const result = await supabase.from("site_members")
        .select("site_id,role,joined_at,sites(id,name,slug,description,status,is_public,blueprint,theme_key,settings,published_at,created_at,updated_at)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true })
        .limit(1);
      if (result.error) throw result.error;
      const membership = result.data?.[0];
      const site = membership?.sites ? { ...membership.sites, role: membership.role } : null;
      if (!site?.id) return null;
      setActiveSiteId(site.id);
      safeStore(ACTIVE_SITE_STORAGE_KEY, site.id);
      safeStore("ngeblogging-active-site-snapshot-v209", JSON.stringify(site));
      window.__ngebloggingActiveSite = site;
      document.documentElement.dataset.activeSiteId = site.id;
      document.documentElement.dataset.activeSiteSlug = site.slug || "";
      document.documentElement.dataset.v239BootstrapRescue = "site-confirmed";
      return site;
    })(),
    timeout,
  ]).then((site) => {
    if (!site) return;
    const retry = [...document.querySelectorAll(".so75-startup button")].find((button) => /coba lagi/i.test(cleanText(button.textContent)));
    if (retry) retry.click();
  }).catch(() => {
    document.documentElement.dataset.v239BootstrapRescue = "deferred";
  });
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioFinalAuthorityV239 = RELEASE;
  bindInternalN();
  bindLargeAutoCollapse();
  syncProfileMenu();
  applyAccountSurface();
  ensureSummaryAddSite();
  fixDomainCopy();
  syncNara();
  ensureCodeGutter();
  buildLayoutMap();
  bootstrapRescue();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-nara-size", "hidden", "aria-expanded"],
});
window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("online", () => { bootstrapRescueStarted = false; schedule(); }, { passive: true });
document.addEventListener("click", (event) => {
  if (layoutPopover && !layoutPopover.contains(event.target) && !event.target.closest("#ngeblogging-layout-map-v239")) removeLayoutPopover();
});
sync();
