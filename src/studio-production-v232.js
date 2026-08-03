import "./studio-production-v232.css";

const RELEASE = "studio-production-v232-react-sidebar-theme-nara-auth-20260803";
const SIDEBAR_STORAGE_KEY = "ngeblogging-studio-sidebar-open-v232";
const LARGE_MODES = new Set(["tablet", "laptop", "desktop", "computer"]);
const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;
let profileOutsideBound = false;

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function hidden(node, value) {
  if (!node) return;
  node.hidden = value;
  node.setAttribute("aria-hidden", value ? "true" : "false");
  if (value) node.setAttribute("tabindex", "-1");
  else node.removeAttribute("tabindex");
}

function physicalSmall() {
  const ua = navigator.userAgent || "";
  const mobileUa = navigator.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  const touch = Number(navigator.maxTouchPoints || 0) > 1;
  const dpr = Math.max(1, Number(devicePixelRatio || 1));
  const raw = Math.min(Number(screen?.width || innerWidth), Number(screen?.height || innerHeight));
  const shortEdge = raw > 900 && dpr > 1.2 ? raw / dpr : raw;
  return mobileUa || (touch && shortEdge <= 760) || innerWidth <= 760;
}

function family() {
  const root = document.documentElement;
  const responsive = root.dataset.studioResponsiveMode || root.dataset.studioDeviceVariant || "";
  if (root.dataset.v229ModeLock === "desktop-site-large-locked") return "large";
  if (LARGE_MODES.has(responsive)) return "large";
  if (SMALL_MODES.has(responsive)) return "small";
  return physicalSmall() ? "small" : "large";
}

function sidebarNodes() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = document.querySelector(".sn-main");
  const topToggle = document.querySelector(".sn-sidebar-toggle");
  const logo = sidebar?.querySelector(".sn-logo-mark");
  return { sidebar, main, topToggle, logo };
}

function removeDuplicateSidebarControls(sidebar, topToggle) {
  const selector = [
    ".v227-sidebar-fab",
    ".studio-external-sidebar-toggle",
    "[data-v173-collapse-toggle]",
    "[data-v187-sidebar-toggle]",
    "[data-v208-sidebar-toggle]",
    "[data-v223-sidebar-toggle]",
    "[data-v229-sidebar-toggle]",
    ".sn-desktop-sidebar-icon",
    ".sn-side-close",
  ].join(",");
  document.querySelectorAll(selector).forEach((node) => {
    if (node === topToggle) return;
    node.dataset.v232DuplicateSidebarControl = "removed";
    hidden(node, true);
    important(node, "display", "none");
    important(node, "pointer-events", "none");
  });

  document.querySelectorAll("button,[role=button]").forEach((node) => {
    if (node === topToggle || sidebar?.contains(node) || node.closest(".nara-assistant-layer")) return;
    const label = `${node.getAttribute("aria-label") || ""} ${node.getAttribute("title") || ""}`.toLowerCase();
    const text = String(node.textContent || "").trim().toLowerCase();
    if (text === "n" && /sidebar|menu|navigasi|buka|tutup/.test(label)) {
      node.dataset.v232DuplicateSidebarControl = "removed";
      hidden(node, true);
      important(node, "display", "none");
    }
  });
}

function bindFallbackLogo(logo, topToggle) {
  if (!logo || !topToggle || logo.dataset.v232ToggleBound === "true") return;
  logo.dataset.v232ToggleBound = "true";
  logo.setAttribute("aria-label", "Buka atau tutup menu Studio");
  if (logo.tagName !== "BUTTON") {
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");
    const activate = (event) => {
      if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      topToggle.click();
    };
    logo.addEventListener("click", activate);
    logo.addEventListener("keydown", activate);
  }
}

function bindSidebarAutoCollapse(sidebar, topToggle) {
  if (!sidebar || !topToggle || sidebar.dataset.v232AutoCollapseBound === "true") return;
  sidebar.dataset.v232AutoCollapseBound = "true";
  sidebar.addEventListener("click", (event) => {
    const button = event.target.closest("nav>button,.sn-account-settings-v135");
    if (!button || family() !== "large") return;
    window.setTimeout(() => {
      if (document.contains(sidebar) && !sidebar.classList.contains("collapsed")) topToggle.click();
    }, 0);
  });
}

function restoreSidebarPreference(sidebar, topToggle) {
  if (!sidebar || !topToggle || family() !== "large" || sidebar.dataset.v232Restored === "true") return;
  sidebar.dataset.v232Restored = "true";
  let preferred = null;
  try { preferred = localStorage.getItem(SIDEBAR_STORAGE_KEY); } catch { preferred = null; }
  if (preferred === null) return;
  const shouldOpen = preferred !== "false";
  const open = !sidebar.classList.contains("collapsed");
  if (shouldOpen !== open) window.setTimeout(() => topToggle.click(), 0);
}

