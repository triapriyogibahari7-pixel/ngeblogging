import "./studio-production-v229.css";

const RELEASE = "studio-production-v229-layout-editor-sidebar-nara-20260803";
const MAX_CODE_LINES = 10000;
let frame = 0;

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function metrics() {
  const root = document.documentElement;
  const layoutWidth = Number(root.clientWidth || innerWidth || 1);
  const layoutHeight = Number(root.clientHeight || innerHeight || 1);
  const density = Math.max(1, Number(devicePixelRatio || 1));
  const normalize = (raw, fallback) => {
    const value = Number(raw || fallback || 1);
    if (value <= 900) return value;
    return density >= 1.25 ? value / density : fallback;
  };
  const screenWidth = normalize(screen?.width, layoutWidth);
  const screenHeight = normalize(screen?.height, layoutHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  const longSide = Math.max(screenWidth, screenHeight);
  const portrait = layoutHeight >= layoutWidth;
  const physicalWidth = portrait ? shortSide : longSide;
  const handheld = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || (Number(navigator.maxTouchPoints || 0) > 1 && shortSide <= 760);
  const desktopSitePhone = handheld && layoutWidth > physicalWidth * 1.35;
  return { layoutWidth, layoutHeight, physicalWidth, shortSide, handheld, desktopSitePhone };
}

function family() {
  const root = document.documentElement;
  const view = metrics();
  if (view.desktopSitePhone || root.dataset.studioDesktopSitePhone === "true" || root.dataset.v228ModeLock === "desktop-site-large") return "large";
  const responsive = root.dataset.studioResponsiveMode || "";
  const variant = root.dataset.studioDeviceVariant || "";
  if (["application", "phone", "mobile", "compact"].includes(responsive)) return "small";
  if (["tablet", "desktop"].includes(responsive) || ["tablet", "laptop", "desktop", "computer"].includes(variant)) return "large";
  return view.shortSide < 768 ? "small" : "large";
}

function normalizeRoot() {
  const root = document.documentElement;
  const next = family();
  const view = metrics();
  root.dataset.studioProductionV229 = RELEASE;
  root.dataset.v229Family = next;
  root.dataset.v229DesktopSitePhone = String(view.desktopSitePhone);
  if (view.desktopSitePhone) {
    root.dataset.studioResponsiveMode = "desktop";
    root.dataset.studioDeviceMode = "large";
    root.dataset.studioDeviceVariant = "desktop";
    root.dataset.studioDesktopSitePhone = "true";
    root.dataset.v229ModeLock = "desktop-site-large-locked";
  } else {
    root.dataset.v229ModeLock = next === "small" ? "small-device" : "large-device";
  }
}

function normalizeLayout() {
  const map = document.querySelector('#ngeblogging-layout-map[data-v226-layout-source="native-green-reference"],#ngeblogging-layout-map.tn-layout-studio');
  const canvas = map?.querySelector('.tn-layout-canvas-v170');
  if (!map || !canvas) return;
  const next = family();
  map.dataset.v229Layout = "reference-blueprint-interactive";
  canvas.dataset.v229LayoutCanvas = next === "small" ? "scaled-reference-small" : "reference-large";
  const header = map.querySelector('.tn-layout-studio-header');
  header?.querySelectorAll('h2,p').forEach((node) => { node.hidden = true; });
  const kicker = header?.querySelector('small');
  if (kicker) kicker.textContent = "PETA TATA LETAK SITUS";
  canvas.querySelectorAll(':scope>.tn-layout-slot-v170').forEach((slot) => {
    slot.hidden = false;
    slot.removeAttribute('inert');
    slot.removeAttribute('aria-hidden');
    slot.removeAttribute('aria-disabled');
    slot.dataset.v229Slot = slot.dataset.layoutArea || "widget-area";
    important(slot, "pointer-events", "auto");
  });
  const main = canvas.querySelector(':scope>.content-main');
  if (main) {
    main.hidden = false;
    main.removeAttribute('inert');
    main.removeAttribute('aria-hidden');
    main.dataset.v229Slot = "content-main";
    important(main, "pointer-events", "auto");
  }
  const side = map.querySelector(':scope>.tn-layout-side');
  if (side) side.dataset.v229WidgetList = "below-map-full-width";
}

function lineCount(textarea) {
  return Math.max(1, String(textarea?.value || "").split("\n").length);
}

function normalizeCode() {
  document.querySelectorAll('.tn-code-workspace').forEach((workspace) => {
    const small = family() === "small";
    workspace.dataset.v229Workspace = small ? "preview-top-code-bottom" : "code-left-preview-right";
    const preview = workspace.querySelector('.tn-code-preview-pane');
    if (preview) preview.dataset.v229Preview = "centered-responsive";
    workspace.querySelectorAll('.tn-code-pane').forEach((pane) => {
      pane.dataset.v229CodePane = "numbered-long-editor";
      const textarea = pane.querySelector(':scope>textarea');
      const gutter = pane.querySelector(':scope>.v222-code-line-gutter');
      if (!textarea) return;
      textarea.setAttribute('wrap', 'off');
      textarea.setAttribute('spellcheck', 'false');
      textarea.dataset.v229Code = "actual-lines-up-to-10000";
      if (gutter) {
        gutter.hidden = false;
        gutter.dataset.v229Gutter = "actual-1-to-10000";
        const count = Math.min(MAX_CODE_LINES, lineCount(textarea));
        if (gutter.dataset.v229Count !== String(count)) {
          gutter.dataset.v229Count = String(count);
          gutter.textContent = Array.from({ length: count }, (_, index) => String(index + 1)).join("\n");
        }
        gutter.scrollTop = textarea.scrollTop;
      }
      const raw = String(textarea.value || "");
      if (raw.length > 120 && lineCount(textarea) <= 3 && textarea.dataset.v229AutoPretty !== "true") {
        textarea.dataset.v229AutoPretty = "true";
        requestAnimationFrame(() => pane.querySelector('.v222-format-code')?.click());
      }
    });
  });
}

function bindSidebarLogo() {
  const toggle = document.querySelector('.sn-sidebar-toggle');
  const logo = document.querySelector('#ngeblogging-studio-sidebar .sn-logo-mark');
  if (!toggle || !logo || logo.dataset.v229Bound === "true") return;
  logo.dataset.v229Bound = "true";
  logo.setAttribute('role', 'button');
  logo.setAttribute('tabindex', '0');
  logo.setAttribute('aria-label', 'Buka atau tutup menu Studio');
  const activate = (event) => {
    if (event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    toggle.click();
  };
  logo.addEventListener('click', activate);
  logo.addEventListener('keydown', activate);
}

function normalizeSidebar() {
  const sidebar = document.getElementById('ngeblogging-studio-sidebar');
  const main = document.querySelector('.sn-main');
  const toggle = document.querySelector('.sn-sidebar-toggle');
  if (!sidebar || !main || !toggle) return;
  const small = family() === "small";
  sidebar.dataset.v229Sidebar = small ? "mobile-drawer" : (sidebar.classList.contains('collapsed') ? "desktop-icons" : "desktop-open");
  toggle.dataset.v229Toggle = "n-only";
  toggle.querySelector('.sn-mobile-menu-mark')?.removeAttribute('aria-hidden');
  document.querySelectorAll('.sn-desktop-sidebar-icon').forEach((node) => { node.hidden = true; });
  document.querySelectorAll('.sn-side-backdrop').forEach((node) => {
    important(node, 'background', 'transparent');
    important(node, 'backdrop-filter', 'none');
    important(node, '-webkit-backdrop-filter', 'none');
  });
  bindSidebarLogo();
}

function closeProfileMenu() {
  document.querySelector('.v229-profile-menu')?.remove();
}

function openAccountView(mode) {
  const settings = [...document.querySelectorAll('#ngeblogging-studio-sidebar button')].find((button) => /Pengaturan/i.test(button.textContent || ''));
  settings?.click();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const grid = document.querySelector('.sn-settings-grid');
    const page = grid?.closest('.sn-view-pad');
    if (!grid || !page) return;
    page.dataset.v229AccountView = mode;
    const title = page.querySelector('.sn-page-title h1');
    const description = page.querySelector('.sn-page-title p');
    if (title) title.textContent = mode === 'profile' ? 'Profil' : 'Pengaturan';
    if (description) description.textContent = mode === 'profile'
      ? 'Nama, biografi, website, dan avatar akun Anda.'
      : 'Pengaturan situs aktif, bahasa, zona waktu, dan identitas situs.';
    if (mode === 'profile') page.querySelector('input[value*="http"]')?.focus?.();
  }));
}

