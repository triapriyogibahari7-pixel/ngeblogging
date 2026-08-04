import { BUILT_IN_WIDGETS, LAYOUT_AREAS, getWidget } from "./widget-system.js";
import { activeSiteId, squareAvatarBlob } from "./studio-mobile-stability-v176.js";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { getUserProfile, updateUserProfile } from "./lib/studio-data.js";
import { updateVisibleIdentity } from "./studio-finalization-v178.js";

export const RELEASE = "studio-visual-native-v257-20260804";

const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_MODES = new Set(["tablet", "desktop", "laptop", "computer"]);
const PROFILE_BUCKET = "site-public-media";
const QUICK_WIDGETS = ["search", "recent-posts", "popular-posts", "categories", "tags", "author", "comments", "custom-html"];
const FALLBACK_SLOTS = [
  ["header-left", "Header kiri"], ["header-right", "Header kanan"], ["below-header", "Navigasi / area atas"],
  ["before-content", "Di atas postingan"],
  ["sidebar-left", "Widget kiri 1"], ["sidebar-left", "Widget kiri 2"], ["sidebar-left", "Widget kiri 3"], ["sidebar-left", "Widget kiri 4"],
  ["content-main", "Postingan / Page"],
  ["sidebar-right", "Widget kanan 1"], ["sidebar-right", "Widget kanan 2"], ["sidebar-right", "Widget kanan 3"], ["sidebar-right", "Widget kanan 4"],
  ["after-content", "Di bawah postingan"],
  ["footer-left", "Footer kiri"], ["footer-right", "Footer kanan"], ["footer-wide", "Footer panjang"],
];

let frame = 0;
let avatarInputNode = null;
let avatarBusy = false;
let layoutPopover = null;

function html() {
  return document.documentElement;
}

function responsiveMode() {
  const root = html();
  const responsive = String(root.dataset.studioResponsiveMode || "").toLowerCase();
  const variant = String(root.dataset.studioDeviceVariant || "").toLowerCase();
  if (responsive === "desktop" && ["laptop", "computer"].includes(variant)) return variant;
  if ([...SMALL_MODES, ...LARGE_MODES].includes(responsive)) return responsive;
  if (LARGE_MODES.has(variant)) return variant;
  const width = Math.min(document.documentElement.clientWidth || innerWidth || 1, window.visualViewport?.width || innerWidth || 1);
  if (width <= 430) return "phone";
  if (width <= 600) return "mobile";
  if (width <= 760) return "compact";
  if (width <= 1180) return "tablet";
  if (width <= 1536) return "laptop";
  return "computer";
}

function family(mode = responsiveMode()) {
  return SMALL_MODES.has(mode) ? "small" : "large";
}

function setDataset() {
  const root = html();
  const mode = responsiveMode();
  root.dataset.studioVisualNativeV257 = RELEASE;
  root.dataset.studioV257Mode = mode;
  root.dataset.studioV257Family = family(mode);
  document.querySelector(".sn-shell")?.setAttribute("data-studio-visual-native-v257", RELEASE);
}

function syncChrome() {
  const root = html();
  const side = document.getElementById("ngeblogging-studio-sidebar");
  const shell = document.querySelector(".sn-shell");
  if (!side || !shell) return;
  const mode = responsiveMode();
  const small = family(mode) === "small";
  const open = small ? side.classList.contains("mobile-open") : !side.classList.contains("collapsed");
  root.dataset.studioV257Sidebar = small ? (open ? "open" : "closed") : (open ? "expanded" : "collapsed");

  side.hidden = false;
  side.removeAttribute("hidden");
  side.removeAttribute("inert");
  side.removeAttribute("aria-hidden");

  const logo = side.querySelector(".sn-logo-mark");
  if (logo) {
    logo.hidden = false;
    logo.removeAttribute("hidden");
    logo.setAttribute("aria-label", small ? "Tutup menu Studio" : open ? "Ciutkan menu Studio" : "Perluas menu Studio");
    logo.setAttribute("title", logo.getAttribute("aria-label"));
    const letter = logo.querySelector("strong");
    if (letter) letter.textContent = "n";
  }
  const brand = side.querySelector(".sn-logo>b");
  if (brand) brand.textContent = "Ngeblogging";

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim();
    if (label) {
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    }
  });

  const top = shell.querySelector(".sn-top");
  const actions = top?.querySelector(".sn-top-actions");
  const avatar = top?.querySelector(".sn-avatar");
  if (actions) actions.hidden = false;
  if (avatar) {
    avatar.hidden = false;
    avatar.removeAttribute("hidden");
    avatar.removeAttribute("inert");
    avatar.removeAttribute("aria-hidden");
    avatar.setAttribute("aria-haspopup", "menu");
    avatar.setAttribute("aria-label", "Buka menu profil");
    avatar.dataset.v257ProfileTrigger = "fixed-top-right";
  }

  document.querySelectorAll([
    "[data-studio-mode-badge]", "[data-device-mode-badge]", ".studio-device-mode-badge", ".v225-mode-badge",
    ".sn-device-mode-badge-v148", ".sn-sidebar-edge-toggle-v147", ".v227-sidebar-fab", ".studio-external-sidebar-toggle",
    "[data-v173-collapse-toggle]", "[data-v187-sidebar-toggle]", "[data-v208-sidebar-toggle]", "[data-v223-sidebar-toggle]", "[data-v229-sidebar-toggle]",
  ].join(",")).forEach((node) => node.remove());
}

