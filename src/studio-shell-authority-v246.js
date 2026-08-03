export const RELEASE = "studio-shell-authority-v246-20260803";

const ROOT_ID = "ngeblogging-studio-shell-v246";
const SIDEBAR_KEY = "ngeblogging-sidebar-state-v246";
const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const NAV_ITEMS = [
  "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys",
];

let frame = 0;
let mobileOpen = false;
let profileOpen = false;
let desktopExpanded = readSidebarPreference();

function readSidebarPreference() {
  try {
    const current = localStorage.getItem(SIDEBAR_KEY);
    if (current) return current !== "collapsed";
    return localStorage.getItem("ngeblogging-sidebar-state-v244") !== "collapsed";
  } catch {
    return true;
  }
}

function saveSidebarPreference() {
  try { localStorage.setItem(SIDEBAR_KEY, desktopExpanded ? "expanded" : "collapsed"); }
  catch { /* storage failure must never break navigation */ }
}

function responsiveMode() {
  const root = document.documentElement;
  const explicit = root.dataset.studioResponsiveMode || "";
  const desktopSite = root.dataset.studioDesktopSitePhone === "true" || root.dataset.desktopSitePhone === "true";
  if (desktopSite) return "desktop";
  if (["application", "phone", "mobile", "compact", "tablet", "desktop"].includes(explicit)) return explicit;
  if (root.dataset.studioSurfaceMode === "application") return "application";
  const width = Math.min(window.visualViewport?.width || innerWidth || 1, document.documentElement.clientWidth || innerWidth || 1);
  if (width <= 430) return "phone";
  if (width <= 600) return "mobile";
  if (width <= 760) return "compact";
  if (width <= 1180) return "tablet";
  return "desktop";
}

function family() {
  return SMALL_MODES.has(responsiveMode()) ? "small" : "large";
}

function deviceVariant() {
  const root = document.documentElement;
  if (family() === "small") return responsiveMode();
  const stored = root.dataset.studioDeviceVariant || "";
  if (["tablet", "laptop", "computer"].includes(stored)) return stored;
  const width = window.visualViewport?.width || innerWidth || 1;
  if (responsiveMode() === "tablet") return "tablet";
  return width <= 1536 ? "laptop" : "computer";
}

