import "./studio-production-v235.css";
import { openProfile as openProfileV178, updateVisibleIdentity } from "./studio-finalization-v178.js";
import { activeSiteId, squareAvatarBlob } from "./studio-mobile-stability-v176.js";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { getUserProfile, updateUserProfile } from "./lib/studio-data.js";

const RELEASE = "studio-production-v235-interaction-map-nara-20260803";
const SMALL = new Set(["application", "phone", "mobile", "compact"]);
const LARGE = new Set(["tablet", "laptop", "desktop", "computer"]);
const PROFILE_MENU = "v235-profile-menu";
const LAYOUT_POPOVER = "v235-layout-popover";
const ATTACHMENT_PORTAL = "v235-nara-attachment-portal";
const PROFILE_BUCKET = "site-public-media";
const MAX_CODE_LINES = 10000;
const GRID_PLACEMENT = {
  "top-left-1": ["1 / 7", "1"],
  "top-right-1": ["7 / 13", "1"],
  "top-left-3": ["1 / 13", "2"],
  "top-left-2": ["1 / 7", "3"],
  "top-right-2": ["7 / 13", "3"],
  "top-right-3": ["1 / 13", "4"],
  "before-content": ["1 / 13", "5"],
  "sidebar-left-1": ["1 / 4", "6"],
  "sidebar-left-2": ["1 / 4", "7"],
  "sidebar-left-3": ["1 / 4", "8"],
  "sidebar-left-4": ["1 / 4", "9"],
  "content-main": ["4 / 10", "6 / 10"],
  "sidebar-right-1": ["10 / 13", "6"],
  "sidebar-right-2": ["10 / 13", "7"],
  "sidebar-right-3": ["10 / 13", "8"],
  "sidebar-right-4": ["10 / 13", "9"],
  "after-content": ["1 / 13", "10"],
  "bottom-left-1": ["1 / 7", "11"],
  "bottom-right-1": ["7 / 13", "11"],
  "bottom-left-2": ["1 / 7", "12"],
  "bottom-right-2": ["7 / 13", "12"],
  "bottom-left-3": ["1 / 13", "13"],
  "bottom-right-3": ["1 / 13", "14"],
};
const LEGACY_LAYOUT_LABEL = /header utama kiri|header utama kanan|footer dan copyright kiri|footer dan copyright kanan/i;
const WIDGET_CHOICES = [
  ["search", "Pencarian"], ["recent-posts", "Post terbaru"], ["popular-posts", "Post populer"],
  ["categories", "Kategori"], ["tags", "Tag"], ["author", "Profil penulis"],
  ["comments", "Komentar"], ["custom-html", "HTML / JavaScript"],
];
let frame = 0;
let profileMenu = null;
let layoutPopover = null;
let attachmentPortal = null;
let avatarInputNode = null;
let avatarBusy = false;

function important(node, property, value) {
  if (!node) return;
  node.style.setProperty(property, value, "important");
}

function deviceMetrics() {
  const width = Number(document.documentElement.clientWidth || innerWidth || 1);
  const height = Number(document.documentElement.clientHeight || innerHeight || 1);
  const density = Math.max(1, Number(devicePixelRatio || 1));
  const normalize = (value, fallback) => {
    const numeric = Number(value || fallback || 1);
    if (numeric <= 900) return numeric;
    return density >= 1.25 ? numeric / density : fallback;
  };
  const sw = normalize(screen?.width, width);
  const sh = normalize(screen?.height, height);
  const shortSide = Math.min(sw, sh);
  const handheld = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || (Number(navigator.maxTouchPoints || 0) > 1 && shortSide < 768);
  return { width, height, shortSide, handheld, desktopSitePhone: handheld && shortSide < 768 && width >= 900 };
}

