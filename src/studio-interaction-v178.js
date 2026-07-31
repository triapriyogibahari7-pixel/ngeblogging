import { supabase, supabaseConfigured } from "./lib/supabase.js";
import "./studio-interaction-v178.css";

const RELEASE = "studio-mobile-auth-interaction-v178-20260731";
const NARA_SIZE_KEY = "ngeblogging-nara-size-v148";
const MOBILE_QUERY = "(max-width: 820px)";
let frame = 0;
let profileBusy = false;

function mobileLike() {
  const shellMode = document.querySelector(".sn-shell")?.dataset.deviceMode;
  return shellMode === "small"
    || document.documentElement.dataset.studioDeviceMode === "small"
    || window.matchMedia(MOBILE_QUERY).matches
    || window.matchMedia("(display-mode: standalone)").matches;
}

function drawerWidth() {
  const width = Math.max(1, window.visualViewport?.width || window.innerWidth || 1);
  if (width <= 320) return Math.min(Math.round(width * .82), 276);
  if (width <= 360) return Math.min(Math.round(width * .78), 300);
  if (width <= 430) return Math.min(Math.round(width * .74), 326);
  if (width <= 600) return Math.min(Math.round(width * .68), 350);
  return Math.min(Math.round(width * .58), 370);
}

function syncRoot() {
  const root = document.documentElement;
  root.dataset.studioInteractionV178 = RELEASE;
  root.style.setProperty("--sm178-drawer-width", `${drawerWidth()}px`);
  root.style.setProperty("--sm178-visual-height", `${Math.round(window.visualViewport?.height || window.innerHeight)}px`);
}

function syncDrawer() {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector("#ngeblogging-studio-sidebar.sn-side");
  const main = shell?.querySelector(".sn-main");
  const backdrop = shell?.querySelector(".sn-side-backdrop");
  const toggle = shell?.querySelector(".sn-sidebar-toggle");
  if (!shell || !sidebar || !main || !toggle) return;

  const mobile = mobileLike();
  const open = mobile && sidebar.classList.contains("mobile-open");
  const width = drawerWidth();

  main.inert = false;
  main.removeAttribute("inert");
  main.dataset.drawerInteractionV178 = open ? "outside-backdrop-only" : "interactive";
  sidebar.setAttribute("aria-hidden", mobile && !open ? "true" : "false");
  sidebar.dataset.drawerAuthorityV178 = RELEASE;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.dataset.toggleAuthorityV178 = RELEASE;

  sidebar.style.setProperty("--sm178-current-drawer-width", `${width}px`);
  sidebar.style.setProperty("z-index", "2147482500", "important");
  sidebar.style.setProperty("filter", "none", "important");
  sidebar.style.setProperty("opacity", "1", "important");
  sidebar.style.setProperty("isolation", "isolate", "important");

  if (backdrop) {
    backdrop.dataset.drawerAuthorityV178 = open ? "outside-only" : "closed";
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    backdrop.style.setProperty("left", `${width}px`, "important");
    backdrop.style.setProperty("right", "0", "important");
    backdrop.style.setProperty("width", `calc(100vw - ${width}px)`, "important");
    backdrop.style.setProperty("z-index", "2147482400", "important");
    backdrop.style.setProperty("backdrop-filter", "none", "important");
    backdrop.style.setProperty("-webkit-backdrop-filter", "none", "important");
    backdrop.style.setProperty("filter", "none", "important");
  }

  document.body.classList.toggle("sm178-drawer-open", open);
  if (open) {
    document.body.style.setProperty("overflow", "hidden", "important");
  } else {
    document.body.classList.remove(
      "sm177-drawer-open", "sm176-drawer-open", "sn-mobile-sidebar-open", "sn-mobile-sidebar-open-v176",
    );
    document.body.style.removeProperty("overflow");
  }
}

