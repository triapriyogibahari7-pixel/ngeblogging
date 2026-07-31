import { getUserProfile, updateUserProfile } from "./lib/studio-data.js";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import "./studio-finalization-v178.css";

const RELEASE = "studio-finalization-v178-20260731";
const PROFILE_LAYER_CLASS = "sn-profile-layer-v178";
let activeLayer = null;
let activeTrigger = null;
let currentUser = null;
let currentProfile = null;
let saving = false;

function initials(value) {
  return String(value || "Ngeblogging")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "NB";
}

function closeDropdown() {
  document.querySelector(".sn-profile-menu-v150")?.remove();
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
}

function profileAvatar(node, name, avatarUrl) {
  if (!node) return;
  node.replaceChildren();
  if (avatarUrl) {
    const image = document.createElement("img");
    image.src = avatarUrl;
    image.alt = "";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    node.append(image);
  } else {
    node.textContent = initials(name);
  }
}

function updateVisibleIdentity(profile) {
  const name = profile?.display_name || currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Akun Ngeblogging";
  const avatarUrl = profile?.avatar_url || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || "";
  const avatar = document.querySelector(".sn-avatar");
  profileAvatar(avatar, name, avatarUrl);
  if (avatar) {
    avatar.title = name;
    avatar.setAttribute("aria-label", `Buka menu profil ${name}`);
  }
  document.querySelectorAll(".sm176-profile-avatar,.sn-profile-avatar-v178").forEach((node) => profileAvatar(node, name, avatarUrl));
  document.querySelectorAll(".sm176-profile-name,.sn-profile-name-v178").forEach((node) => { node.textContent = name; });
  window.dispatchEvent(new CustomEvent("ngeblogging:profile-updated", {
    detail: { displayName: name, avatarUrl, release: RELEASE },
  }));
}

