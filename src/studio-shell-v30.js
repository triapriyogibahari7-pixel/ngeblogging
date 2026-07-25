const RELEASE = "studio-shell-v30-20260725";
const MOBILE_MAX = 760;
const TABLET_MAX = 1100;
const shellState = new WeakMap();
const naraState = new WeakMap();
let frame = 0;

const CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"/></svg>';
const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
const MINI_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 15h8"/></svg>';
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 21h12a2 2 0 0 0 2-2V7"/></svg>';
const EXPAND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/></svg>';
const RESTORE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v5H3M16 3v5h5M8 21v-5H3M21 16h-5v5"/></svg>';
const VOLUME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></svg>';
const MUTE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m11 5-5 4H2v6h4l5 4Z"/><path d="m22 9-6 6M16 9l6 6"/></svg>';

function positive(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function deviceProfile() {
  const root = document.documentElement;
  const width = positive(window.innerWidth, root.clientWidth || 1);
  const height = positive(window.innerHeight, root.clientHeight || 1);
  const screenWidth = positive(window.screen?.width, width);
  const screenHeight = positive(window.screen?.height, height);
  const shortSide = Math.min(screenWidth, screenHeight);
  const physicalPhone = root.dataset.physicalPhone === "true"
    || root.dataset.physicalScreenMobile === "true"
    || shortSide <= MOBILE_MAX;
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  const desktopPhone = root.dataset.desktopSitePhone === "true"
    || root.dataset.desktopLayoutRequested === "true"
    || (physicalPhone && width > MOBILE_MAX);

  let device = "desktop";
  if (desktopPhone) device = "desktop-phone";
  else if (standalone && width <= MOBILE_MAX) device = "app";
  else if (width <= 480) device = "phone";
  else if (width <= MOBILE_MAX) device = "mobile";
  else if (width <= TABLET_MAX) device = "tablet";
  else if (width <= 1440) device = "laptop";

  return {
    width,
    height,
    physicalPhone,
    standalone,
    desktopPhone,
    device,
    compact: ["phone", "mobile", "app", "tablet"].includes(device),
  };
}

function syncRoot(profile) {
  const root = document.documentElement;
  root.dataset.studioShellAuthorityV30 = RELEASE;
  root.dataset.studioShellModeV30 = profile.device;
  root.dataset.studioShellCompactV30 = String(profile.compact);
  for (const name of ["phone", "mobile", "app", "tablet", "desktop-phone", "laptop", "desktop"]) {
    root.classList.toggle(`studio-v30-${name}`, profile.device === name);
  }
  root.classList.toggle("studio-v30-compact", profile.compact);
  root.classList.toggle("studio-v30-standalone", profile.standalone);
}

function sourceToggle(shell) {
  return shell.querySelector(":scope > .sn-main > .sn-top > .sn-icon")
    || shell.querySelector(":scope > .sn-main > .sn-top .sn-icon");
}

function clickSource(shell, open) {
  const side = shell.querySelector(":scope > .sn-side");
  const source = sourceToggle(shell);
  if (!side || !source) return false;
  const currentlyOpen = !side.classList.contains("collapsed");
  if (currentlyOpen === open) return true;
  source.hidden = false;
  source.disabled = false;
  source.click();
  return true;
}

function buttonLabel(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.getAttribute("aria-label")?.trim()
    || button?.textContent?.trim()
    || "";
}

function removeOlderChrome(shell, side) {
  shell.querySelectorAll(":scope > .sn-mobile-v29-launcher, :scope > .sn-mobile-v29-scrim, :scope > .sn-device-toggle-v26, :scope > .sn-device-toggle-v27, :scope > .sn-device-scrim-v27, :scope > .sn-sidebar-scrim-v23")
    .forEach((node) => node.remove());
  side.querySelectorAll(":scope > .sn-mobile-v29-header, :scope > .sn-mobile-v29-search")
    .forEach((node) => node.remove());
}

function ensureMobileHeader(shell, side) {
  let header = side.querySelector(":scope > .sn-mobile-v30-header");
  if (!header) {
    header = document.createElement("header");
    header.className = "sn-mobile-v30-header";
    header.innerHTML = `<div class="sn-mobile-v30-brand"><strong class="sn-mobile-v30-logo">n<span>.</span></strong><b>Ngeblogging</b></div><button type="button" class="sn-mobile-v30-close" aria-label="Tutup menu">${CLOSE_ICON}</button>`;
    header.querySelector("button")?.addEventListener("click", () => clickSource(shell, false));
    side.prepend(header);
  }

  let search = side.querySelector(":scope > .sn-mobile-v30-search");
  if (!search) {
    search = document.createElement("label");
    search.className = "sn-mobile-v30-search";
    search.innerHTML = `${SEARCH_ICON}<input type="search" inputmode="search" autocomplete="off" placeholder="Cari menu" aria-label="Cari menu Studio">`;
    const input = search.querySelector("input");
    input?.addEventListener("input", () => {
      const query = input.value.trim().toLocaleLowerCase("id-ID");
      side.querySelectorAll(":scope > nav > button").forEach((button) => {
        button.dataset.v30SearchHidden = String(Boolean(query) && !buttonLabel(button).toLocaleLowerCase("id-ID").includes(query));
      });
    });
    header.insertAdjacentElement("afterend", search);
  }
}

function ensureMobileLauncher(shell) {
  let launcher = shell.querySelector(":scope > .sn-mobile-v30-launcher");
  if (!launcher) {
    launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "sn-mobile-v30-launcher";
    launcher.innerHTML = '<strong>n<span>.</span></strong>';
    launcher.setAttribute("aria-label", "Buka menu Ngeblogging");
    launcher.addEventListener("click", () => clickSource(shell, true));
    shell.append(launcher);
  }
  return launcher;
}

function ensureMobileScrim(shell) {
  let scrim = shell.querySelector(":scope > .sn-mobile-v30-scrim");
  if (!scrim) {
    scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "sn-mobile-v30-scrim";
    scrim.setAttribute("aria-label", "Tutup menu Ngeblogging");
    scrim.addEventListener("click", () => clickSource(shell, false));
    shell.append(scrim);
  }
  return scrim;
}

function syncSidebar(shell, profile) {
  const side = shell.querySelector(":scope > .sn-side");
  const source = sourceToggle(shell);
  if (!side || !source) return;

  removeOlderChrome(shell, side);
  ensureMobileHeader(shell, side);
  const launcher = ensureMobileLauncher(shell);
  const scrim = ensureMobileScrim(shell);
  const state = shellState.get(shell) || { initialised: false, lastCompact: null };
  shellState.set(shell, state);

  source.hidden = false;
  source.disabled = false;
  source.dataset.v30SourceToggle = profile.compact ? "programmatic" : "visible";
  source.tabIndex = profile.compact ? -1 : 0;
  source.setAttribute("aria-hidden", String(profile.compact));

  if (!state.initialised) {
    state.initialised = true;
    if (profile.compact && !side.classList.contains("collapsed")) requestAnimationFrame(() => clickSource(shell, false));
  } else if (state.lastCompact === true && !profile.compact && side.classList.contains("collapsed")) {
    requestAnimationFrame(() => clickSource(shell, true));
  }
  state.lastCompact = profile.compact;

  const open = !side.classList.contains("collapsed");
  shell.dataset.v30SidebarOpen = String(open);
  launcher.hidden = !profile.compact || open;
  launcher.disabled = !profile.compact || open;
  launcher.tabIndex = profile.compact && !open ? 0 : -1;
  launcher.setAttribute("aria-expanded", String(open));
  side.id ||= "ngeblogging-studio-sidebar-v30";
  launcher.setAttribute("aria-controls", side.id);

  scrim.hidden = !profile.compact || !open;
  scrim.disabled = !profile.compact || !open;
  scrim.tabIndex = profile.compact && open ? 0 : -1;

  side.querySelectorAll(":scope > .sn-new, :scope > nav > button").forEach((button) => {
    const label = buttonLabel(button);
    if (label) {
      button.title = label;
      button.setAttribute("aria-label", label);
    }
    if (button.getAttribute("aria-hidden") !== "true") {
      button.disabled = false;
      button.tabIndex = 0;
    }
  });
}

function naraProfile(shell, profile) {
  const state = naraState.get(shell) || {
    size: profile.compact ? "mini" : "compact",
    previous: profile.compact ? "mini" : "compact",
    speaker: false,
    spoken: "",
    taskMode: "Otomatis",
  };
  naraState.set(shell, state);
  return state;
}

function setNaraSize(layer, size) {
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const state = naraProfile(shell, deviceProfile());
  const resolved = ["mini", "compact", "expanded"].includes(size) ? size : "compact";
  if (resolved !== "expanded") state.previous = resolved;
  state.size = resolved;
  layer.dataset.naraShellV30 = "true";
  layer.dataset.naraSizeV30 = resolved;
  layer.dataset.naraWindowMode = resolved === "expanded" ? "expanded" : "compact";
  shell.dataset.naraControlsV30 = "true";
  shell.dataset.naraSizeV30 = resolved;
  document.documentElement.dataset.naraV30Open = "true";

  const sizeButton = shell.querySelector(".nara-size-toggle-v30");
  if (sizeButton) {
    const mini = resolved === "mini";
    sizeButton.innerHTML = mini ? BOX_ICON : MINI_ICON;
    sizeButton.title = mini ? "Buka kotak Nara lengkap" : "Kecilkan menjadi widget mini";
    sizeButton.setAttribute("aria-label", sizeButton.title);
  }
  const expandButton = shell.querySelector(".nara-expand-toggle-v30");
  if (expandButton) {
    const expanded = resolved === "expanded";
    expandButton.innerHTML = expanded ? RESTORE_ICON : EXPAND_ICON;
    expandButton.title = expanded ? "Kembali ke kotak Nara" : "Buka Nara layar penuh";
    expandButton.setAttribute("aria-label", expandButton.title);
  }
}

function latestAssistantText(shell) {
  const nodes = [...shell.querySelectorAll(".nara-message.assistant .nara-message-content, .nara-message.assistant > div > p")];
  return nodes.at(-1)?.textContent?.trim() || "";
}

function speak(shell, text) {
  const state = naraProfile(shell, deviceProfile());
  if (!state.speaker || !text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 5000));
  utterance.lang = "id-ID";
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
  state.spoken = text;
}