function persistSidebarPreference(sidebar) {
  if (!sidebar || family() !== "large") return;
  const open = !sidebar.classList.contains("collapsed");
  if (sidebar.dataset.v232PersistedState === String(open)) return;
  sidebar.dataset.v232PersistedState = String(open);
  try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open)); } catch { /* storage may be restricted */ }
}

function normalizeSidebar() {
  const { sidebar, main, topToggle, logo } = sidebarNodes();
  if (!sidebar || !main || !topToggle) return;
  const next = family();
  const drawerOpen = sidebar.classList.contains("mobile-open");
  const collapsed = sidebar.classList.contains("collapsed");
  const root = document.documentElement;
  root.dataset.v232Family = next;
  sidebar.dataset.v232Sidebar = next === "small" ? (drawerOpen ? "mobile-open" : "mobile-closed") : (collapsed ? "desktop-icons" : "desktop-open");

  removeDuplicateSidebarControls(sidebar, topToggle);
  bindFallbackLogo(logo, topToggle);
  bindSidebarAutoCollapse(sidebar, topToggle);
  restoreSidebarPreference(sidebar, topToggle);
  persistSidebarPreference(sidebar);

  const nav = sidebar.querySelector(":scope>nav");
  if (nav) nav.dataset.v232MenuStack = "compact-under-create";
  const footer = sidebar.querySelector(":scope>.sn-account-footer");
  if (footer) footer.dataset.v232Footer = "pinned-bottom";

  if (next === "large") {
    hidden(topToggle, true);
    important(topToggle, "display", "none");
    sidebar.classList.remove("mobile-open");
  } else {
    hidden(topToggle, drawerOpen);
    important(topToggle, "display", drawerOpen ? "none" : "grid");
  }

  main.removeAttribute("inert");
  main.dataset.v232ContentReflow = next === "large" ? (collapsed ? "sidebar-icons" : "sidebar-open") : "mobile-full-width";
  document.querySelectorAll(".sn-side-backdrop").forEach((backdrop) => {
    backdrop.dataset.v232Backdrop = "transparent-close-target";
    important(backdrop, "background", "transparent");
    important(backdrop, "backdrop-filter", "none");
    important(backdrop, "-webkit-backdrop-filter", "none");
    important(backdrop, "filter", "none");
  });
}

function accountSettingsButton() {
  return [...document.querySelectorAll("#ngeblogging-studio-sidebar button")].find((button) => /pengaturan/i.test(String(button.textContent || "")));
}

function applyAccountView() {
  const requested = document.documentElement.dataset.v232AccountView || "";
  const grid = document.querySelector(".sn-settings-grid");
  if (!grid || !requested) return;
  const sections = [...grid.querySelectorAll(":scope>section")];
  const title = grid.closest(".sn-view-pad")?.querySelector(".sn-page-title h1");
  const description = grid.closest(".sn-view-pad")?.querySelector(".sn-page-title p");
  if (requested === "profile") {
    sections.forEach((section, index) => hidden(section, index !== 0));
    if (title) title.textContent = "Profil";
    if (description) description.textContent = "Avatar, nama tampilan, biografi, website, bahasa, dan identitas akun.";
    grid.dataset.v232AccountSurface = "profile-only";
  } else {
    sections.forEach((section, index) => hidden(section, index === 0));
    if (title) title.textContent = "Pengaturan situs";
    if (description) description.textContent = "Identitas, bahasa, zona waktu, cadangan, dan pengaturan workspace aktif.";
    grid.dataset.v232AccountSurface = "settings-only";
  }
}

function openAccountView(kind) {
  document.documentElement.dataset.v232AccountView = kind;
  accountSettingsButton()?.click();
  requestAnimationFrame(() => requestAnimationFrame(applyAccountView));
}

function closeProfileMenu() {
  document.querySelector(".v232-profile-menu")?.remove();
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
}

function profileMenuButton(label, action, icon = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "menuitem");
  button.innerHTML = `${icon ? `<span aria-hidden="true">${icon}</span>` : ""}<b>${label}</b>`;
  button.addEventListener("click", () => { closeProfileMenu(); action(); });
  return button;
}

function showProfileMenu(avatar) {
  closeProfileMenu();
  const menu = document.createElement("div");
  menu.className = "v232-profile-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Menu profil");
  menu.append(
    profileMenuButton("Profil", () => openAccountView("profile"), "●"),
    profileMenuButton("Situs saya", () => document.querySelector(".sn-workspace")?.click(), "▦"),
    profileMenuButton("Pengaturan", () => openAccountView("settings"), "⚙"),
    profileMenuButton("Cadangan", () => {
      openAccountView("settings");
      window.setTimeout(() => document.getElementById("ngeblogging-backup-settings")?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
    }, "↺"),
    profileMenuButton("Keluar", () => document.querySelector(".sn-account-logout-v135")?.click(), "⇥"),
  );
  document.body.appendChild(menu);
  const rect = avatar.getBoundingClientRect();
  const right = Math.max(12, innerWidth - rect.right);
  menu.style.setProperty("--v232-profile-right", `${right}px`);
  menu.style.setProperty("--v232-profile-top", `${Math.min(innerHeight - 260, rect.bottom + 10)}px`);
  avatar.setAttribute("aria-expanded", "true");
  menu.querySelector("button")?.focus({ preventScroll: true });
}