function buttonText(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

function legacySidebar() {
  return document.getElementById("ngeblogging-studio-sidebar");
}

function legacyButton(label) {
  const side = legacySidebar();
  if (!side) return null;
  return [...side.querySelectorAll("button")].find((button) => buttonText(button) === label) || null;
}

function legacyTop() {
  return document.querySelector("[data-v244-legacy-top='true'],.sn-shell .sn-main > .sn-top");
}

function delegateClick(node) {
  if (!node) return false;
  try { node.click(); return true; }
  catch { return false; }
}

function iconMarkup(label) {
  const source = legacyButton(label)?.querySelector("svg");
  if (source) return source.outerHTML;
  if (label === "Buat Post") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  if (label === "Pengaturan") return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.4 3h-4.8l-.4 3.1a8 8 0 0 0-1.8 1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.8 1l.4 3.1h4.8l.4-3.1a8 8 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/></svg>';
  if (label === "Keluar") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>';
}

function hideCompetingChrome() {
  const oldChrome = document.getElementById("ngeblogging-studio-chrome-v244");
  if (oldChrome) {
    oldChrome.hidden = true;
    oldChrome.setAttribute("aria-hidden", "true");
    oldChrome.style.setProperty("display", "none", "important");
    oldChrome.style.setProperty("pointer-events", "none", "important");
  }
  document.querySelectorAll(".sn-side-backdrop,.sn-sidebar-edge-toggle-v147").forEach((node) => {
    node.style.setProperty("display", "none", "important");
    node.style.setProperty("pointer-events", "none", "important");
  });
}

function ensureShell() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;

  root = document.createElement("div");
  root.id = ROOT_ID;
  root.dataset.release = RELEASE;
  root.innerHTML = `
    <header class="v246-topbar" aria-label="Bilah atas Studio">
      <button type="button" class="v246-mobile-n" aria-label="Buka menu Studio" aria-controls="v246-sidebar"><span>n</span></button>
      <button type="button" class="v246-workspace" aria-label="Kelola situs aktif"><strong>ngeblogging</strong><small>Situs aktif</small></button>
      <button type="button" class="v246-avatar" aria-label="Buka menu profil" aria-haspopup="menu" aria-expanded="false"><span>NB</span></button>
    </header>
    <button type="button" class="v246-drawer-hitarea" aria-label="Tutup menu Studio"></button>
    <aside id="v246-sidebar" class="v246-sidebar" aria-label="Menu utama Ngeblogging Studio">
      <div class="v246-brand-row">
        <button type="button" class="v246-internal-n" aria-label="Buka atau tutup menu Studio" aria-controls="v246-sidebar"><span>n</span></button>
        <strong>ngeblogging</strong>
      </div>
      <button type="button" class="v246-create" data-label="Buat Post">${iconMarkup("Buat Post")}<span>Buat Post</span></button>
      <nav class="v246-nav" aria-label="Navigasi Studio"></nav>
      <footer class="v246-footer">
        <button type="button" data-label="Pengaturan">${iconMarkup("Pengaturan")}<span>Pengaturan</span></button>
        <button type="button" data-label="Keluar">${iconMarkup("Keluar")}<span>Keluar</span></button>
      </footer>
    </aside>
    <div class="v246-profile-menu" role="menu" aria-label="Menu profil" hidden>
      <button type="button" role="menuitem" data-account="profile"><b>Profil</b><small>Avatar, nama, biografi, dan website</small></button>
      <button type="button" role="menuitem" data-account="settings"><b>Pengaturan</b><small>Pengaturan situs aktif</small></button>
      <button type="button" role="menuitem" data-account="add-site"><b>Tambahkan situs</b><small>Buat atau pilih situs lain</small></button>
      <button type="button" role="menuitem" data-account="view-site"><b>Lihat situs</b><small>Buka situs publik aktif</small></button>
      <button type="button" role="menuitem" data-account="logout" class="danger"><b>Keluar</b><small>Akhiri sesi hanya ketika Anda memilih Keluar</small></button>
    </div>`;
  document.body.append(root);

  root.querySelector(".v246-mobile-n")?.addEventListener("click", () => {
    mobileOpen = !mobileOpen;
    profileOpen = false;
    syncShell();
  });
  root.querySelector(".v246-internal-n")?.addEventListener("click", () => {
    if (family() === "small") mobileOpen = false;
    else {
      desktopExpanded = !desktopExpanded;
      saveSidebarPreference();
    }
    profileOpen = false;
    syncShell();
  });
  root.querySelector(".v246-drawer-hitarea")?.addEventListener("click", () => {
    mobileOpen = false;
    syncShell();
  });
  root.querySelector(".v246-create")?.addEventListener("click", () => {
    delegateClick(legacyButton("Buat Post"));
    if (family() === "small") mobileOpen = false;
    syncShell();
  });
  root.querySelector(".v246-nav")?.addEventListener("click", (event) => {
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
  root.querySelector(".v246-footer")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-label]");
    if (!button) return;
    delegateClick(legacyButton(button.dataset.label));
    if (family() === "small") mobileOpen = false;
    profileOpen = false;
    schedule();
  });
  root.querySelector(".v246-workspace")?.addEventListener("click", () => delegateClick(legacyTop()?.querySelector(".sn-workspace")));
  root.querySelector(".v246-avatar")?.addEventListener("click", () => {
    profileOpen = !profileOpen;
    syncShell();
  });
  root.querySelector(".v246-profile-menu")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-account]");
    if (button) runAccountAction(button.dataset.account, root.querySelector(".v246-avatar"));
  });
  return root;
}

function rebuildNav(root) {
  const nav = root.querySelector(".v246-nav");
  if (!nav) return;
  const active = buttonText(legacySidebar()?.querySelector("nav button.active"));
  nav.innerHTML = NAV_ITEMS.map((label) => `<button type="button" data-label="${label}" class="${active === label ? "active" : ""}" aria-label="${label}" title="${label}">${iconMarkup(label)}<span>${label}</span></button>`).join("");
}