function family() {
  const root = document.documentElement;
  const view = deviceMetrics();
  if (view.desktopSitePhone || root.dataset.studioDesktopSitePhone === "true" || root.dataset.v232ModeLock === "desktop-site-large") return "large";
  const responsive = root.dataset.studioResponsiveMode || root.dataset.studioDeviceVariant || "";
  if (SMALL.has(responsive)) return "small";
  if (LARGE.has(responsive)) return "large";
  if (root.dataset.v232Family === "large") return "large";
  if (root.dataset.v232Family === "small") return "small";
  return view.shortSide >= 768 ? "large" : "small";
}

function closeProfileMenu({ restore = false } = {}) {
  const trigger = profileMenu?.__trigger;
  profileMenu?.remove();
  profileMenu = null;
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
  if (restore) trigger?.focus?.({ preventScroll: true });
}
function closeLayoutPopover({ restore = false } = {}) {
  const trigger = layoutPopover?.__trigger;
  layoutPopover?.remove();
  layoutPopover = null;
  if (restore) trigger?.focus?.({ preventScroll: true });
}
function closeAttachmentPortal({ restore = false } = {}) {
  const trigger = attachmentPortal?.__trigger;
  attachmentPortal?.remove();
  attachmentPortal = null;
  if (restore) trigger?.focus?.({ preventScroll: true });
}
function closeLegacyMenus() {
  document.querySelector(".v229-profile-menu")?.remove();
  document.querySelector(".sn-profile-menu-v150")?.remove();
  document.querySelector(".v234-layout-popover")?.remove();
}

function syncSidebar() {
  const root = document.documentElement;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const main = document.querySelector(".sn-main");
  if (!sidebar || !toggle || !main) return;
  const small = family() === "small";
  const open = sidebar.classList.contains("mobile-open");
  const collapsed = sidebar.classList.contains("collapsed");
  root.dataset.v235Family = small ? "small" : "large";
  root.dataset.studioProductionV235 = RELEASE;
  sidebar.dataset.v235Sidebar = small ? (open ? "drawer-open" : "drawer-closed") : (collapsed ? "icons" : "open");
  sidebar.querySelectorAll(".sn-side-close,.sn-desktop-sidebar-icon").forEach((node) => {
    node.hidden = true;
    important(node, "display", "none");
    important(node, "pointer-events", "none");
  });
  document.querySelectorAll(".v227-sidebar-fab,.studio-external-sidebar-toggle,[data-v173-collapse-toggle],[data-v187-sidebar-toggle],[data-v208-sidebar-toggle],[data-v223-sidebar-toggle],[data-v229-sidebar-toggle]").forEach((node) => {
    if (node === toggle) return;
    node.hidden = true;
    important(node, "display", "none");
    important(node, "pointer-events", "none");
  });
  const mark = sidebar.querySelector(".sn-logo-mark");
  if (mark) {
    mark.dataset.v235InternalN = "single-toggle";
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-label", small ? "Tutup menu Studio" : collapsed ? "Perluas menu Studio" : "Ciutkan menu Studio");
  }
  toggle.dataset.v235TopN = "single-toggle";
  if (small) {
    toggle.hidden = open;
    important(toggle, "display", open ? "none" : "grid");
  } else {
    toggle.hidden = true;
    important(toggle, "display", "none");
    sidebar.classList.remove("mobile-open");
  }
  const nav = sidebar.querySelector(":scope>nav");
  if (nav) {
    nav.dataset.v235Menu = "tight-aligned";
    important(nav, "justify-content", "flex-start");
    important(nav, "gap", "2px");
    important(nav, "padding-top", "4px");
    important(nav, "overflow-y", "auto");
  }
  sidebar.querySelector(":scope>.sn-account-footer")?.style.setProperty("margin-top", "auto", "important");
  main.removeAttribute("inert");
  main.style.removeProperty("filter");
  document.querySelectorAll(".sn-side-backdrop").forEach((backdrop) => {
    backdrop.dataset.v235Backdrop = "outside-only-no-blur";
    important(backdrop, "backdrop-filter", "none");
    important(backdrop, "-webkit-backdrop-filter", "none");
    important(backdrop, "filter", "none");
    important(backdrop, "background", "rgba(19,39,66,.08)");
  });
}