function ensureSpeaker(shell) {
  const tools = shell.querySelector(".nara-composer-tools");
  if (!tools) return;
  let button = tools.querySelector(":scope > .nara-speaker-v30");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "nara-speaker-v30";
    button.addEventListener("click", () => {
      const state = naraProfile(shell, deviceProfile());
      state.speaker = !state.speaker;
      button.classList.toggle("active", state.speaker);
      button.innerHTML = state.speaker ? VOLUME_ICON : MUTE_ICON;
      button.title = state.speaker ? "Suara jawaban Nara aktif" : "Aktifkan suara jawaban Nara";
      button.setAttribute("aria-label", button.title);
      if (state.speaker) speak(shell, latestAssistantText(shell));
      else window.speechSynthesis?.cancel?.();
    });
    const mic = [...tools.querySelectorAll(":scope > button")].find((candidate) => /suara|mikrofon|microphone/i.test(candidate.title || candidate.getAttribute("aria-label") || ""));
    mic?.insertAdjacentElement("afterend", button);
    if (!mic) tools.append(button);
  }
  const state = naraProfile(shell, deviceProfile());
  button.innerHTML = state.speaker ? VOLUME_ICON : MUTE_ICON;
  button.classList.toggle("active", state.speaker);
  button.title = state.speaker ? "Suara jawaban Nara aktif" : "Aktifkan suara jawaban Nara";
  button.setAttribute("aria-label", button.title);
}

