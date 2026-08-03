export const RELEASE = "studio-stable-source-shell-v244-20260803";

const ROOT_ID = "ngeblogging-studio-chrome-v244";
const ATTACHMENT_ID = "ngeblogging-nara-attachments-v244";
const SIDEBAR_KEY = "ngeblogging-sidebar-state-v244";
const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const NAV_ITEMS = [
  ["Ringkasan", "home"],
  ["Posts", "posts"],
  ["Pages", "pages"],
  ["Tema", "themes"],
  ["Media", "media"],
  ["Analitik", "analytics"],
  ["Anggota", "members"],
  ["Komentar", "comments"],
  ["Domain", "domain"],
  ["API Keys", "api-keys"],
];

let frame = 0;
let desktopExpanded = readSidebarPreference();
let mobileOpen = false;
let profileOpen = false;
let earlyClickInstalled = false;

function readSidebarPreference() {
  try { return localStorage.getItem(SIDEBAR_KEY) !== "collapsed"; }
  catch { return true; }
}

function saveSidebarPreference() {
  try { localStorage.setItem(SIDEBAR_KEY, desktopExpanded ? "expanded" : "collapsed"); }
  catch { /* private browsing must not break navigation */ }
}

function family() {
  const root = document.documentElement;
  const explicit = root.dataset.studioResponsiveMode || "";
  const device = root.dataset.studioDeviceMode || "";
  const v238 = root.dataset.v238Family || "";
  const desktopSite = root.dataset.studioDesktopSitePhone === "true" || root.dataset.desktopSitePhone === "true";
  if (desktopSite) return "large";
  if (v238 === "small" || v238 === "large") return v238;
  if (SMALL_MODES.has(explicit)) return "small";
  if (["tablet", "desktop"].includes(explicit)) return "large";
  if (device === "small" || device === "large") return device;
  return Math.min(innerWidth || 0, document.documentElement.clientWidth || innerWidth || 0) <= 760 ? "small" : "large";
}

