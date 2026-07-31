import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";
import "./studio-mobile-stability-v176.css";

const RELEASE = "studio-mobile-stability-v176-20260731";
const PROFILE_BUCKET = "site-public-media";
const NARA_SIZE_KEY = "ngeblogging-nara-size-v148";
const VALID_NARA_SIZES = new Set(["small", "medium", "full"]);

let frame = 0;
let forceSmallNara = false;
let identity = null;
let identityPromise = null;
let avatarBusy = false;

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(scan);
}

function isSmallMode() {
  const htmlMode = document.documentElement.dataset.studioDeviceMode;
  const shellMode = document.querySelector(".sn-shell")?.dataset.deviceMode;
  return htmlMode === "small" || shellMode === "small";
}

function activeSiteId() {
  try {
    return window.__ngebloggingActiveSite?.id
      || document.documentElement.dataset.activeSiteId
      || localStorage.getItem(ACTIVE_SITE_STORAGE_KEY)
      || "";
  } catch {
    return window.__ngebloggingActiveSite?.id || document.documentElement.dataset.activeSiteId || "";
  }
}

function userInitials(name) {
  return String(name || "Ngeblogging")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "NB";
}

async function loadIdentity() {
  if (identity) return identity;
  if (identityPromise) return identityPromise;
  identityPromise = (async () => {
    if (!supabaseConfigured || !supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.user) return null;
    const user = data.session.user;
    const profileResult = await supabase
      .from("profiles")
      .select("display_name,avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    const metadataName = String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
    const profileName = String(profileResult.data?.display_name || "").trim();
    const displayName = profileName.length >= 2
      ? profileName
      : metadataName || String(user.email || "").split("@")[0] || "Akun Ngeblogging";
    const avatarUrl = profileResult.data?.avatar_url
      || user.user_metadata?.avatar_url
      || user.user_metadata?.picture
      || "";
    if (profileName.length < 2 && metadataName.length >= 2) {
      await supabase.from("profiles").update({ display_name: metadataName }).eq("id", user.id).catch(() => null);
    }
    identity = { user, displayName, avatarUrl };
    return identity;
  })().finally(() => { identityPromise = null; });
  return identityPromise;
}

function avatarVisual(target, currentIdentity) {
  if (!target || !currentIdentity) return;
  target.replaceChildren();
  if (currentIdentity.avatarUrl) {
    const image = document.createElement("img");
    image.src = currentIdentity.avatarUrl;
    image.alt = "";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    target.append(image);
  } else {
    target.textContent = userInitials(currentIdentity.displayName);
  }
}

function createProfileHead(menu, currentIdentity) {
  let head = menu.querySelector(".sm176-profile-head");
  if (!head) {
    head = document.createElement("div");
    head.className = "sm176-profile-head";
    const avatar = document.createElement("span");
    avatar.className = "sm176-profile-avatar";
    const text = document.createElement("div");
    const name = document.createElement("strong");
    name.className = "sm176-profile-name";
    const account = document.createElement("span");
    account.textContent = "Akun Ngeblogging";
    const status = document.createElement("small");
    status.className = "sm176-profile-status";
    status.textContent = "Profil tersinkron";
    text.append(name, account, status);
    head.append(avatar, text);
    menu.prepend(head);
  }
  head.querySelector(".sm176-profile-name").textContent = currentIdentity.displayName;
  avatarVisual(head.querySelector(".sm176-profile-avatar"), currentIdentity);

  if (!menu.querySelector('[data-action="avatar"]')) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.dataset.action = "avatar";
    button.className = "sm176-avatar-action";
    button.innerHTML = '<span>Ganti avatar</span><small>Unggah foto profil persegi</small>';
    head.after(button);
  }
}

async function syncIdentity() {
  const avatar = document.querySelector(".sn-avatar");
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!avatar && !menu) return;
  const currentIdentity = await loadIdentity();
  if (!currentIdentity) return;
  if (avatar) {
    avatarVisual(avatar, currentIdentity);
    avatar.dataset.profileIdentityV176 = RELEASE;
    avatar.setAttribute("aria-label", `Buka menu profil ${currentIdentity.displayName}`);
    avatar.title = currentIdentity.displayName;
  }
  if (menu) {
    createProfileHead(menu, currentIdentity);
    menu.dataset.profileIdentityV176 = RELEASE;
  }
}

function profileStatus(message, error = false) {
  const status = document.querySelector(".sm176-profile-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", error);
}

function avatarInput() {
  let input = document.querySelector("#ngeblogging-avatar-input-v176");
  if (input) return input;
  input = document.createElement("input");
  input.id = "ngeblogging-avatar-input-v176";
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";
  input.hidden = true;
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file || avatarBusy) return;
    avatarBusy = true;
    profileStatus("Memproses avatar…");
    try {
      if (!file.type.startsWith("image/")) throw new Error("Pilih berkas gambar.");
      if (file.size > 8 * 1024 * 1024) throw new Error("Avatar maksimal 8 MB.");
      const currentIdentity = await loadIdentity();
      const siteId = activeSiteId();
      if (!currentIdentity?.user?.id || !siteId) throw new Error("Sesi atau situs aktif belum tersedia.");
      const blob = await squareAvatarBlob(file);
      const objectPath = `${siteId}/${currentIdentity.user.id}/avatars/${crypto.randomUUID()}.webp`;
      const upload = await supabase.storage.from(PROFILE_BUCKET).upload(objectPath, blob, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
      if (upload.error) throw upload.error;
      const avatarUrl = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(objectPath).data.publicUrl;
      const update = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", currentIdentity.user.id);
      if (update.error) throw update.error;
      identity = { ...currentIdentity, avatarUrl };
      document.querySelectorAll(".sn-avatar,.sm176-profile-avatar").forEach((node) => avatarVisual(node, identity));
      profileStatus("Avatar berhasil diperbarui");
      window.dispatchEvent(new CustomEvent("ngeblogging:profile-updated", { detail: { avatarUrl, displayName: identity.displayName } }));
    } catch (error) {
      profileStatus(error.message || "Avatar belum dapat diperbarui.", true);
    } finally {
      avatarBusy = false;
    }
  });
  document.body.append(input);
  return input;
}