function ensureProfileMenu() {
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!menu) return;
  menu.dataset.v257ProfileMenu = "bounded-actions";
  if (!menu.querySelector('[data-action="avatar"]')) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.dataset.action = "avatar";
    button.innerHTML = "<span>Ganti avatar</span><small>Unggah foto profil</small>";
    const profile = menu.querySelector('[data-action="profile"]');
    profile?.after(button);
  }
}

async function uploadAvatar(file) {
  if (avatarBusy || !file) return;
  avatarBusy = true;
  try {
    if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan profil belum tersedia.");
    if (!file.type.startsWith("image/")) throw new Error("Pilih file gambar.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Avatar maksimal 8 MB.");
    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    const user = sessionResult.data?.session?.user;
    const siteId = activeSiteId();
    if (!user?.id || !siteId) throw new Error("Sesi atau situs aktif belum tersedia.");
    const blob = await squareAvatarBlob(file);
    const path = `${siteId}/${user.id}/avatars/${crypto.randomUUID()}.webp`;
    const uploaded = await supabase.storage.from(PROFILE_BUCKET).upload(path, blob, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploaded.error) throw uploaded.error;
    const avatarUrl = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl;
    const current = await getUserProfile(user.id).catch(() => null);
    const saved = await updateUserProfile(user.id, {
      displayName: current?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Akun Ngeblogging",
      bio: current?.bio || "",
      website: current?.website || "",
      avatarUrl,
      locale: current?.locale || "id-ID",
      timezone: current?.timezone || "Asia/Jakarta",
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
  input.dataset.v257AvatarInput = "true";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.value = "";
    if (file) uploadAvatar(file);
  });
  document.body.append(input);
  avatarInputNode = input;
  return input;
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.hidden = false;
    launcher.removeAttribute("aria-hidden");
    launcher.dataset.v257Launcher = "fixed-safe-corner";
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const panel = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !panel) return;

  if (layer.dataset.v257InitialSmall !== "true") {
    layer.dataset.v257InitialSmall = "true";
    if (panel.dataset.naraSize !== "small") {
      layer.querySelector('.nara-size-controls-v147 button[data-size="small"]')?.click();
      return;
    }
  }

  const size = ["small", "medium", "full"].includes(panel.dataset.naraSize) ? panel.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.v257Size = size;
  layer.dataset.v257Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.dataset.v257Panel = family() === "small" ? "small-device" : "large-device";

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    backdrop.tabIndex = full ? 0 : -1;
  }
  if (!full) {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.documentElement.style.removeProperty("overflow");
  }
  const menu = panel.querySelector(".nara-attachment-menu");
  if (menu) menu.dataset.v257AttachmentMenu = "camera-photo-file";
}

function ensureAreaOptions(select) {
  if (!(select instanceof HTMLSelectElement)) return;
  const known = new Set([...select.options].map((option) => option.value));
  for (const area of LAYOUT_AREAS) {
    if (known.has(area.id)) continue;
    const option = document.createElement("option");
    option.value = area.id;
    option.textContent = area.label;
    select.append(option);
  }
  select.dataset.v257LayoutAreas = "complete";
}

function syncWidgetStudio() {
  document.querySelectorAll(".tn-widget-studio .tn-widget-settings select").forEach(ensureAreaOptions);
}

function closeLayoutPopover() {
  layoutPopover?.remove();
  layoutPopover = null;
}