function setStatus(message, tone = "") {
  const status = activeLayer?.querySelector(".sn-profile-status-v178");
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

function setBusy(next) {
  saving = next;
  const submit = activeLayer?.querySelector('button[type="submit"]');
  if (submit) {
    submit.disabled = next;
    submit.textContent = next ? "Menyimpan…" : "Simpan profil";
  }
}

function closeProfile() {
  if (!activeLayer) return;
  activeLayer.remove();
  activeLayer = null;
  currentUser = null;
  currentProfile = null;
  saving = false;
  document.body.classList.remove("sn-profile-open-v178");
  activeTrigger?.focus?.({ preventScroll: true });
  activeTrigger = null;
}

function focusable(layer) {
  return [...layer.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')]
    .filter((node) => !node.hidden && node.getClientRects().length > 0);
}

function handleDialogKeydown(event) {
  if (!activeLayer) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeProfile();
    return;
  }
  if (event.key !== "Tab") return;
  const items = focusable(activeLayer);
  if (!items.length) return;
  const first = items[0];
  const last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function profileMarkup() {
  return `
    <button type="button" class="sn-profile-backdrop-v178" aria-label="Tutup Profil"></button>
    <form class="sn-profile-dialog-v178" aria-labelledby="sn-profile-title-v178" novalidate>
      <header>
        <div><small>AKUN NGEBLOGGING</small><h1 id="sn-profile-title-v178">Profil</h1><p>Identitas pribadi dipisahkan dari pengaturan situs agar lebih jelas dan mudah dikelola.</p></div>
        <button type="button" class="sn-profile-close-v178" aria-label="Tutup Profil">×</button>
      </header>
      <section class="sn-profile-summary-v178">
        <span class="sn-profile-avatar-v178" aria-hidden="true"></span>
        <div><strong class="sn-profile-name-v178">Memuat profil…</strong><small class="sn-profile-email-v178"></small></div>
      </section>
      <div class="sn-profile-fields-v178">
        <label><span>Nama tampilan</span><input name="displayName" maxlength="120" autocomplete="name" required></label>
        <label><span>Email akun</span><input name="email" type="email" readonly aria-readonly="true"></label>
        <label class="wide"><span>Biografi</span><textarea name="bio" maxlength="2000" rows="5" placeholder="Tuliskan identitas, keahlian, atau tujuan Anda."></textarea><small>Maksimal 2.000 karakter.</small></label>
        <label><span>Website pribadi</span><input name="website" type="url" maxlength="500" inputmode="url" placeholder="https://contoh.com"></label>
        <label><span>URL avatar</span><input name="avatarUrl" type="url" maxlength="2000" inputmode="url" placeholder="https://…"></label>
      </div>
      <p class="sn-profile-status-v178" role="status" aria-live="polite">Memuat profil…</p>
      <footer><button type="button" class="sn-profile-cancel-v178">Batal</button><button type="submit" class="sn-primary">Simpan profil</button></footer>
    </form>`;
}

function buildLayer() {
  const layer = document.createElement("div");
  layer.className = PROFILE_LAYER_CLASS;
  layer.dataset.release = RELEASE;
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.setAttribute("aria-label", "Profil pengguna");
  layer.innerHTML = profileMarkup();
  layer.querySelector(".sn-profile-backdrop-v178").addEventListener("click", closeProfile);
  layer.querySelector(".sn-profile-close-v178").addEventListener("click", closeProfile);
  layer.querySelector(".sn-profile-cancel-v178").addEventListener("click", closeProfile);
  layer.addEventListener("keydown", handleDialogKeydown);
  layer.querySelector('[name="avatarUrl"]').addEventListener("input", (event) => {
    const name = layer.querySelector('[name="displayName"]').value;
    profileAvatar(layer.querySelector(".sn-profile-avatar-v178"), name, event.target.value.trim());
  });
  layer.querySelector('[name="displayName"]').addEventListener("input", (event) => {
    const avatarUrl = layer.querySelector('[name="avatarUrl"]').value.trim();
    profileAvatar(layer.querySelector(".sn-profile-avatar-v178"), event.target.value, avatarUrl);
    layer.querySelector(".sn-profile-name-v178").textContent = event.target.value.trim() || "Akun Ngeblogging";
  });
  layer.querySelector("form").addEventListener("submit", saveProfile);
  return layer;
}

async function loadProfile(layer) {
  if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan akun belum tersedia pada deployment ini.");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data?.session?.user;
  if (!user) throw new Error("Sesi login tidak ditemukan. Muat ulang setelah koneksi kembali.");
  currentUser = user;
  currentProfile = await getUserProfile(user.id).catch(() => null);
  if (!activeLayer || layer !== activeLayer) return;

  const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Akun Ngeblogging";
  const displayName = currentProfile?.display_name || fallbackName;
  const avatarUrl = currentProfile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
  layer.querySelector('[name="displayName"]').value = displayName;
  layer.querySelector('[name="email"]').value = user.email || "";
  layer.querySelector('[name="bio"]').value = currentProfile?.bio || "";
  layer.querySelector('[name="website"]').value = currentProfile?.website || "";
  layer.querySelector('[name="avatarUrl"]').value = avatarUrl;
  layer.querySelector(".sn-profile-email-v178").textContent = user.email || "Email tidak tersedia";
  profileAvatar(layer.querySelector(".sn-profile-avatar-v178"), displayName, avatarUrl);
  layer.querySelector(".sn-profile-name-v178").textContent = displayName;
  setStatus("Profil siap disunting.", "ready");
  layer.querySelector('[name="displayName"]').focus({ preventScroll: true });
}

async function saveProfile(event) {
  event.preventDefault();
  if (!activeLayer || !currentUser || saving) return;
  const form = event.currentTarget;
  const displayName = form.elements.displayName.value.trim();
  if (displayName.length < 2) {
    setStatus("Nama tampilan minimal 2 karakter.", "error");
    form.elements.displayName.focus();
    return;
  }
  setBusy(true);
  setStatus("Menyimpan profil…", "loading");
  try {
    const saved = await updateUserProfile(currentUser.id, {
      displayName,
      bio: form.elements.bio.value,
      website: form.elements.website.value,
      avatarUrl: form.elements.avatarUrl.value,
      locale: currentProfile?.locale || "id-ID",
      timezone: currentProfile?.timezone || "Asia/Jakarta",
    });
    currentProfile = saved;
    updateVisibleIdentity(saved);
    setStatus("Profil berhasil disimpan.", "success");
  } catch (error) {
    setStatus(error?.message || "Profil belum dapat disimpan. Periksa koneksi lalu coba lagi.", "error");
  } finally {
    setBusy(false);
  }
}

async function openProfile(trigger) {
  closeDropdown();
  if (activeLayer) closeProfile();
  activeTrigger = trigger || document.querySelector(".sn-avatar");
  activeLayer = buildLayer();
  document.body.append(activeLayer);
  document.body.classList.add("sn-profile-open-v178");
  requestAnimationFrame(() => activeLayer?.querySelector(".sn-profile-close-v178")?.focus({ preventScroll: true }));
  try {
    await loadProfile(activeLayer);
  } catch (error) {
    setStatus(error?.message || "Profil belum dapat dimuat.", "error");
  }
}

function interceptProfileAction(event) {
  const action = event.target.closest('.sn-profile-menu-v150 [data-action="profile"]');
  if (!action) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  openProfile(document.querySelector(".sn-avatar"));
}

document.addEventListener("click", interceptProfileAction, true);
window.addEventListener("pageshow", () => {
  document.documentElement.dataset.studioFinalizationV178 = RELEASE;
  document.body.classList.remove("sn-profile-open-v178");
  activeLayer?.remove();
  activeLayer = null;
}, { passive: true });
document.documentElement.dataset.studioFinalizationV178 = RELEASE;

export { RELEASE, closeProfile, openProfile, updateVisibleIdentity };
