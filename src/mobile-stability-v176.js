import "./mobile-stability-v176.css";

const RELEASE = "mobile-stability-v176-20260731";
const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const VALID_NARA_SIZES = new Set(["small", "medium", "full"]);
const NARA_SIZE_KEY = "ngeblogging-nara-size-v148";
const VIEWPORTS = Object.freeze([
  [320,568],[360,640],[375,667],[390,844],[412,915],[430,932],
  [600,960],[768,1024],[820,1180],[1024,768],[1280,720],[1366,768],[1440,900],[1920,1080],
]);

let frame = 0;
let lastDrawerOpen = false;
let lastDrawerToggle = null;
let lastNaraSize = "small";

function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage tidak boleh merusak UI */ }
}

function responsiveMode() {
  return document.documentElement.dataset.studioResponsiveMode || "desktop";
}

function isSmallSurface() {
  const root = document.documentElement;
  return root.dataset.studioDeviceMode === "small"
    || SMALL_MODES.has(responsiveMode())
    || root.dataset.studioHandheld === "true";
}

function layoutWidth() {
  return Math.max(1, document.documentElement.clientWidth || window.innerWidth || 1);
}

function syncRoot() {
  const root = document.documentElement;
  root.dataset.mobileStabilityV176 = RELEASE;
  root.dataset.v176Small = String(isSmallSurface());
  root.dataset.v176ViewportCount = String(VIEWPORTS.length);
  root.style.setProperty("--v176-layout-width", `${layoutWidth()}px`);
  root.style.setProperty("--v176-layout-height", `${Math.max(1, document.documentElement.clientHeight || window.innerHeight || 1)}px`);
}

function drawerParts() {
  const shell = document.querySelector(".sn-shell");
  return {
    shell,
    sidebar: shell?.querySelector("#ngeblogging-studio-sidebar.sn-side") || null,
    backdrop: shell?.querySelector(".sn-side-backdrop") || null,
    main: shell?.querySelector(".sn-main") || null,
    toggle: shell?.querySelector(".sn-sidebar-toggle") || null,
  };
}

function syncDrawer() {
  const { shell, sidebar, backdrop, main, toggle } = drawerParts();
  if (!shell || !sidebar || !main) {
    document.body.classList.remove("sn-mobile-sidebar-open-v176");
    lastDrawerOpen = false;
    return;
  }

  const small = isSmallSurface();
  // Kelas React adalah satu-satunya sumber kebenaran. visualViewport tidak boleh
  // membuat drawer terlihat terbuka tetapi tetap inert/tidak dapat diklik.
  const open = small && sidebar.classList.contains("mobile-open");
  shell.dataset.mobileStabilityAuthority = RELEASE;
  shell.dataset.mobileDrawerOpenV176 = String(open);

  if (small) {
    sidebar.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) sidebar.removeAttribute("inert");
    else sidebar.setAttribute("inert", "");
  } else {
    sidebar.setAttribute("aria-hidden", "false");
    sidebar.removeAttribute("inert");
  }

  // Backdrop sudah mencegah klik ke halaman belakang. inert pada main terbukti
  // membuat beberapa browser Android mengunci seluruh Studio setelah drawer berubah.
  main.removeAttribute("inert");
  document.body.classList.toggle("sn-mobile-sidebar-open-v176", open);
  document.body.classList.toggle("sn-mobile-sidebar-open-v174", open);

  if (open) {
    const measured = Math.max(1, Math.round(sidebar.getBoundingClientRect().width));
    document.documentElement.style.setProperty("--v176-drawer-width", `${measured}px`);
    if (!lastDrawerOpen) {
      lastDrawerToggle = toggle;
      requestAnimationFrame(() => sidebar.querySelector(".sn-side-close,.sn-new,nav button")?.focus({ preventScroll:true }));
    }
  } else if (lastDrawerOpen) {
    requestAnimationFrame(() => lastDrawerToggle?.focus({ preventScroll:true }));
  }

  if (backdrop) {
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    backdrop.tabIndex = open ? 0 : -1;
    backdrop.toggleAttribute("hidden", !open);
  }

  lastDrawerOpen = open;
}