function stopNaraMedia() {
  try { window.speechSynthesis?.cancel(); } catch { /* optional */ }
  const listening = document.querySelector(".nara-composer-tools button.listening");
  if (listening instanceof HTMLButtonElement) listening.click();
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.naraLauncherV178 = RELEASE;
    launcher.setAttribute("aria-label", "Buka Nara AI");
    launcher.title = "Nara AI";
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("sm178-nara-full");
    return;
  }

  let size = shell.dataset.naraSize;
  if (!["small", "medium", "full"].includes(size)) size = "small";
  shell.dataset.naraSize = size;
  shell.dataset.naraAuthorityV178 = RELEASE;
  const full = size === "full";
  layer.dataset.naraInteractionV178 = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", full ? "true" : "false");
  layer.style.setProperty("pointer-events", full ? "auto" : "none", "important");
  document.body.classList.toggle("sm178-nara-full", full);

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", full ? "false" : "true");
    backdrop.style.setProperty("pointer-events", full ? "auto" : "none", "important");
  }
  if (!full) {
    document.body.classList.remove("sm177-nara-full", "nara-fullscreen-open-v176", "nara-fullscreen-open-v148");
    if (!document.body.classList.contains("sm178-drawer-open")) document.body.style.removeProperty("overflow");
  }

  const close = shell.querySelector(".nara-close-v177,[data-nara-close-v177],.nara-assistant-header > button:last-child");
  if (close) {
    close.dataset.naraCloseV178 = RELEASE;
    close.setAttribute("aria-label", "Tutup Nara AI");
    close.title = "Tutup Nara AI";
  }
}

function closeProfileMenu() {
  document.querySelector(".sn-profile-menu-v150")?.remove();
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
}

function profileMarkup() {
  return `
    <div class="sm178-profile-layer" role="dialog" aria-modal="true" aria-label="Profil Ngeblogging">
      <button class="sm178-profile-backdrop" type="button" aria-label="Tutup profil"></button>
      <section class="sm178-profile-panel">
        <header><div><small>PROFIL</small><h2>Profil Ngeblogging</h2><p>Identitas publik dipisahkan dari pengaturan situs.</p></div><button type="button" data-profile-close aria-label="Tutup profil">×</button></header>
        <div class="sm178-profile-state" role="status">Memuat profil…</div>
        <form hidden>
          <label>Nama tampilan<input name="displayName" maxlength="120" autocomplete="name"/></label>
          <label>Biografi<textarea name="bio" maxlength="1000" rows="5"></textarea></label>
          <label>Website<input name="website" type="url" maxlength="500" inputmode="url" placeholder="https://"/></label>
          <label>URL avatar<input name="avatarUrl" type="url" maxlength="2000" inputmode="url" placeholder="https://"/></label>
          <footer><button type="button" data-profile-close>Batal</button><button class="primary" type="submit">Simpan profil</button></footer>
        </form>
      </section>
    </div>`;
}