function syncTopbar() {
  const top = document.querySelector(".sn-top,.sn-topbar");
  if (!top) return;
  top.dataset.v235Topbar = "identity-profile";
  top.querySelectorAll("[data-studio-mode-badge],[data-device-mode-badge],.studio-device-mode-badge,.v225-mode-badge").forEach((node) => {
    node.hidden = true;
    important(node, "display", "none");
  });
  const workspace = top.querySelector(".sn-workspace");
  if (workspace) {
    workspace.hidden = true;
    important(workspace, "display", "none");
  }
  const actions = top.querySelector(".sn-top-actions");
  if (actions) important(actions, "margin-left", "auto");
  const avatar = top.querySelector(".sn-avatar");
  if (avatar) {
    avatar.hidden = false;
    avatar.dataset.v235Avatar = "profile-menu";
    avatar.setAttribute("aria-haspopup", "menu");
    important(avatar, "display", "grid");
  }
}

async function uploadAvatar(file) {
  if (avatarBusy || !file) return;
  avatarBusy = true;
  try {
    if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan profil belum tersedia.");
    if (!file.type.startsWith("image/")) throw new Error("Pilih file gambar.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Avatar maksimal 8 MB.");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const user = data?.session?.user;
    const siteId = activeSiteId();
    if (!user?.id || !siteId) throw new Error("Sesi atau situs aktif belum tersedia.");
    const blob = await squareAvatarBlob(file);
    const path = `${siteId}/${user.id}/avatars/${crypto.randomUUID()}.webp`;
    const uploaded = await supabase.storage.from(PROFILE_BUCKET).upload(path, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (uploaded.error) throw uploaded.error;
    const avatarUrl = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl;
    const current = await getUserProfile(user.id).catch(() => null);
    const saved = await updateUserProfile(user.id, {
      displayName: current?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Akun Ngeblogging",
      bio: current?.bio || "", website: current?.website || "", avatarUrl,
      locale: current?.locale || "id-ID", timezone: current?.timezone || "Asia/Jakarta",
    });
    updateVisibleIdentity(saved);
    window.dispatchEvent(new CustomEvent("ngeblogging:toast", { detail: { type: "success", message: "Avatar berhasil diperbarui." } }));
  } catch (error) {
    window.alert(error?.message || "Avatar belum dapat diperbarui.");
  } finally {
    avatarBusy = false;
  }
}

function avatarInput() {
  if (avatarInputNode?.isConnected) return avatarInputNode;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";
  input.hidden = true;
  input.dataset.v235AvatarInput = "true";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.value = "";
    uploadAvatar(file);
  });
  document.body.append(input);
  avatarInputNode = input;
  return input;
}