function normalizeProfileMenu() {
  const avatar = document.querySelector(".sn-avatar");
  if (!avatar) return;
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-label", "Buka menu profil");
  avatar.dataset.v232Profile = "five-action-dropdown";
  if (avatar.dataset.v232Bound !== "true") {
    avatar.dataset.v232Bound = "true";
    avatar.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (document.querySelector(".v232-profile-menu")) closeProfileMenu();
      else showProfileMenu(avatar);
    }, true);
  }
  if (!profileOutsideBound) {
    profileOutsideBound = true;
    document.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".v232-profile-menu,.sn-avatar")) closeProfileMenu();
    }, true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeProfileMenu();
    });
  }
  applyAccountView();
}

function updateCodeGutter(textarea) {
  const pane = textarea.closest(".tn-code-pane");
  if (!pane) return;
  let gutter = pane.querySelector(":scope>.v232-code-line-gutter");
  if (!gutter) {
    pane.querySelector(":scope>.v222-code-line-gutter,:scope>.v231-code-line-gutter")?.remove();
    gutter = document.createElement("pre");
    gutter.className = "v232-code-line-gutter";
    gutter.setAttribute("aria-hidden", "true");
    pane.insertBefore(gutter, textarea);
  }
  const lineCount = Math.min(10000, Math.max(1, String(textarea.value || "").split("\n").length));
  if (gutter.dataset.lines !== String(lineCount)) {
    gutter.dataset.lines = String(lineCount);
    gutter.textContent = Array.from({ length: lineCount }, (_, index) => String(index + 1)).join("\n");
  }
  gutter.scrollTop = textarea.scrollTop;
}

function normalizeThemeStudio() {
  const studio = document.querySelector(".tn-studio");
  if (!studio) return;
  studio.dataset.v232ThemeStudio = "responsive-functional";
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v232CodeLayout = family() === "small" ? "preview-above-code" : "code-left-preview-right";
    workspace.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
      textarea.setAttribute("wrap", "off");
      textarea.dataset.v232CodeEditor = "numbered-lines";
      updateCodeGutter(textarea);
      if (textarea.dataset.v232Bound !== "true") {
        textarea.dataset.v232Bound = "true";
        textarea.addEventListener("scroll", () => updateCodeGutter(textarea), { passive: true });
        textarea.addEventListener("input", () => updateCodeGutter(textarea));
      }
    });
  });

  const map = document.querySelector("#ngeblogging-layout-map,.tn-layout-studio");
  if (map) {
    map.id = "ngeblogging-layout-map";
    map.dataset.v232LayoutMap = "green-reference-responsive";
    const canvas = map.querySelector(".tn-layout-canvas-v170,.tn-layout-canvas");
    if (canvas) canvas.dataset.v232LayoutCanvas = family() === "small" ? "same-map-scaled" : "full-map";
  }

  document.querySelectorAll(".tn-frame-shell").forEach((frameNode) => {
    frameNode.dataset.v232Preview = "centered";
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v232Launcher = "fixed-square";
    for (const property of ["animation", "transition", "transform", "filter"]) important(launcher, property, "none");
    important(launcher, "opacity", "1");
  }
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v232Nara = full ? "modal" : "nonmodal";
  shell.dataset.v232NaraSize = size;
  shell.dataset.v232NaraFamily = family();
  if (!full) {
    important(layer, "pointer-events", "none");
    important(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }
  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop && !full) {
    hidden(backdrop, true);
    important(backdrop, "pointer-events", "none");
  }
  const attachmentWrap = shell.querySelector(".nara-attachment-menu-wrap");
  const attachmentMenu = shell.querySelector(".nara-attachment-menu");
  if (attachmentWrap) attachmentWrap.dataset.v232AttachmentControl = "plus";
  if (attachmentMenu) attachmentMenu.dataset.v232AttachmentMenu = "camera-photo-file";
  shell.querySelector(".nara-select.intelligence")?.setAttribute("data-v232-control", "intelligence");
  shell.querySelector(".nara-select.model")?.setAttribute("data-v232-control", "model");
}

function normalizeGeneralOverflow() {
  document.querySelectorAll(".sn-view-pad,.sn-card,.sn-content-card,.sn-members,.tn-studio,.tn-modal-body,.sv124-domain-page,.sn-domain-page,[data-domain-page]").forEach((node) => {
    node.dataset.v232OverflowGuard = "true";
  });
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioProductionV232 = RELEASE;
  normalizeSidebar();
  normalizeProfileMenu();
  normalizeThemeStudio();
  normalizeNara();
  normalizeGeneralOverflow();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-variant", "data-v229-mode-lock"],
});
for (const name of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(name, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
schedule();

export { RELEASE, SIDEBAR_STORAGE_KEY };