function syncIdentity(root) {
  const top = legacyTop();
  const oldAvatar = top?.querySelector(".sn-avatar") || document.querySelector(".sn-avatar");
  const avatar = root.querySelector(".v246-avatar");
  if (avatar && oldAvatar) {
    const img = oldAvatar.querySelector("img");
    if (img?.src) avatar.innerHTML = `<img src="${img.src}" alt=""/>`;
    else avatar.textContent = (oldAvatar.textContent || "NB").trim().slice(0, 3) || "NB";
  }
  const oldWorkspace = top?.querySelector(".sn-workspace") || document.querySelector(".sn-workspace");
  const workspace = root.querySelector(".v246-workspace");
  if (workspace && oldWorkspace) {
    workspace.querySelector("strong").textContent = oldWorkspace.querySelector("b")?.textContent?.trim() || "ngeblogging";
    workspace.querySelector("small").textContent = "Situs aktif";
  }
}

function positionProfile(root) {
  const menu = root.querySelector(".v246-profile-menu");
  const avatar = root.querySelector(".v246-avatar");
  if (!menu || !avatar) return;
  menu.hidden = !profileOpen;
  avatar.setAttribute("aria-expanded", String(profileOpen));
  if (!profileOpen) return;
  const rect = avatar.getBoundingClientRect();
  const width = Math.min(320, (window.visualViewport?.width || innerWidth) - 20);
  const left = Math.max(10, Math.min((window.visualViewport?.width || innerWidth) - width - 10, rect.right - width));
  menu.style.left = `${left}px`;
  menu.style.top = `${Math.max(70, rect.bottom + 8)}px`;
  menu.style.width = `${width}px`;
}

async function runAccountAction(action, anchor) {
  profileOpen = false;
  syncShell();
  if (action === "profile") {
    try {
      const module = await import("./studio-finalization-v178.js");
      if (typeof module.openProfile === "function") return module.openProfile(anchor);
    } catch { /* use settings as safe fallback */ }
    return delegateClick(legacyButton("Pengaturan"));
  }
  if (action === "settings") return delegateClick(legacyButton("Pengaturan"));
  if (action === "add-site") return delegateClick(legacyTop()?.querySelector(".sn-workspace"));
  if (action === "view-site") {
    const link = document.querySelector(".sn-view-site[href],.sn-secondary-link[href]");
    if (link?.href) window.open(link.href, "_blank", "noopener,noreferrer");
    return;
  }
  if (action === "logout") delegateClick(legacyButton("Keluar"));
}

function studioPresent() {
  return Boolean(document.querySelector(".sn-shell .sn-main,.sn-shell,.sn-main .sn-view-pad"));
}

function syncShell() {
  hideCompetingChrome();
  const existing = document.getElementById(ROOT_ID);
  if (!studioPresent()) {
    if (existing) existing.hidden = true;
    document.documentElement.removeAttribute("data-studio-shell-v246");
    return;
  }
  const root = existing || ensureShell();
  root.hidden = false;
  const nextFamily = family();
  const nextMode = responsiveMode();
  const nextVariant = deviceVariant();
  const sidebarState = nextFamily === "small" ? (mobileOpen ? "open" : "closed") : (desktopExpanded ? "expanded" : "collapsed");

  document.documentElement.dataset.studioShellV246 = RELEASE;
  document.documentElement.dataset.studioV246Family = nextFamily;
  document.documentElement.dataset.studioV246Mode = nextMode;
  document.documentElement.dataset.studioV246Variant = nextVariant;
  document.documentElement.dataset.studioV246Sidebar = sidebarState;
  root.dataset.family = nextFamily;
  root.dataset.mode = nextMode;
  root.dataset.variant = nextVariant;
  root.dataset.sidebar = sidebarState;

  rebuildNav(root);
  syncIdentity(root);
  positionProfile(root);
  root.querySelector(".v246-mobile-n")?.setAttribute("aria-expanded", String(mobileOpen));
  root.querySelector(".v246-internal-n")?.setAttribute("aria-expanded", String(nextFamily === "small" ? mobileOpen : desktopExpanded));
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    syncShell();
  });
}

if (typeof document !== "undefined") {
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "src", "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-device-variant", "data-studio-desktop-site-phone"],
  });
  document.addEventListener("click", (event) => {
    const root = document.getElementById(ROOT_ID);
    if (profileOpen && root && !event.target.closest(".v246-profile-menu,.v246-avatar")) {
      profileOpen = false;
      schedule();
    }
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    mobileOpen = false;
    profileOpen = false;
    schedule();
  }, true);
  for (const eventName of ["resize", "orientationchange", "pageshow", "online"] ) window.addEventListener(eventName, schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  schedule();
}