function ensureTaskMode(shell) {
  const tools = shell.querySelector(".nara-composer-tools");
  if (!tools || tools.querySelector(":scope > .nara-mode-v30")) return;
  const label = document.createElement("label");
  label.className = "nara-mode-v30";
  label.innerHTML = '<span>Otomatis</span><select aria-label="Mode kerja Nara"><option>Otomatis</option><option>Menulis</option><option>Riset</option><option>SEO</option><option>Kode</option></select>';
  const select = label.querySelector("select");
  const text = label.querySelector("span");
  select.addEventListener("change", () => {
    const state = naraProfile(shell, deviceProfile());
    state.taskMode = select.value;
    text.textContent = select.value;
    shell.dataset.naraTaskModeV30 = select.value;
  });
  const send = tools.querySelector(":scope > .nara-send");
  send?.insertAdjacentElement("beforebegin", label);
  if (!send) tools.append(label);
}

function ensureNaraControls(shell, profile) {
  const layer = shell.closest(".nara-assistant-layer");
  const header = shell.querySelector(":scope > .nara-assistant-header");
  if (!layer || !header) return;

  header.querySelectorAll(":scope > .nara-size-toggle-v26, :scope > .nara-size-toggle-v27, :scope > .nara-size-toggle-v29, :scope > .nara-expand-toggle-v29, :scope > .nara-window-toggle-v24")
    .forEach((node) => node.remove());

  const close = [...header.querySelectorAll(":scope > button")]
    .find((button) => /tutup|close/i.test(button.title || button.getAttribute("aria-label") || ""));
  if (!close) return;

  let expand = header.querySelector(":scope > .nara-expand-toggle-v30");
  if (!expand) {
    expand = document.createElement("button");
    expand.type = "button";
    expand.className = "nara-expand-toggle-v30";
    expand.addEventListener("click", () => {
      const state = naraProfile(shell, profile);
      setNaraSize(layer, state.size === "expanded" ? state.previous : "expanded");
    });
    close.insertAdjacentElement("beforebegin", expand);
  }

  let size = header.querySelector(":scope > .nara-size-toggle-v30");
  if (!size) {
    size = document.createElement("button");
    size.type = "button";
    size.className = "nara-size-toggle-v30";
    size.addEventListener("click", () => {
      const state = naraProfile(shell, profile);
      const current = state.size === "expanded" ? state.previous : state.size;
      setNaraSize(layer, current === "mini" ? "compact" : "mini");
    });
    expand.insertAdjacentElement("beforebegin", size);
  }

  const state = naraProfile(shell, profile);
  if (!layer.dataset.naraInitialV30) {
    layer.dataset.naraInitialV30 = "true";
    state.size = profile.compact ? "mini" : "compact";
    state.previous = state.size;
  }
  setNaraSize(layer, state.size);
  ensureSpeaker(shell);
  ensureTaskMode(shell);

  const newest = latestAssistantText(shell);
  if (state.speaker && newest && newest !== state.spoken) speak(shell, newest);
}

