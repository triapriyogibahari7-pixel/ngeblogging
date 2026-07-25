import { supabase, supabaseConfigured } from "./lib/supabase.js";
import {
  disableIntegration,
  INTEGRATION_CATALOG,
  listUserIntegrations,
  requestIntegration,
} from "./lib/nara-data.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const RELEASE = "nara-connectors-v29-20260725";
const ROOT = document.getElementById("root") || document.documentElement;
const states = new WeakMap();
let frame = 0;

const PLUGIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 3H5a2 2 0 0 0-2 2v3.5a2.5 2.5 0 1 1 0 5V17a2 2 0 0 0 2 2h3.5a2.5 2.5 0 1 0 5 0H17a2 2 0 0 0 2-2v-3.5a2.5 2.5 0 1 0 0-5V5a2 2 0 0 0-2-2h-3.5a2.5 2.5 0 1 1-5 0Z"/></svg>';
const CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"/></svg>';

function stateFor(shell) {
  let state = states.get(shell);
  if (!state) {
    state = { loading: false, loaded: false, busy: "", rows: [], error: "", user: null, siteId: "" };
    states.set(shell, state);
  }
  return state;
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

function recordsByProvider(state) {
  return new Map(state.rows.map((row) => [row.provider, row]));
}

function actionLabel(record) {
  if (!record || record.status === "disabled") return "Hubungkan";
  if (record.status === "connected") return "Connected";
  return "Pending";
}

function render(shell) {
  const panel = shell.querySelector(".nara-plugin-panel-v29");
  const list = panel?.querySelector(".nara-plugin-list-v29");
  if (!panel || !list) return;
  const state = stateFor(shell);
  list.replaceChildren();

  if (state.loading || state.error) {
    const message = document.createElement("div");
    message.className = "nara-plugin-empty-v29";
    message.textContent = state.loading ? "Memuat plugin dan status koneksi…" : state.error;
    list.append(message);
    return;
  }

  const records = recordsByProvider(state);
  for (const plugin of INTEGRATION_CATALOG) {
    const record = records.get(plugin.id);
    const card = document.createElement("article");
    card.className = "nara-plugin-card-v29";

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

async function resolveContext(shell) {
  if (!supabaseConfigured || !supabase) throw new Error("Cloud plugin belum tersambung pada deployment ini.");
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error("Masuk ke akun Ngeblogging untuk mengelola plugin.");
  let siteId = "";
  try { siteId = localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; } catch { siteId = ""; }
  if (!siteId) throw new Error("Pilih workspace situs aktif sebelum mengelola plugin.");
  const state = stateFor(shell);
  state.user = data.user;
  state.siteId = siteId;
  return state;
}

async function load(shell, force = false) {
  const state = stateFor(shell);
  if (state.loading || (state.loaded && !force)) return;
  state.loading = true;
  state.error = "";
  render(shell);
  try {
    await resolveContext(shell);
    state.rows = await listUserIntegrations(state.user.id, state.siteId);
    state.loaded = true;
  } catch (error) {
    state.error = error?.message || "Plugin belum dapat dimuat.";
  } finally {
    state.loading = false;
    render(shell);
  }
}

async function act(shell, provider) {
  const state = stateFor(shell);
  if (state.busy) return;
  state.busy = provider;
  state.error = "";
  render(shell);
  try {
    await resolveContext(shell);
    const record = recordsByProvider(state).get(provider);
    if (record && record.status !== "disabled") {
      const updated = await disableIntegration({ userId: state.user.id, integrationId: record.id });
      state.rows = state.rows.map((row) => row.id === updated.id ? updated : row);
    } else {
      const plugin = INTEGRATION_CATALOG.find((item) => item.id === provider);
      const updated = await requestIntegration({
        userId: state.user.id,
        siteId: state.siteId,
        provider,
        scopes: plugin?.scopes || [],
      });
      state.rows = [updated, ...state.rows.filter((row) => row.provider !== provider)];
    }
    state.loaded = true;
  } catch (error) {
    state.error = error?.message || "Status plugin belum dapat diubah.";
  } finally {
    state.busy = "";
    render(shell);
  }
}

function ensurePanel(shell) {
  const composer = shell.querySelector(".nara-composer");
  if (!composer) return null;
  let panel = composer.querySelector(":scope > .nara-plugin-panel-v29");
  if (panel) return panel;

  panel = document.createElement("section");
  panel.className = "nara-plugin-panel-v29";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Plugins dan connectors Nara");
  panel.innerHTML = `<header><div><b>Plugins & connectors</b><small>GitHub, Supabase, Neon, Cloudflare, dan layanan lain memakai izin yang dapat dicabut.</small></div><button type="button" aria-label="Tutup daftar plugin">${CLOSE_ICON}</button></header><div class="nara-plugin-list-v29"></div>`;
  panel.querySelector("header button")?.addEventListener("click", () => toggle(shell, false));
  panel.querySelector(".nara-plugin-list-v29")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-provider]");
    if (button) act(shell, button.dataset.provider);
  });
  composer.prepend(panel);
  return panel;
}

function toggle(shell, requested) {
  const panel = ensurePanel(shell);
  const trigger = shell.querySelector(".nara-plugin-trigger-v29");
  if (!panel) return;
  const open = requested ?? panel.hidden;
  panel.hidden = !open;
  trigger?.setAttribute("aria-expanded", String(open));
  trigger?.classList.toggle("active", open);
  if (open) load(shell);
}

function ensureTrigger(shell) {
  const tools = shell.querySelector(".nara-composer-tools");
  if (!tools) return;
  tools.querySelectorAll(":scope > .nara-plugin-trigger-v24").forEach((node) => node.remove());
  let trigger = tools.querySelector(":scope > .nara-plugin-trigger-v29");
  if (!trigger) {
    trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "nara-plugin-trigger-v29";
    trigger.innerHTML = PLUGIN_ICON;
    trigger.title = "Plugins & connectors";
    trigger.setAttribute("aria-label", "Buka plugins dan connectors Nara");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => toggle(shell));
    const attachment = tools.querySelector(":scope > .nara-attachment-menu-wrap");
    attachment?.insertAdjacentElement("afterend", trigger);
    if (!attachment) tools.prepend(trigger);
  }
  ensurePanel(shell);
  shell.dataset.naraConnectorsV29 = RELEASE;
}

function scan() {
  document.documentElement.dataset.naraConnectorsV29 = RELEASE;
  document.querySelectorAll('.nara-assistant-shell[data-nara-controls-v29="true"], .nara-assistant-shell').forEach(ensureTrigger);
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(ROOT, { childList: true, subtree: true });

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const panel = document.querySelector(".nara-plugin-panel-v29:not([hidden])");
  if (panel) toggle(panel.closest(".nara-assistant-shell"), false);
});

scan();