function setReactSelect(select, value) {
  if (!(select instanceof HTMLSelectElement)) return false;
  ensureAreaOptions(select);
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function openWidgetStudio(widgetId, area) {
  const open = document.querySelector(".tn-layout-studio .tn-layout-studio-header>button,.tn-layout-studio .tn-layout-side>button");
  open?.click();
  if (!widgetId) return;
  let attempt = 0;
  const locate = () => {
    attempt += 1;
    syncWidgetStudio();
    const widget = getWidget(widgetId);
    const card = [...document.querySelectorAll(".tn-widget-studio .tn-widget-grid>article")].find((article) => {
      return (article.querySelector(".tn-widget-toggle b")?.textContent || "").trim() === widget?.name;
    });
    if (!card) {
      if (attempt < 45) requestAnimationFrame(locate);
      return;
    }
    if (!card.classList.contains("active")) {
      card.querySelector(".tn-widget-toggle")?.click();
      if (attempt < 45) requestAnimationFrame(locate);
      return;
    }
    const select = card.querySelector(".tn-widget-settings select");
    if (select && area && area !== "content-main") setReactSelect(select, area);
    card.scrollIntoView({ block: "center", behavior: "smooth" });
    (select || card.querySelector("button"))?.focus?.({ preventScroll: true });
  };
  requestAnimationFrame(locate);
}

function showLayoutPopover(slot) {
  closeLayoutPopover();
  const area = slot.dataset.area || "sidebar-right";
  const panel = document.createElement("div");
  panel.className = "v257-layout-popover";
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-label", `Pilih widget untuk ${slot.dataset.label || "area"}`);
  const title = document.createElement("header");
  title.innerHTML = `<b>${slot.dataset.label || "Area tata letak"}</b><small>Pilih widget atau buka seluruh 26 widget.</small>`;
  const list = document.createElement("div");
  for (const id of QUICK_WIDGETS) {
    const widget = getWidget(id);
    if (!widget) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.dataset.widget = id;
    button.textContent = widget.name;
    button.addEventListener("click", () => {
      closeLayoutPopover();
      openWidgetStudio(id, area);
    });
    list.append(button);
  }
  const all = document.createElement("button");
  all.type = "button";
  all.textContent = `Buka semua ${BUILT_IN_WIDGETS.length} widget`;
  all.addEventListener("click", () => {
    closeLayoutPopover();
    openWidgetStudio("", area);
  });
  panel.append(title, list, all);
  document.body.append(panel);
  const rect = slot.getBoundingClientRect();
  const width = Math.min(306, innerWidth - 20);
  panel.style.width = `${width}px`;
  panel.style.left = `${Math.max(10, Math.min(rect.left, innerWidth - width - 10))}px`;
  const panelHeight = Math.min(430, innerHeight - 20);
  panel.style.top = `${rect.bottom + 8 + panelHeight < innerHeight ? rect.bottom + 8 : Math.max(10, rect.top - panelHeight - 8)}px`;
  layoutPopover = panel;
  panel.querySelector("button")?.focus({ preventScroll: true });
}

function ensureFallbackLayout() {
  const studio = document.querySelector(".tn-layout-studio");
  const canvas = studio?.querySelector(".tn-layout-canvas");
  if (!studio || !canvas || canvas.querySelector(".tn-layout-canvas-v170") || studio.querySelector(".v257-layout-blueprint")) return;

  const blueprint = document.createElement("div");
  blueprint.className = "v257-layout-blueprint";
  blueprint.setAttribute("aria-label", "Denah tata letak situs interaktif");
  FALLBACK_SLOTS.forEach(([area, label], index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `v257-layout-slot ${area} slot-${index + 1}`;
    button.dataset.area = area;
    button.dataset.label = label;
    button.innerHTML = `<small>${label}</small><b>${area === "content-main" ? "Konten utama" : "＋ Widget"}</b>`;
    button.addEventListener("click", () => showLayoutPopover(button));
    blueprint.append(button);
  });
  canvas.dataset.v257Layout = "interactive-blueprint";
  canvas.append(blueprint);
}

function syncLayout() {
  syncWidgetStudio();
  const detailed = document.querySelector(".tn-layout-canvas-v170");
  if (detailed) {
    detailed.dataset.v257Layout = "detailed-existing-map";
    detailed.querySelectorAll("button,.tn-layout-slot-v170,.content-main").forEach((slot) => {
      slot.removeAttribute("inert");
      slot.removeAttribute("aria-hidden");
      slot.style.removeProperty("pointer-events");
    });
  } else {
    ensureFallbackLayout();
  }
}

function syncOperationalPages() {
  document.querySelectorAll(".op41-chart,.sn-analytics-chart,.analytics-chart,[data-analytics-chart]").forEach((chart) => {
    chart.dataset.v257Analytics = "readable-detail";
  });
  document.querySelectorAll(".sv124-domain-page,.sn-domain-page,[data-domain-page]").forEach((page) => {
    page.dataset.v257Domain = "responsive-actions";
  });
  document.querySelectorAll(".ce-app").forEach((editor) => editor.dataset.v257Editor = family() === "small" ? "mobile-native" : "large-native");
}

function sync() {
  frame = 0;
  setDataset();
  syncChrome();
  ensureProfileMenu();
  syncNara();
  syncLayout();
  syncOperationalPages();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function handleDocumentClick(event) {
  const avatarAction = event.target.closest?.('.sn-profile-menu-v150 button[data-action="avatar"]');
  if (avatarAction) {
    event.preventDefault();
    avatarInput().click();
    document.querySelector(".sn-profile-menu-v150")?.remove();
    document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
    return;
  }
  if (layoutPopover && !event.target.closest?.(".v257-layout-popover,.v257-layout-slot")) closeLayoutPopover();
}

if (typeof document !== "undefined") {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLayoutPopover();
  });
  new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.attributeName === "class" || record.attributeName?.startsWith("data-"))) schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class", "hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-device-variant",
    ],
  });
  for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  schedule();
}

export { family, responsiveMode, schedule, sync };
