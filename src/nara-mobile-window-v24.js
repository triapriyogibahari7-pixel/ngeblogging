import { supabase, supabaseConfigured } from "./lib/supabase.js";
import {
  disableIntegration,
  INTEGRATION_CATALOG,
  listUserIntegrations,
  requestIntegration,
} from "./lib/nara-data.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const RELEASE = "nara-mobile-window-v24-20260725";
const ROOT = document.getElementById("root") || document.documentElement;
const attached = new WeakSet();
const pluginStates = new WeakMap();
let scanFrame = 0;

const EXPAND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/></svg>';
const RESTORE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v5H3M16 3v5h5M8 21v-5H3M21 16h-5v5"/></svg>';
const PLUGIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 3H5a2 2 0 0 0-2 2v3.5a2.5 2.5 0 1 1 0 5V17a2 2 0 0 0 2 2h3.5a2.5 2.5 0 1 0 5 0H17a2 2 0 0 0 2-2v-3.5a2.5 2.5 0 1 0 0-5V5a2 2 0 0 0-2-2h-3.5a2.5 2.5 0 1 1-5 0Z"/></svg>';
const CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"/></svg>';

function compactMobile() {
  const root = document.documentElement;
  if (root.dataset.desktopLayoutRequested === "true") return false;
  if (root.dataset.compactViewport === "true") return true;
  return window.matchMedia("(max-width: 760px)").matches;
}

function pluginState(shell) {
  let state = pluginStates.get(shell);
  if (!state) {
    state = { loaded: false, loading: false, busy: "", rows: [], error: "", user: null, siteId: "" };
    pluginStates.set(shell, state);
  }
  return state;
}

function integrationMap(state) {
  return new Map(state.rows.map((item) => [item.provider, item]));
}

function providerMark(provider) {
  return ({
    github: "GH",
    supabase: "SB",
    neon: "NE",
    cloudflare: "CF",
    paypal: "PP",
    qris: "QR",
    "google-drive": "GD",
    "google-analytics": "GA",
    webhook: "WH",
  })[provider] || provider.slice(0, 2).toUpperCase();
}

function actionLabel(record) {
  if (!record || record.status === "disabled") return "Hubungkan";
  if (record.status === "connected") return "Connected";
  return "Pending";
}

function renderPluginPanel(shell) {
  const panel = shell.querySelector(".nara-plugin-panel-v24");
  const list = panel?.querySelector(".nara-plugin-list-v24");
  if (!panel || !list) return;
  const state = pluginState(shell);
  list.replaceChildren();

  if (state.loading) {
    const message = document.createElement("div");
    message.className = "nara-plugin-empty-v24";
    message.textContent = "Memuat plugin dan status koneksi…";
    list.append(message);
    return;
  }

  if (state.error) {
    const message = document.createElement("div");
    message.className = "nara-plugin-empty-v24";
    message.textContent = state.error;
    list.append(message);
    return;
  }

  const records = integrationMap(state);
  for (const plugin of INTEGRATION_CATALOG) {
    const record = records.get(plugin.id);
    const card = document.createElement("article");
    card.className = "nara-plugin-card-v24";

    const mark = document.createElement("span");
    mark.textContent = providerMark(plugin.id);

    const copy = document.createElement("div");
    const name = document.createElement("b");
    name.textContent = plugin.name;
    const detail = document.createElement("small");
    detail.textContent = `${plugin.category} · ${plugin.scopes.join(", ")}`;
    copy.append(name, detail);

    const action = document.createElement("button");
    action.type = "button";
    action.dataset.provider = plugin.id;
    action.dataset.status = record?.status || "available";
    action.disabled = Boolean(state.busy);
    action.textContent = state.busy === plugin.id ? "Memproses…" : actionLabel(record);
    action.setAttribute("aria-label", `${action.textContent} ${plugin.name}`);

    card.append(mark, copy, action);
    list.append(card);
  }
}

async function resolvePluginContext(shell) {
  if (!supabaseConfigured || !supabase) throw new Error("Cloud plugin belum tersambung pada deployment ini.");
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error("Masuk ke akun Ngeblogging untuk mengelola plugin.");
  let siteId = "";
  try { siteId = localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; } catch { siteId = ""; }
  if (!siteId) throw new Error("Pilih workspace situs aktif sebelum mengelola plugin.");
  const state = pluginState(shell);
  state.user = data.user;
  state.siteId = siteId;
  return state;
}

async function loadPlugins(shell, force = false) {
  const state = pluginState(shell);
  if (state.loading || (state.loaded && !force)) return;
  state.loading = true;
  state.error = "";
  renderPluginPanel(shell);
  try {
    await resolvePluginContext(shell);
    state.rows = await listUserIntegrations(state.user.id, state.siteId);
    state.loaded = true;
  } catch (error) {
    state.error = error?.message || "Plugin belum dapat dimuat.";
  } finally {
    state.loading = false;
    renderPluginPanel(shell);
  }
}

async function runPluginAction(shell, provider) {
  const state = pluginState(shell);
  if (state.busy) return;
  state.busy = provider;
  state.error = "";
  renderPluginPanel(shell);
  try {
    await resolvePluginContext(shell);
    const record = integrationMap(state).get(provider);
    if (record && record.status !== "disabled") {
      const updated = await disableIntegration({ userId: state.user.id, integrationId: record.id });
      state.rows = state.rows.map((item) => item.id === updated.id ? updated : item);
    } else {
      const plugin = INTEGRATION_CATALOG.find((item) => item.id === provider);
      const updated = await requestIntegration({
        userId: state.user.id,
        siteId: state.siteId,
        provider,
        scopes: plugin?.scopes || [],
      });
      state.rows = [updated, ...state.rows.filter((item) => item.provider !== provider)];
    }
    state.loaded = true;
  } catch (error) {
    state.error = error?.message || "Status plugin belum dapat diubah.";
  } finally {
    state.busy = "";
    renderPluginPanel(shell);
  }
}

