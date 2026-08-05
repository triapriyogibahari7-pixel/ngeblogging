import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";
import "./studio-mobile-stability-v176.css";

const RELEASE = "studio-profile-avatar-compat-v287-20260805";
const PROFILE_BUCKET = "site-public-media";
let identity = null;
let identityPromise = null;
let avatarBusy = false;

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
  return String(name || "Ngeblogging").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NB";
}

async function loadIdentity(force = false) {
  if (force) identity = null;
  if (identity) return identity;
  if (identityPromise) return identityPromise;
  identityPromise = (async () => {
    if (!supabaseConfigured || !supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.user) return null;
    const user = data.session.user;
    const profileResult = await supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle();
    const metadataName = String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
    const profileName = String(profileResult.data?.display_name || "").trim();
    const displayName = profileName.length >= 2 ? profileName : metadataName || String(user.email || "").split("@")[0] || "Akun Ngeblogging";
    const avatarUrl = profileResult.data?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
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

async function syncIdentity(force = false) {
  const target = document.querySelector(".sn-avatar");
  if (!target) return;
  const currentIdentity = await loadIdentity(force);
  if (!currentIdentity || !target.isConnected) return;
  avatarVisual(target, currentIdentity);
  target.dataset.profileIdentityV287 = RELEASE;
  target.setAttribute("aria-label", `Buka menu profil ${currentIdentity.displayName}`);
  target.title = currentIdentity.displayName;
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

function profileStatus(message, error = false) {
  window.dispatchEvent(new CustomEvent("ngeblogging:studio-toast", { detail: { message, error } }));
}

function avatarInput() {
  let input = document.querySelector("#ngeblogging-avatar-input-v287");
  if (input) return input;
  input = document.createElement("input");
  input.id = "ngeblogging-avatar-input-v287";
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
      const upload = await supabase.storage.from(PROFILE_BUCKET).upload(objectPath, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
      if (upload.error) throw upload.error;
      const avatarUrl = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(objectPath).data.publicUrl;
      const update = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", currentIdentity.user.id);
      if (update.error) throw update.error;
      identity = { ...currentIdentity, avatarUrl };
      document.querySelectorAll(".sn-avatar").forEach((node) => avatarVisual(node, identity));
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

function openAvatarPicker() {
  avatarInput().click();
}

function boot() {
  document.documentElement.dataset.studioProfileAvatarV287 = RELEASE;
  syncIdentity().catch(() => null);
  setTimeout(() => syncIdentity().catch(() => null), 180);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.__ngebloggingOpenAvatarPicker = openAvatarPicker;
  window.addEventListener("pageshow", boot, { passive: true });
  window.addEventListener("ngeblogging:profile-updated", () => syncIdentity(true).catch(() => null));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
}

export { RELEASE, activeSiteId, avatarInput, loadIdentity, openAvatarPicker, squareAvatarBlob, syncIdentity };