function profileParts() {
  const menu = document.querySelector(".sn-profile-dropdown,.sn-profile-menu-v150");
  const trigger = document.querySelector(".sn-profile-menu-wrap .sn-avatar,.sn-top-actions .sn-avatar");
  return { menu, trigger };
}

function syncProfile() {
  const { menu, trigger } = profileParts();
  if (trigger) {
    trigger.dataset.mobileStabilityV176 = RELEASE;
    trigger.setAttribute("aria-haspopup", "menu");
  }
  if (!menu) return;
  menu.dataset.mobileStabilityV176 = RELEASE;
  menu.setAttribute("role", "menu");
  menu.querySelectorAll(":scope > button").forEach((button) => button.setAttribute("role", "menuitem"));
}

function syncMedia() {
  document.querySelectorAll(".sn-media-library").forEach((library) => {
    library.dataset.mobileStabilityV176 = RELEASE;
    library.querySelectorAll("img,video,audio,button,input,textarea,select").forEach((node) => {
      node.style.removeProperty("zoom");
      node.style.removeProperty("transform");
    });
  });
}

function requestedNaraSize(shell, layer) {
  const current = shell?.dataset.naraSize || layer?.dataset.naraLayerSize || "small";
  return VALID_NARA_SIZES.has(current) ? current : "small";
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.mobileStabilityV176 = RELEASE;
    launcher.setAttribute("aria-label", "Buka Nara AI");
    launcher.setAttribute("title", "Buka Nara AI");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("nara-nonmodal-v176", "nara-fullscreen-v176");
    return;
  }

  const size = requestedNaraSize(shell, layer);
  const full = size === "full";
  layer.dataset.naraLayerSize = size;
  layer.dataset.mobileStabilityV176 = RELEASE;
  shell.dataset.mobileStabilityV176 = RELEASE;
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));

  if (size !== lastNaraSize) {
    safeStorageSet(NARA_SIZE_KEY, size);
    lastNaraSize = size;
  }

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", full ? "false" : "true");
    backdrop.tabIndex = full ? 0 : -1;
  }

  document.body.classList.toggle("nara-nonmodal-v176", !full);
  document.body.classList.toggle("nara-fullscreen-v176", full);
  if (!full) document.body.classList.remove("nara-fullscreen-open-v148", "nara-fullscreen-v174");
}

function sync() {
  frame = 0;
  syncRoot();
  syncDrawer();
  syncProfile();
  syncMedia();
  syncNara();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList:true,
  subtree:true,
  attributes:true,
  attributeFilter:["class","data-device-mode","data-nara-size","data-nara-layer-size","aria-expanded"],
});

window.addEventListener("resize", schedule, { passive:true });
window.addEventListener("orientationchange", schedule, { passive:true });
window.addEventListener("pageshow", schedule, { passive:true });

// visualViewport hanya memperbarui safe geometry. Ia tidak menentukan mode/layout.
window.visualViewport?.addEventListener("resize", schedule, { passive:true });

document.addEventListener("click", (event) => {
  const insideDrawer = event.target.closest("#ngeblogging-studio-sidebar.sn-side.mobile-open");
  if (insideDrawer) insideDrawer.removeAttribute("inert");
  if (event.target.closest(".sn-side-backdrop,.sn-side-close,.sn-sidebar-toggle,.sn-side nav button,.sn-account-footer button,.nara-floating-button,.nara-size-controls-v147 button")) {
    requestAnimationFrame(schedule);
  }
}, { capture:true });

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const sidebar = document.querySelector("#ngeblogging-studio-sidebar.sn-side.mobile-open");
  if (sidebar && isSmallSurface()) sidebar.querySelector(".sn-side-close")?.click();
});

sync();

export { RELEASE, VIEWPORTS, isSmallSurface, syncDrawer, syncNara };