function buttonText(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

function legacySidebar() {
  return document.getElementById("ngeblogging-studio-sidebar");
}

function legacyButton(label) {
  const sidebar = legacySidebar();
  if (!sidebar) return null;
  const candidates = [...sidebar.querySelectorAll("button")];
  return candidates.find((button) => buttonText(button) === label) || null;
}

function legacyTop() {
  return document.querySelector(".sn-shell .sn-main > .sn-top,.sn-shell .sn-main > [data-v244-legacy-top]");
}

function delegateClick(node) {
  if (!node) return false;
  try { node.click(); return true; }
  catch { return false; }
}

function isolateLegacyChrome() {
  const side = legacySidebar();
  if (side) {
    side.classList.remove("sn-side");
    side.classList.add("v244-legacy-sidebar");
    side.dataset.v244Legacy = "sidebar";
    side.setAttribute("aria-hidden", "true");
    side.style.setProperty("position", "fixed", "important");
    side.style.setProperty("left", "-10000px", "important");
    side.style.setProperty("top", "0", "important");
    side.style.setProperty("width", "1px", "important");
    side.style.setProperty("height", "1px", "important");
    side.style.setProperty("max-width", "1px", "important");
    side.style.setProperty("max-height", "1px", "important");
    side.style.setProperty("overflow", "hidden", "important");
    side.style.setProperty("opacity", "0", "important");
    side.style.setProperty("pointer-events", "none", "important");
    side.style.setProperty("z-index", "-1", "important");
  }

  const top = legacyTop();
  if (top) {
    top.classList.remove("sn-top");
    top.dataset.v244LegacyTop = "true";
    top.setAttribute("aria-hidden", "true");
    top.style.setProperty("display", "none", "important");
    top.style.setProperty("visibility", "hidden", "important");
    top.style.setProperty("height", "0", "important");
    top.style.setProperty("min-height", "0", "important");
    top.style.setProperty("overflow", "hidden", "important");
    top.style.setProperty("pointer-events", "none", "important");
  }
}

function iconMarkup(label) {
  const source = legacyButton(label)?.querySelector("svg");
  if (source) return source.outerHTML;
  if (label === "Buat Post") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  if (label === "Pengaturan") return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.4 3h-4.8l-.4 3.1a8 8 0 0 0-1.8 1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.8 1l.4 3.1h4.8l.4-3.1a8 8 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/></svg>';
  if (label === "Keluar") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>';
}

function ensureChrome() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  root = document.createElement("div");
  root.id = ROOT_ID;
  root.dataset.release = RELEASE;
  root.innerHTML = `
    <header class="v244-topbar" aria-label="Bilah atas Studio">
      <button type="button" class="v244-mobile-n" aria-label="Buka menu Studio" aria-controls="v244-sidebar"><span>n</span></button>
      <button type="button" class="v244-workspace" aria-label="Kelola situs aktif"><strong>Ngeblogging</strong><small>Studio</small></button>
      <button type="button" class="v244-avatar" aria-label="Buka menu profil" aria-haspopup="menu" aria-expanded="false"><span>NB</span></button>
    </header>
    <button type="button" class="v244-drawer-backdrop" aria-label="Tutup menu Studio"></button>
    <aside id="v244-sidebar" class="v244-sidebar" aria-label="Menu utama Ngeblogging Studio">
      <div class="v244-brand-row">
        <button type="button" class="v244-internal-n" aria-label="Buka atau tutup menu Studio"><span>n</span></button>
        <strong>Ngeblogging</strong>
      </div>
      <button type="button" class="v244-create" data-label="Buat Post">${iconMarkup("Buat Post")}<span>Buat Post</span></button>
      <nav class="v244-nav" aria-label="Navigasi Studio"></nav>
      <footer class="v244-footer">
        <button type="button" data-label="Pengaturan">${iconMarkup("Pengaturan")}<span>Pengaturan</span></button>
        <button type="button" data-label="Keluar">${iconMarkup("Keluar")}<span>Keluar</span></button>
      </footer>
    </aside>
    <div class="v244-profile-menu" role="menu" aria-label="Menu profil" hidden>
      <button type="button" role="menuitem" data-account="profile"><b>Profil</b><small>Avatar, nama, biografi, dan website</small></button>
      <button type="button" role="menuitem" data-account="settings"><b>Pengaturan</b><small>Pengaturan situs aktif</small></button>
      <button type="button" role="menuitem" data-account="add-site"><b>Tambahkan situs</b><small>Buat atau pilih situs lain</small></button>
      <button type="button" role="menuitem" data-account="view-site"><b>Lihat situs</b><small>Buka situs publik aktif</small></button>
      <button type="button" role="menuitem" data-account="logout" class="danger"><b>Keluar</b><small>Akhiri sesi pada perangkat ini</small></button>
    </div>`;
  document.body.append(root);

  root.querySelector(".v244-mobile-n")?.addEventListener("click", () => {
    mobileOpen = !mobileOpen;
    profileOpen = false;
    syncChrome();
  });
  root.querySelector(".v244-internal-n")?.addEventListener("click", () => {
    if (family() === "small") mobileOpen = false;
    else {
      desktopExpanded = !desktopExpanded;
      saveSidebarPreference();
    }
    profileOpen = false;
    syncChrome();
  });
  root.querySelector(".v244-drawer-backdrop")?.addEventListener("click", () => {
    mobileOpen = false;
    syncChrome();
  });
  root.querySelector(".v244-workspace")?.addEventListener("click", () => {
    delegateClick(document.querySelector("[data-v244-legacy-top] .sn-workspace,.sn-main .sn-workspace"));
  });
  root.querySelector(".v244-avatar")?.addEventListener("click", () => {
    profileOpen = !profileOpen;
    syncChrome();
  });
  root.querySelector(".v244-create")?.addEventListener("click", () => {
    delegateClick(legacyButton("Buat Post"));
    if (family() === "small") mobileOpen = false;
    syncChrome();
  });
  root.querySelector(".v244-nav")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-label]");
    if (!button) return;
    delegateClick(legacyButton(button.dataset.label));
    if (family() === "small") mobileOpen = false;
    else {
      desktopExpanded = false;
      saveSidebarPreference();
    }
    profileOpen = false;
    schedule();
  });
  root.querySelector(".v244-footer")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-label]");
    if (!button) return;
    delegateClick(legacyButton(button.dataset.label));
    if (family() === "small") mobileOpen = false;
    profileOpen = false;
    schedule();
  });
  root.querySelector(".v244-profile-menu")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-account]");
    if (!button) return;
    runAccountAction(button.dataset.account, root.querySelector(".v244-avatar"));
  });
  return root;
}