function buildProfileMenu(anchor) {
  closeProfileMenu();
  const menu = document.createElement('div');
  menu.className = 'v229-profile-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `
    <button type="button" role="menuitem" data-action="profile">Profil & avatar</button>
    <button type="button" role="menuitem" data-action="sites">Situs saya</button>
    <button type="button" role="menuitem" data-action="view-site">Lihat situs</button>
    <button type="button" role="menuitem" data-action="settings">Pengaturan</button>
    <button type="button" role="menuitem" data-action="logout">Keluar</button>`;
  document.body.appendChild(menu);
  const rect = anchor.getBoundingClientRect();
  const width = 214;
  const left = Math.max(10, Math.min(innerWidth - width - 10, rect.right - width));
  important(menu, 'left', `${left}px`);
  important(menu, 'top', `${Math.min(innerHeight - 260, rect.bottom + 8)}px`);
  menu.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    closeProfileMenu();
    if (action === 'profile') openAccountView('profile');
    if (action === 'settings') openAccountView('settings');
    if (action === 'sites') document.querySelector('.sn-workspace')?.click();
    if (action === 'view-site') document.querySelector('.sn-view-site')?.click();
    if (action === 'logout') [...document.querySelectorAll('#ngeblogging-studio-sidebar button')].find((item) => /Keluar/i.test(item.textContent || ''))?.click();
  });
}

function normalizeProfile() {
  const avatar = document.querySelector('.sn-avatar');
  if (!avatar) return;
  avatar.dataset.v229Profile = "five-action-dropdown";
  avatar.setAttribute('aria-haspopup', 'menu');
  avatar.setAttribute('aria-label', 'Buka menu profil');
  if (avatar.dataset.v229Bound === "true") return;
  avatar.dataset.v229Bound = "true";
  avatar.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (document.querySelector('.v229-profile-menu')) closeProfileMenu();
    else buildProfileMenu(avatar);
  }, true);
}

function normalizeAccountPage() {
  const page = document.querySelector('.sn-settings-grid')?.closest('.sn-view-pad');
  if (!page) return;
  const mode = page.dataset.v229AccountView || 'settings';
  page.dataset.v229AccountView = mode;
}

function normalizeNara() {
  const launcher = document.querySelector('.nara-floating-button');
  if (launcher) {
    launcher.dataset.v229Launcher = "stable-square";
    for (const property of ['animation','transition','transform','filter']) important(launcher, property, 'none');
    important(launcher, 'opacity', '1');
  }
  const layer = document.querySelector('.nara-assistant-layer');
  const shell = layer?.querySelector(':scope>.nara-assistant-shell');
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || 'small';
  const full = size === 'full';
  layer.dataset.v229NaraMode = full ? 'modal' : 'nonmodal';
  shell.dataset.v229NaraSize = size;
  shell.dataset.v229NaraFamily = family();
  if (!full) {
    important(layer, 'pointer-events', 'none');
    important(layer, 'background', 'transparent');
    important(layer, 'backdrop-filter', 'none');
    important(layer, '-webkit-backdrop-filter', 'none');
    important(shell, 'pointer-events', 'auto');
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
  }
  shell.querySelectorAll('.nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap').forEach((node) => {
    node.hidden = false;
    node.removeAttribute('inert');
    node.removeAttribute('aria-hidden');
    node.dataset.v229Control = 'visible';
  });
  const plus = shell.querySelector('.nara-attachment-menu-wrap>button');
  const menu = shell.querySelector('.nara-attachment-menu');
  if (plus) {
    plus.dataset.v229Plus = 'camera-photo-file';
    plus.setAttribute('aria-haspopup', 'menu');
    plus.setAttribute('aria-expanded', String(Boolean(menu)));
  }
  if (!menu || !plus) return;
  menu.dataset.v229AttachmentMenu = 'fixed-visible';
  menu.setAttribute('role', 'menu');
  for (const ancestor of [layer, shell, shell.querySelector('.nara-composer'), shell.querySelector('.nara-composer-tools'), shell.querySelector('.nara-attachment-menu-wrap')]) {
    if (ancestor) important(ancestor, 'transform', 'none');
  }
  const rect = plus.getBoundingClientRect();
  const width = Math.min(270, Math.max(220, innerWidth - 20));
  const menuHeight = 184;
  const left = Math.max(10, Math.min(innerWidth - width - 10, rect.left));
  const top = rect.top - menuHeight - 10 >= 10 ? rect.top - menuHeight - 10 : Math.min(innerHeight - menuHeight - 10, rect.bottom + 10);
  important(menu, 'position', 'fixed');
  important(menu, 'left', `${left}px`);
  important(menu, 'right', 'auto');
  important(menu, 'top', `${Math.max(10, top)}px`);
  important(menu, 'bottom', 'auto');
  important(menu, 'width', `${width}px`);
  important(menu, 'max-width', 'calc(100vw - 20px)');
  important(menu, 'display', 'grid');
  important(menu, 'visibility', 'visible');
  important(menu, 'opacity', '1');
  important(menu, 'pointer-events', 'auto');
  important(menu, 'z-index', '2147486500');
}

function normalizeAnalytics() {
  document.querySelectorAll('.op41-line,.op41-donut-wrap,.op41-chart-grid').forEach((node) => {
    node.dataset.v229Analytics = 'large-readable';
  });
}

function normalizeDomain() {
  document.querySelectorAll('.sv124-domain-page button,.sv124-domain-page a,.sn-domain-card button,.sn-domain-card a').forEach((node) => {
    node.dataset.v229DomainAction = family() === 'small' ? 'full-horizontal' : 'normal';
  });
}

function sync() {
  frame = 0;
  normalizeRoot();
  normalizeLayout();
  normalizeCode();
  normalizeSidebar();
  normalizeProfile();
  normalizeAccountPage();
  normalizeNara();
  normalizeAnalytics();
  normalizeDomain();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class','hidden','aria-expanded','data-nara-size','data-studio-responsive-mode','data-studio-device-mode','data-studio-device-variant','data-studio-desktop-site-phone'],
});
for (const name of ['pageshow','resize','orientationchange','online']) window.addEventListener(name, schedule, { passive: true });
window.visualViewport?.addEventListener('resize', schedule, { passive: true });
document.addEventListener('click', (event) => {
  if (!event.target.closest('.sn-avatar,.v229-profile-menu')) closeProfileMenu();
}, true);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeProfileMenu(); });
schedule();

export { RELEASE };