function buildProfileMenu(anchor) {
  closeLegacyMenus();
  closeProfileMenu();
  const menu = document.createElement("div");
  menu.className = PROFILE_MENU;
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <button type="button" role="menuitem" data-action="profile"><b>Profil</b><small>Nama, bio, website, dan identitas</small></button>
    <button type="button" role="menuitem" data-action="avatar"><b>Ganti avatar</b><small>Unggah foto profil</small></button>
    <button type="button" role="menuitem" data-action="sites"><b>Situs saya</b><small>Kelola atau tambah situs</small></button>
    <button type="button" role="menuitem" data-action="view-site"><b>Lihat situs</b><small>Buka situs aktif</small></button>
    <button type="button" role="menuitem" data-action="settings"><b>Pengaturan</b><small>Situs, bahasa, dan zona waktu</small></button>
    <button type="button" role="menuitem" data-action="logout"><b>Keluar</b><small>Akhiri sesi pada perangkat ini</small></button>`;
  menu.__trigger = anchor;
  document.body.append(menu);
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(310, innerWidth - 20);
  menu.style.width = `${width}px`;
  menu.style.left = `${Math.max(10, Math.min(innerWidth - width - 10, rect.right - width))}px`;
  menu.style.top = `${Math.min(innerHeight - Math.min(390, innerHeight - 20), rect.bottom + 8)}px`;
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    closeProfileMenu();
    if (action === "profile") openProfileV178(anchor);
    else if (action === "avatar") avatarInput().click();
    else if (action === "sites") document.querySelector(".sn-workspace")?.click();
    else if (action === "view-site") document.querySelector(".sn-view-site")?.click();
    else if (action === "settings") document.querySelector(".sn-account-settings-v135")?.click();
    else if (action === "logout") document.querySelector(".sn-account-logout-v135")?.click();
  });
  profileMenu = menu;
  anchor.setAttribute("aria-expanded", "true");
  menu.querySelector("button")?.focus({ preventScroll: true });
}

function slotKey(node) {
  if (!node) return "";
  if (node.classList.contains("content-main")) return "content-main";
  return Object.keys(GRID_PLACEMENT).find((key) => node.classList.contains(key)) || "";
}

function syncLayout() {
  const map = document.querySelector("#ngeblogging-layout-map,.tn-layout-studio[data-v226-layout-source]");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (!map || !canvas) return;
  map.dataset.v235Layout = "reference-map-clean";
  canvas.dataset.v235Canvas = family() === "small" ? "small-readable-map" : "large-reference-map";
  map.querySelectorAll(".tn-layout-studio-header h2,.tn-layout-studio-header p").forEach((node) => { node.hidden = true; important(node, "display", "none"); });
  [...canvas.children].forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const key = slotKey(node);
    if (!key) {
      const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
      if (LEGACY_LAYOUT_LABEL.test(text) || node.classList.contains("tn-layout-slot-v170")) {
        node.dataset.v235LegacyLayout = "hidden";
        node.hidden = true;
        important(node, "display", "none");
      }
      return;
    }
    const placement = GRID_PLACEMENT[key];
    node.hidden = false;
    node.dataset.v235Slot = key;
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
    important(node, "grid-column", placement[0]);
    important(node, "grid-row", placement[1]);
    important(node, "position", "relative");
    important(node, "transform", "none");
    important(node, "pointer-events", "auto");
  });
}

function openWidgetStudio(widgetId) {
  const open = document.querySelector("#ngeblogging-layout-map .tn-layout-studio-header>button,#ngeblogging-layout-map .tn-layout-side>button,.tn-layout-studio .tn-layout-studio-header>button");
  open?.click();
  if (!widgetId) return;
  let attempts = 0;
  const locate = () => {
    attempts += 1;
    const label = WIDGET_CHOICES.find(([id]) => id === widgetId)?.[1]?.toLowerCase();
    const card = [...document.querySelectorAll(".tn-widget-studio .tn-widget-grid>article")].find((item) => (item.querySelector(".tn-widget-toggle b")?.textContent || "").trim().toLowerCase() === label);
    if (!card) { if (attempts < 30) requestAnimationFrame(locate); return; }
    if (!card.classList.contains("active")) card.querySelector(".tn-widget-toggle")?.click();
    card.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  requestAnimationFrame(locate);
}

function showLayoutPopover(slot) {
  closeLegacyMenus();
  closeLayoutPopover();
  const key = slotKey(slot);
  if (!key) return;
  const panel = document.createElement("div");
  panel.className = LAYOUT_POPOVER;
  panel.setAttribute("role", "menu");
  panel.innerHTML = `<header><b>${key === "content-main" ? "Konten utama" : "Area tata letak"}</b><small>Pilih widget atau buka semua 26 widget.</small></header><div></div><button type="button" data-all="true">Buka semua 26 widget</button>`;
  WIDGET_CHOICES.forEach(([id, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.widget = id;
    button.textContent = label;
    button.addEventListener("click", () => { closeLayoutPopover(); openWidgetStudio(id); });
    panel.querySelector("div").append(button);
  });
  panel.querySelector("[data-all]").addEventListener("click", () => { closeLayoutPopover(); openWidgetStudio(""); });
  panel.__trigger = slot;
  document.body.append(panel);
  const rect = slot.getBoundingClientRect();
  const width = Math.min(300, innerWidth - 20);
  const estimated = Math.min(430, innerHeight - 20);
  const top = rect.bottom + 8 + estimated <= innerHeight ? rect.bottom + 8 : Math.max(10, rect.top - estimated - 8);
  panel.style.width = `${width}px`;
  panel.style.left = `${Math.max(10, Math.min(rect.left, innerWidth - width - 10))}px`;
  panel.style.top = `${top}px`;
  layoutPopover = panel;
  panel.querySelector("button[data-widget]")?.focus({ preventScroll: true });
}

function lineCount(value) { return Math.max(1, Math.min(MAX_CODE_LINES, String(value || "").split("\n").length)); }
function lineNumbers(count) { return Array.from({ length: count }, (_, index) => String(index + 1)).join("\n"); }
function syncCodePane(pane) {
  const textarea = pane?.querySelector(":scope>textarea");
  if (!textarea) return;
  pane.dataset.v235CodePane = "actual-line-gutter";
  pane.querySelectorAll(":scope>.v234-code-gutter,:scope>.v222-code-line-gutter,:scope>.v231-code-line-gutter").forEach((legacy) => { legacy.hidden = true; important(legacy, "display", "none"); });
  let gutter = pane.querySelector(":scope>.v235-code-gutter");
  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "v235-code-gutter";
    gutter.setAttribute("aria-hidden", "true");
    pane.insertBefore(gutter, textarea);
  }
  const update = () => {
    const count = lineCount(textarea.value);
    if (gutter.dataset.count !== String(count)) { gutter.dataset.count = String(count); gutter.textContent = lineNumbers(count); }
    gutter.scrollTop = textarea.scrollTop;
  };
  update();
  textarea.dataset.v235CodeEditor = "actual-lines-up-to-10000";
  textarea.setAttribute("wrap", "off");
  textarea.setAttribute("spellcheck", "false");
  if (textarea.dataset.v235Bound !== "true") {
    textarea.dataset.v235Bound = "true";
    textarea.addEventListener("input", update);
    textarea.addEventListener("scroll", update, { passive: true });
  }
}
function syncCodeEditor() {
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v235Workspace = family() === "small" ? "preview-top-code-bottom" : "code-left-preview-right";
    workspace.querySelectorAll(".tn-code-pane").forEach(syncCodePane);
    workspace.querySelectorAll(".tn-code-preview-pane").forEach((preview) => preview.dataset.v235Preview = "centered");
  });
  document.querySelectorAll(".tn-modal.fullscreen").forEach((modal) => modal.dataset.v235CodeModal = "bounded");
}

function clickThemeCodeTab(kind) {
  let attempts = 0;
  const find = () => {
    attempts += 1;
    const target = [...document.querySelectorAll(".tn-code-pane>nav button")].find((button) => {
      const text = (button.textContent || "").toLowerCase();
      return kind === "javascript" ? text.includes("javascript") : text.includes(kind);
    });
    if (target) { target.click(); target.focus({ preventScroll: true }); return; }
    if (attempts < 30) requestAnimationFrame(find);
  };
  requestAnimationFrame(find);
}
function ensureThemeActions() {
  const studio = document.querySelector(".tn-studio");
  if (studio) { studio.dataset.v235Theme = "visible"; important(studio, "display", "block"); important(studio, "visibility", "visible"); important(studio, "opacity", "1"); }
  const existing = document.querySelector(".v232-theme-code-actions");
  if (existing) { existing.dataset.v235ThemeActions = "explicit"; important(existing, "display", "flex"); return; }
  const nav = document.querySelector(".tn-command>nav");
  const codeSource = [...(nav?.querySelectorAll("button") || [])].find((button) => /edit html/i.test(button.textContent || ""));
  const previewSource = [...(nav?.querySelectorAll("button") || [])].find((button) => /^preview$/i.test((button.textContent || "").trim()));
  if (!nav || !codeSource || !previewSource || nav.querySelector(".v235-theme-code-actions")) return;
  const group = document.createElement("div"); group.className = "v235-theme-code-actions";
  [["html","Edit HTML"],["css","Edit CSS"],["javascript","Edit JavaScript"]].forEach(([kind,text]) => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = text;
    button.addEventListener("click", () => { codeSource.click(); clickThemeCodeTab(kind); }); group.append(button);
  });
  const preview = document.createElement("button"); preview.type = "button"; preview.textContent = "Preview"; preview.addEventListener("click", () => previewSource.click()); group.append(preview);
  nav.prepend(group);
}

function buildAttachmentPortal(trigger) {
  closeAttachmentPortal();
  const shell = trigger.closest(".nara-assistant-shell");
  const camera = shell?.querySelector('input[type="file"][capture]');
  const images = [...(shell?.querySelectorAll('input[type="file"][accept*="image"]') || [])].find((node) => !node.hasAttribute("capture"));
  const files = [...(shell?.querySelectorAll('input[type="file"]') || [])].find((node) => /txt|markdown|csv|json/i.test(node.accept || ""));
  const portal = document.createElement("div");
  portal.className = ATTACHMENT_PORTAL;
  portal.setAttribute("role", "menu");
  portal.innerHTML = `<button type="button" data-pick="camera"><b>Kamera</b><small>Ambil foto sekarang</small></button><button type="button" data-pick="photo"><b>Foto</b><small>Pilih dari galeri</small></button><button type="button" data-pick="file"><b>File</b><small>TXT, Markdown, CSV, atau JSON</small></button>`;
  portal.__trigger = trigger;
  portal.addEventListener("click", (event) => {
    const choice = event.target.closest("button[data-pick]")?.dataset.pick;
    if (!choice) return;
    closeAttachmentPortal();
    if (choice === "camera") camera?.click();
    if (choice === "photo") images?.click();
    if (choice === "file") files?.click();
  });
  document.body.append(portal);
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(280, innerWidth - 20);
  const estimated = 190;
  const top = rect.top - estimated - 8 >= 10 ? rect.top - estimated - 8 : Math.min(innerHeight - estimated - 10, rect.bottom + 8);
  portal.style.width = `${width}px`;
  portal.style.left = `${Math.max(10, Math.min(innerWidth - width - 10, rect.left))}px`;
  portal.style.top = `${Math.max(10, top)}px`;
  attachmentPortal = portal;
  trigger.setAttribute("aria-expanded", "true");
  portal.querySelector("button")?.focus({ preventScroll: true });
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) { launcher.dataset.v235Launcher = "stable"; ["animation","transition","transform","filter"].forEach((p) => important(launcher,p,"none")); }
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope>.nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v235Nara = full ? "modal" : "nonmodal";
  shell.dataset.v235NaraSize = size;
  shell.dataset.v235NaraFamily = family();
  layer.setAttribute("aria-modal", String(full));
  if (!full) {
    important(layer, "pointer-events", "none"); important(layer, "background", "transparent"); important(layer, "backdrop-filter", "none"); important(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow"); document.documentElement.style.removeProperty("overflow");
    const backdrop = layer.querySelector(".nara-assistant-backdrop"); if (backdrop) { backdrop.hidden = true; important(backdrop, "display", "none"); }
  }
  shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((node) => {
    node.hidden = false; node.removeAttribute("inert"); node.removeAttribute("aria-hidden"); node.dataset.v235NaraControl = "visible";
  });
  const plus = shell.querySelector(".nara-attachment-menu-wrap>button");
  if (plus) { plus.dataset.v235Plus = "portal-camera-photo-file"; plus.setAttribute("aria-haspopup", "menu"); plus.setAttribute("aria-label", "Tambah kamera, foto, atau file"); plus.setAttribute("aria-expanded", String(Boolean(attachmentPortal))); }
  shell.querySelectorAll(".nara-attachment-menu").forEach((legacy) => { legacy.dataset.v235LegacyAttachment = "hidden"; important(legacy, "display", "none"); });
}

function syncDomain() {
  document.querySelectorAll(".sv124-domain-page,.sn-domain-page").forEach((page) => {
    page.dataset.v235Domain = family() === "small" ? "mobile-horizontal" : "large";
    page.querySelectorAll("button,a").forEach((control) => {
      const text = (control.textContent || "").replace(/\s+/g," ").trim().toLowerCase();
      if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|utama|buka/.test(text)) control.dataset.v235DomainAction = "true";
    });
  });
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioProductionV235 = RELEASE;
  syncSidebar(); syncTopbar(); syncLayout(); syncCodeEditor(); ensureThemeActions(); syncNara(); syncDomain();
}
function schedule() { if (!frame) frame = requestAnimationFrame(sync); }

// Window capture runs before historical document/element capture listeners, so v235 is the single interaction authority.
window.addEventListener("click", (event) => {
  const internalN = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (internalN) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    queueMicrotask(() => document.querySelector(".sn-sidebar-toggle")?.click()); schedule(); return;
  }
  const avatar = event.target.closest?.(".sn-avatar");
  if (avatar) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    if (profileMenu) closeProfileMenu({ restore: false }); else buildProfileMenu(avatar); return;
  }
  const slot = event.target.closest?.("#ngeblogging-layout-map .tn-layout-slot-v170,#ngeblogging-layout-map .content-main,.tn-layout-studio[data-v226-layout-source] .tn-layout-slot-v170,.tn-layout-studio[data-v226-layout-source] .content-main");
  if (slot && slot.dataset.v235LegacyLayout !== "hidden") {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); showLayoutPopover(slot); return;
  }
  const plus = event.target.closest?.(".nara-assistant-shell .nara-attachment-menu-wrap>button");
  if (plus) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    if (attachmentPortal) closeAttachmentPortal(); else buildAttachmentPortal(plus); return;
  }
  if (profileMenu && !event.target.closest?.(`.${PROFILE_MENU}`)) closeProfileMenu();
  if (layoutPopover && !event.target.closest?.(`.${LAYOUT_POPOVER}`)) closeLayoutPopover();
  if (attachmentPortal && !event.target.closest?.(`.${ATTACHMENT_PORTAL}`)) closeAttachmentPortal();
}, true);

window.addEventListener("keydown", (event) => {
  const internalN = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (internalN && ["Enter"," "].includes(event.key)) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); queueMicrotask(() => document.querySelector(".sn-sidebar-toggle")?.click()); schedule(); return;
  }
  if (event.key === "Escape") { closeProfileMenu({ restore: true }); closeLayoutPopover({ restore: true }); closeAttachmentPortal({ restore: true }); }
}, true);

new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:["class","hidden","data-nara-size","data-studio-responsive-mode","data-studio-device-variant","data-v232-family"] });
for (const name of ["pageshow","resize","orientationchange"]) window.addEventListener(name, schedule, { passive:true });
window.visualViewport?.addEventListener("resize", schedule, { passive:true });
window.addEventListener("ngeblogging:profile-updated", schedule);
schedule();

export { RELEASE, GRID_PLACEMENT, WIDGET_CHOICES, family, lineCount };