function autoOpenNara(profile) {
  const shell = document.querySelector(".nara-assistant-shell");
  if (shell) {
    ensureNaraControls(shell, profile);
    return;
  }
  document.documentElement.dataset.naraV30Open = "false";
  const launcher = document.querySelector(".nara-floating-button");
  if (!launcher || launcher.dataset.autoOpenedV30 === "true") return;
  launcher.dataset.autoOpenedV30 = "true";
  launcher.hidden = false;
  launcher.disabled = false;
  launcher.click();
  window.setTimeout(schedule, 0);
  window.setTimeout(schedule, 60);
  window.setTimeout(schedule, 180);
}

function sync() {
  const profile = deviceProfile();
  syncRoot(profile);
  document.querySelectorAll(".sn-shell").forEach((shell) => syncSidebar(shell, profile));
  autoOpenNara(profile);
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.type === "childList" || mutation.attributeName === "class")) schedule();
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

document.addEventListener("click", (event) => {
  const button = event.target.closest(".sn-side > nav > button, .sn-side > .sn-new");
  if (!button) return;
  const profile = deviceProfile();
  if (!profile.compact) return;
  const shell = button.closest(".sn-shell");
  if (shell) requestAnimationFrame(() => clickSource(shell, false));
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const profile = deviceProfile();
  const studio = document.querySelector(".sn-shell");
  const side = studio?.querySelector(":scope > .sn-side");
  if (profile.compact && studio && side && !side.classList.contains("collapsed")) {
    clickSource(studio, false);
    return;
  }
  const layer = document.querySelector('.nara-assistant-layer[data-nara-shell-v30="true"]');
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  const state = shell ? naraProfile(shell, profile) : null;
  if (state?.size === "expanded") setNaraSize(layer, state.previous);
  else if (state?.size === "compact") setNaraSize(layer, "mini");
});

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

schedule();
