import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { getUserProfile, updateUserProfile } from "./lib/studio-data.js";
import { activeSiteId, squareAvatarBlob } from "./studio-mobile-stability-v176.js";
import { updateVisibleIdentity } from "./studio-finalization-v178.js";

export const PROFILE_AVATAR_RELEASE_V248 = "profile-avatar-v248-20260803";
const PROFILE_BUCKET = "site-public-media";
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
let busy = false;

function status(message, tone = "") {
  const node = document.querySelector(".sn-profile-layer-v178 .sn-profile-status-v178");
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
}

async function uploadAvatar(file, button) {
  if (!file || busy) return;
  if (!file.type.startsWith("image/")) {
    status("Pilih file gambar JPG, PNG, WebP, AVIF, HEIC, atau HEIF.", "error");
    return;
  }
  if (file.size > MAX_AVATAR_BYTES) {
    status("Avatar maksimal 8 MB sebelum dioptimalkan.", "error");
    return;
  }
  if (!supabaseConfigured || !supabase) {
    status("Penyimpanan profil belum tersambung pada deployment ini.", "error");
    return;
  }

  busy = true;
  const oldLabel = button?.textContent || "Unggah avatar";
  if (button) { button.disabled = true; button.textContent = "Mengunggah…"; }
  status("Mengoptimalkan dan mengunggah avatar…", "loading");
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const user = data?.session?.user;
    if (!user?.id) throw new Error("Sesi login tidak ditemukan. Coba lagi setelah koneksi kembali.");
    const siteId = activeSiteId();
    if (!siteId) throw new Error("Pilih situs aktif sebelum mengunggah avatar.");

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

    const layer = document.querySelector(".sn-profile-layer-v178");
    const urlInput = layer?.querySelector('[name="avatarUrl"]');
    if (urlInput) {
      urlInput.value = avatarUrl;
      urlInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    updateVisibleIdentity(saved);
    status("Avatar berhasil diperbarui dan disimpan.", "success");
  } catch (error) {
    status(error?.message || "Avatar belum dapat diunggah. Periksa koneksi lalu coba lagi.", "error");
  } finally {
    busy = false;
    if (button) { button.disabled = false; button.textContent = oldLabel; }
  }
}

function enhanceProfileLayer() {
  const layer = document.querySelector(".sn-profile-layer-v178");
  if (!layer || layer.dataset.avatarUploadV248 === PROFILE_AVATAR_RELEASE_V248) return;
  layer.dataset.avatarUploadV248 = PROFILE_AVATAR_RELEASE_V248;
  const summary = layer.querySelector(".sn-profile-summary-v178");
  if (!summary) return;

  const actions = document.createElement("div");
  actions.className = "sn-profile-avatar-actions-v248";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sn-profile-avatar-upload-v248";
  button.textContent = "Unggah avatar";
  button.setAttribute("aria-label", "Pilih gambar avatar dari perangkat");
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";
  input.hidden = true;
  input.setAttribute("aria-hidden", "true");
  button.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.value = "";
    uploadAvatar(file, button);
  });
  actions.append(button, input);
  summary.append(actions);
}

if (typeof document !== "undefined") {
  new MutationObserver(enhanceProfileLayer).observe(document.documentElement, { childList: true, subtree: true });
  enhanceProfileLayer();
}