async function squareAvatarBlob(file) {
  let source;
  let cleanup = () => {};
  if (globalThis.createImageBitmap) {
    source = await createImageBitmap(file);
    cleanup = () => source.close?.();
  } else {
    const objectUrl = URL.createObjectURL(file);
    source = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Gambar avatar belum dapat dibaca."));
      image.src = objectUrl;
    });
    cleanup = () => URL.revokeObjectURL(objectUrl);
  }
  try {
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    const side = Math.min(width, height);
    const sx = Math.max(0, (width - side) / 2);
    const sy = Math.max(0, (height - side) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Browser belum dapat memproses avatar.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 512, 512);
    context.drawImage(source, sx, sy, side, side, 0, 0, 512, 512);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .86));
    if (!blob) throw new Error("Avatar belum dapat dikompresi.");
    return blob;
  } finally {
    cleanup();
  }
}

function syncDrawer() {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector("#ngeblogging-studio-sidebar.sn-side");
  const main = shell?.querySelector(".sn-main");
  const toggle = shell?.querySelector(".sn-sidebar-toggle");
  if (!shell || !sidebar || !main || !toggle) return;
  const small = isSmallMode();
  const open = small && sidebar.classList.contains("mobile-open");
  main.removeAttribute("inert");
  main.dataset.drawerBackgroundV176 = open ? "blocked-by-backdrop" : "interactive";
  sidebar.setAttribute("aria-hidden", small && !open ? "true" : "false");
  toggle.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("sm176-drawer-open", open);
  if (!open) document.body.classList.remove("sn-mobile-sidebar-open-v176");
  else document.body.classList.add("sn-mobile-sidebar-open-v176");
}

function closeMobileDrawer() {
  if (!isSmallMode()) return;
  const sidebar = document.querySelector("#ngeblogging-studio-sidebar.sn-side.mobile-open");
  if (!sidebar) return;
  const close = sidebar.querySelector(".sn-side-close");
  if (close) close.click();
  else document.querySelector(".sn-sidebar-toggle")?.click();
  requestAnimationFrame(syncDrawer);
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.naraLauncherV176 = RELEASE;
    launcher.setAttribute("aria-label", "Buka Nara AI");
    launcher.title = "Nara AI";
  }
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("nara-fullscreen-open-v176");
    return;
  }
  if (forceSmallNara && !shell.dataset.initialSizeV176) {
    shell.dataset.initialSizeV176 = RELEASE;
    forceSmallNara = false;
    const smallButton = shell.querySelector('[data-size="small"]');
    if (shell.dataset.naraSize !== "small" && smallButton) smallButton.click();
  }
  let size = shell.dataset.naraSize;
  if (!VALID_NARA_SIZES.has(size)) {
    size = "small";
    shell.dataset.naraSize = size;
  }
  const full = size === "full";
  layer.dataset.naraInteractionV176 = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", full ? "true" : "false");
  shell.dataset.naraStableV176 = RELEASE;
  document.body.classList.toggle("nara-fullscreen-open-v176", full);
  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148");
    document.body.style.removeProperty("overflow");
  }
}

function scan() {
  frame = 0;
  document.documentElement.dataset.studioMobileStabilityV176 = RELEASE;
  syncDrawer();
  syncNara();
  syncIdentity().catch(() => null);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-device-mode", "data-nara-size", "aria-expanded"],
});

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", () => {
  document.body.classList.remove("sm176-drawer-open", "sn-mobile-sidebar-open-v176");
  document.querySelector(".sn-main")?.removeAttribute("inert");
  schedule();
}, { passive: true });

document.addEventListener("click", (event) => {
  const target = event.target;
  if (target.closest(".nara-floating-button")) {
    forceSmallNara = true;
    try { localStorage.setItem(NARA_SIZE_KEY, "small"); } catch { /* storage optional */ }
    schedule();
    return;
  }
  if (target.closest('.sn-profile-menu-v150 [data-action="avatar"]')) {
    event.preventDefault();
    event.stopPropagation();
    avatarInput().click();
    return;
  }
  const sidebar = target.closest("#ngeblogging-studio-sidebar.sn-side.mobile-open");
  if (sidebar && target.closest("nav button,.sn-account-footer button,.sn-new")) {
    requestAnimationFrame(closeMobileDrawer);
  }
  schedule();
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMobileDrawer();
    schedule();
  }
});

schedule();

export { RELEASE, activeSiteId, loadIdentity, squareAvatarBlob };