function ensurePluginPanel(shell) {
  const composer = shell.querySelector(".nara-composer");
  if (!composer) return null;
  let panel = composer.querySelector(":scope > .nara-plugin-panel-v24");
  if (panel) return panel;

  panel = document.createElement("section");
  panel.className = "nara-plugin-panel-v24";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Plugin dan connectors Nara");
  panel.innerHTML = `<header><div><b>Plugins & connectors</b><small>Kelola GitHub, Supabase, Neon, Cloudflare, dan konektor lain dengan izin yang jelas.</small></div><button type="button" aria-label="Tutup daftar plugin">${CLOSE_ICON}</button></header><div class="nara-plugin-list-v24"></div>`;
  panel.querySelector("header button")?.addEventListener("click", () => {
    panel.hidden = true;
    const trigger = shell.querySelector(".nara-plugin-trigger-v24");
    trigger?.setAttribute("aria-expanded", "false");
    trigger?.classList.remove("active");
  });
  panel.querySelector(".nara-plugin-list-v24")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-provider]");
    if (button) runPluginAction(shell, button.dataset.provider);
  });
  composer.prepend(panel);
  return panel;
}

function togglePluginPanel(shell) {
  const panel = ensurePluginPanel(shell);
  const trigger = shell.querySelector(".nara-plugin-trigger-v24");
  if (!panel) return;
  panel.hidden = !panel.hidden;
  const open = !panel.hidden;
  trigger?.setAttribute("aria-expanded", String(open));
  trigger?.classList.toggle("active", open);
  if (open) loadPlugins(shell);
}

function ensurePluginTrigger(shell) {
  const tools = shell.querySelector(".nara-composer-tools");
  if (!tools) return;
  let trigger = tools.querySelector(":scope > .nara-plugin-trigger-v24");
  if (!trigger) {
    trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "nara-plugin-trigger-v24";
    trigger.innerHTML = PLUGIN_ICON;
    trigger.title = "Plugins & connectors";
    trigger.setAttribute("aria-label", "Buka plugin dan connectors Nara");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => togglePluginPanel(shell));
    const attachment = tools.querySelector(":scope > .nara-attachment-menu-wrap");
    attachment?.insertAdjacentElement("afterend", trigger);
    if (!attachment) tools.prepend(trigger);
  }
  ensurePluginPanel(shell);
}

function setWindowMode(layer, mode) {
  if (!layer) return;
  const shell = layer.querySelector(".nara-assistant-shell");
  if (!shell) return;
  layer.dataset.naraWindowMode = mode;
  shell.dataset.naraWindowMode = mode;
  document.documentElement.dataset.naraMobileExpanded = String(mode === "expanded");
  const toggle = shell.querySelector(".nara-window-toggle-v24");
  if (toggle) {
    const expanded = mode === "expanded";
    toggle.innerHTML = expanded ? RESTORE_ICON : EXPAND_ICON;
    toggle.title = expanded ? "Kembali ke kotak kecil" : "Lebarkan layar penuh";
    toggle.setAttribute("aria-label", toggle.title);
    toggle.setAttribute("aria-pressed", String(expanded));
  }
}

function ensureWindowControls(shell) {
  const layer = shell.closest(".nara-assistant-layer");
  const header = shell.querySelector(".nara-assistant-header");
  if (!layer || !header) return;
  shell.dataset.naraWindowV24 = "true";
  layer.dataset.naraWindowV24 = RELEASE;

  const close = [...header.querySelectorAll(":scope > button")]
    .find((button) => button.title === "Tutup" || button.getAttribute("aria-label") === "Tutup");
  if (!close) return;

  let toggle = header.querySelector(":scope > .nara-window-toggle-v24");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nara-window-toggle-v24";
    toggle.addEventListener("click", () => {
      const next = layer.dataset.naraWindowMode === "expanded" ? "compact" : "expanded";
      setWindowMode(layer, next);
    });
    close.insertAdjacentElement("beforebegin", toggle);
  }

  if (compactMobile()) {
    if (!layer.dataset.naraWindowMode || layer.dataset.naraWindowMode === "desktop") setWindowMode(layer, "compact");
    toggle.hidden = false;
    toggle.disabled = false;
    toggle.removeAttribute("aria-hidden");
  } else {
    layer.dataset.naraWindowMode = "desktop";
    shell.dataset.naraWindowMode = "desktop";
    toggle.hidden = true;
    toggle.disabled = true;
    toggle.setAttribute("aria-hidden", "true");
    document.documentElement.dataset.naraMobileExpanded = "false";
  }
}

function attach(shell) {
  ensureWindowControls(shell);
  ensurePluginTrigger(shell);
  if (!attached.has(shell)) {
    attached.add(shell);
    shell.dataset.mobileWindowRelease = RELEASE;
  }
}

function scan() {
  document.documentElement.dataset.naraMobileWindow = RELEASE;
  document.querySelectorAll(".nara-assistant-shell").forEach(attach);
}

function scheduleScan() {
  cancelAnimationFrame(scanFrame);
  scanFrame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) scheduleScan();
}).observe(ROOT, { childList: true, subtree: true });

window.addEventListener("resize", scheduleScan, { passive: true });
window.addEventListener("orientationchange", scheduleScan, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleScan, { passive: true });

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const panel = document.querySelector(".nara-plugin-panel-v24:not([hidden])");
  if (panel) {
    panel.hidden = true;
    panel.closest(".nara-assistant-shell")?.querySelector(".nara-plugin-trigger-v24")?.setAttribute("aria-expanded", "false");
  }
});

scan();