async function openProfilePanel() {
  closeProfileMenu();
  document.querySelector(".sm178-profile-layer")?.remove();
  document.body.insertAdjacentHTML("beforeend", profileMarkup());
  const layer = document.querySelector(".sm178-profile-layer");
  const state = layer?.querySelector(".sm178-profile-state");
  const form = layer?.querySelector("form");
  if (!layer || !state || !form) return;

  const close = () => layer.remove();
  layer.querySelectorAll("[data-profile-close],.sm178-profile-backdrop").forEach((node) => node.addEventListener("click", close));

  if (!supabaseConfigured || !supabase) {
    state.textContent = "Profil cloud belum tersedia pada deployment ini.";
    return;
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData?.session?.user;
    if (!user) throw new Error("Sesi login belum tersedia.");
    const { data, error } = await supabase.from("profiles")
      .select("display_name,bio,website,avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    form.elements.displayName.value = data?.display_name || user.user_metadata?.full_name || "";
    form.elements.bio.value = data?.bio || "";
    form.elements.website.value = data?.website || "";
    form.elements.avatarUrl.value = data?.avatar_url || user.user_metadata?.avatar_url || "";
    state.hidden = true;
    form.hidden = false;
    form.elements.displayName.focus({ preventScroll: true });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (profileBusy) return;
      profileBusy = true;
      const submit = form.querySelector("button.primary");
      submit.disabled = true;
      submit.textContent = "Menyimpan…";
      try {
        const payload = {
          display_name: form.elements.displayName.value.trim().slice(0, 120),
          bio: form.elements.bio.value.trim().slice(0, 1000),
          website: form.elements.website.value.trim().slice(0, 500),
          avatar_url: form.elements.avatarUrl.value.trim().slice(0, 2000),
        };
        const result = await supabase.from("profiles").update(payload).eq("id", user.id);
        if (result.error) throw result.error;
        window.dispatchEvent(new CustomEvent("ngeblogging:profile-updated", { detail: payload }));
        close();
      } catch (error) {
        state.hidden = false;
        state.textContent = error.message || "Profil belum dapat disimpan.";
      } finally {
        profileBusy = false;
        submit.disabled = false;
        submit.textContent = "Simpan profil";
      }
    });
  } catch (error) {
    state.textContent = error.message || "Profil belum dapat dimuat.";
  }
}

function syncProfileMenu() {
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!menu) return;
  menu.dataset.profileAuthorityV178 = RELEASE;
  menu.querySelectorAll('[data-action="install"],[data-action="avatar"],.sm176-avatar-action').forEach((node) => node.remove());
  const allowed = new Set(["profile", "settings", "logout"]);
  menu.querySelectorAll(":scope > button[data-action]").forEach((button) => {
    if (!allowed.has(button.dataset.action)) button.remove();
  });
  const profile = menu.querySelector('[data-action="profile"]');
  const settings = menu.querySelector('[data-action="settings"]');
  const logout = menu.querySelector('[data-action="logout"]');
  if (profile) profile.querySelector("small")?.replaceChildren("Nama, biografi, website, dan avatar");
  if (settings) settings.querySelector("small")?.replaceChildren("Situs, bahasa, zona waktu, dan preferensi");
  if (logout) logout.querySelector("small")?.replaceChildren("Akhiri sesi hanya pada perangkat ini");
}

function scan() {
  frame = 0;
  syncRoot();
  syncDrawer();
  syncNara();
  syncProfileMenu();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(scan);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-device-mode", "data-nara-size", "aria-expanded", "inert"],
});

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (target.closest(".nara-floating-button")) {
    try { localStorage.setItem(NARA_SIZE_KEY, "small"); } catch { /* optional */ }
    requestAnimationFrame(schedule);
  }

  if (target.closest("[data-nara-close-v178],.nara-close-v177,[data-nara-close-v177]")) stopNaraMedia();

  const profile = target.closest('.sn-profile-menu-v150 [data-action="profile"]');
  if (profile) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openProfilePanel();
    return;
  }

  const menuItem = target.closest("#ngeblogging-studio-sidebar.sn-side.mobile-open nav button,#ngeblogging-studio-sidebar.sn-side.mobile-open .sn-account-footer button,#ngeblogging-studio-sidebar.sn-side.mobile-open .sn-new");
  if (menuItem) {
    window.setTimeout(() => document.querySelector("#ngeblogging-studio-sidebar.sn-side.mobile-open .sn-side-close")?.click(), 0);
  }
  schedule();
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const profile = document.querySelector(".sm178-profile-layer");
  if (profile) {
    profile.remove();
    return;
  }
  const naraClose = document.querySelector(".nara-assistant-shell [data-nara-close-v178],.nara-assistant-shell .nara-close-v177");
  if (naraClose) {
    stopNaraMedia();
    naraClose.click();
    return;
  }
  document.querySelector("#ngeblogging-studio-sidebar.sn-side.mobile-open .sn-side-close")?.click();
});

schedule();

export { RELEASE, drawerWidth, mobileLike, syncDrawer, syncNara, openProfilePanel };