function activeLabel() {
  const active = legacySidebar()?.querySelector("nav button.active");
  return buttonText(active);
}

function rebuildNav(root) {
  const nav = root.querySelector(".v244-nav");
  if (!nav) return;
  const active = activeLabel();
  nav.innerHTML = NAV_ITEMS.map(([label]) => {
    const current = active === label ? " active" : "";
    return `<button type="button" class="${current.trim()}" data-label="${label}" title="${label}" aria-label="${label}">${iconMarkup(label)}<span>${label}</span></button>`;
  }).join("");
}

function syncIdentity(root) {
  const oldAvatar = document.querySelector("[data-v244-legacy-top] .sn-avatar,.sn-main .sn-avatar");
  const avatar = root.querySelector(".v244-avatar");
  if (avatar && oldAvatar) {
    const img = oldAvatar.querySelector("img");
    avatar.innerHTML = img?.src ? `<img src="${img.src}" alt=""/>` : `<span>${(oldAvatar.textContent || "NB").trim().slice(0, 3) || "NB"}</span>`;
  }
  const oldWorkspace = document.querySelector("[data-v244-legacy-top] .sn-workspace,.sn-main .sn-workspace");
  const workspace = root.querySelector(".v244-workspace");
  if (workspace && oldWorkspace) {
    const name = oldWorkspace.querySelector("b")?.textContent?.trim() || "Ngeblogging";
    workspace.querySelector("strong").textContent = name;
    workspace.querySelector("small").textContent = "Situs aktif";
  }
}

function positionProfileMenu(root) {
  const menu = root.querySelector(".v244-profile-menu");
  const avatar = root.querySelector(".v244-avatar");
  if (!menu || !avatar) return;
  menu.hidden = !profileOpen;
  avatar.setAttribute("aria-expanded", String(profileOpen));
  if (!profileOpen) return;
  const rect = avatar.getBoundingClientRect();
  const vw = window.visualViewport?.width || innerWidth;
  const left = Math.max(10, Math.min(vw - 330, rect.right - 320));
  menu.style.left = `${left}px`;
  menu.style.top = `${Math.max(70, rect.bottom + 8)}px`;
}

async function runAccountAction(action, anchor) {
  profileOpen = false;
  syncChrome();
  if (action === "profile") {
    try {
      const module = await import("./studio-finalization-v178.js");
      if (typeof module.openProfile === "function") {
        module.openProfile(anchor);
        return;
      }
    } catch { /* fallback below */ }
    delegateClick(legacyButton("Pengaturan"));
    return;
  }
  if (action === "settings") {
    delegateClick(legacyButton("Pengaturan"));
    return;
  }
  if (action === "add-site") {
    delegateClick(document.querySelector("[data-v244-legacy-top] .sn-workspace,.sn-main .sn-workspace"));
    return;
  }
  if (action === "view-site") {
    const link = document.querySelector(".sn-view-site[href],.sn-secondary-link[href]");
    if (link?.href) window.open(link.href, "_blank", "noopener,noreferrer");
    return;
  }
  if (action === "logout") delegateClick(legacyButton("Keluar"));
}

function syncChrome() {
  const shell = document.querySelector(".sn-shell");
  const root = document.getElementById(ROOT_ID);
  if (!shell) {
    if (root) root.hidden = true;
    document.documentElement.removeAttribute("data-studio-v244-family");
    return;
  }
  isolateLegacyChrome();
  const chrome = root || ensureChrome();
  chrome.hidden = false;
  const mode = family();
  document.documentElement.dataset.studioV244 = RELEASE;
  document.documentElement.dataset.studioV244Family = mode;
  document.documentElement.dataset.studioV244Sidebar = mode === "small" ? (mobileOpen ? "open" : "closed") : (desktopExpanded ? "expanded" : "collapsed");
  chrome.dataset.family = mode;
  chrome.dataset.sidebar = document.documentElement.dataset.studioV244Sidebar;
  rebuildNav(chrome);
  syncIdentity(chrome);
  positionProfileMenu(chrome);
  chrome.querySelector(".v244-mobile-n")?.setAttribute("aria-expanded", String(mobileOpen));
  chrome.querySelector(".v244-internal-n")?.setAttribute("aria-expanded", String(mode === "small" ? mobileOpen : desktopExpanded));
}

function naraInput(kind) {
  const composer = document.querySelector(".nara-composer");
  if (!composer) return null;
  const inputs = [...composer.querySelectorAll('input[type="file"]')];
  if (kind === "camera") return inputs.find((input) => input.hasAttribute("capture"));
  if (kind === "photo") return inputs.find((input) => !input.hasAttribute("capture") && (input.getAttribute("accept") || "").includes("image"));
  return inputs.find((input) => /txt|md|csv|json/i.test(input.getAttribute("accept") || ""));
}

function closeNaraAttachments() {
  document.getElementById(ATTACHMENT_ID)?.remove();
}

function openNaraAttachments(anchor) {
  closeNaraAttachments();
  const menu = document.createElement("div");
  menu.id = ATTACHMENT_ID;
  menu.className = "v244-nara-attachments";
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <button type="button" data-kind="camera"><b>Kamera</b><small>Ambil foto sekarang</small></button>
    <button type="button" data-kind="photo"><b>Foto</b><small>Pilih dari galeri</small></button>
    <button type="button" data-kind="file"><b>File</b><small>TXT, Markdown, CSV, atau JSON</small></button>`;
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-kind]");
    if (!button) return;
    const input = naraInput(button.dataset.kind);
    closeNaraAttachments();
    input?.click();
  });
  document.body.append(menu);
  const rect = anchor.getBoundingClientRect();
  const viewport = window.visualViewport;
  const vw = Math.max(280, viewport?.width || innerWidth);
  const vh = Math.max(320, viewport?.height || innerHeight);
  const width = Math.min(310, vw - 20);
  const left = Math.max(10, Math.min(vw - width - 10, rect.left));
  const estimatedHeight = 194;
  const top = Math.max(10, Math.min(vh - estimatedHeight - 10, rect.top - estimatedHeight - 8));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.width = `${width}px`;
}

function installEarlyCapture() {
  if (earlyClickInstalled || typeof window === "undefined") return;
  earlyClickInstalled = true;
  window.addEventListener("click", (event) => {
    const plus = event.target.closest?.(".nara-attachment-menu-wrap > button");
    if (plus) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (document.getElementById(ATTACHMENT_ID)) closeNaraAttachments();
      else openNaraAttachments(plus);
      return;
    }
    const attachment = document.getElementById(ATTACHMENT_ID);
    if (attachment && !attachment.contains(event.target)) closeNaraAttachments();
  }, true);
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeNaraAttachments();
    if (mobileOpen) mobileOpen = false;
    if (profileOpen) profileOpen = false;
    schedule();
  }, true);
}

function normalizeNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) return;
  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize) ? shell.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.v244Mode = full ? "modal" : "nonmodal";
  shell.dataset.v244Size = size;
  layer.setAttribute("aria-modal", String(full));
  if (!full) {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
  }
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    syncChrome();
    normalizeNara();
  });
}

installEarlyCapture();
if (typeof document !== "undefined") {
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "src", "data-nara-size", "data-studio-device-mode", "data-studio-responsive-mode", "data-studio-desktop-site-phone", "data-v238-family"],
  });
  for (const eventName of ["resize", "orientationchange", "pageshow", "online"]) window.addEventListener(eventName, schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  schedule();
}
