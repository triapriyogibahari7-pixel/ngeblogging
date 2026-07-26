import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";
import { loadSiteThemeState, saveSiteThemeState } from "./lib/theme-data.js";
import { createDefaultThemeState, loadThemeState, normalizeThemeState, saveThemeState } from "./theme-system.js";
import { BUILT_IN_WIDGETS, BUILT_IN_WIDGET_COUNT, LAYOUT_AREAS, normalizeLayoutArea, normalizeWidgetState } from "./widget-system.js";

const RELEASE = "studio-layout-builder-v39-20260726";
const COPYRIGHT_START = "/* NG-LAYOUT-COPYRIGHT-V36:start */";
const COPYRIGHT_END = "/* NG-LAYOUT-COPYRIGHT-V36:end */";
const OPEN_EVENT = "ngeblogging:open-layout-builder-v36";
const SAVED_EVENT = "ngeblogging:layout-saved-v36";
let activeLayer = null;
let scanFrame = 0;
const AREA_LABEL = new Map(LAYOUT_AREAS.map((area) => [area.id, area.label]));

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function escapeCssString(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ").slice(0, 180);
}

function activeSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; } catch { return ""; }
}

function workspaceName() {
  return document.querySelector(".sn-workspace b")?.textContent?.trim()
    || document.querySelector(".sn-top .sn-workspace")?.textContent?.trim()
    || "Situs aktif";
}

async function sessionUser() {
  if (!supabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user || null;
}

async function loadContext() {
  const siteId = activeSiteId();
  const user = await sessionUser().catch(() => null);
  let state = null;
  if (siteId && user?.id) state = await loadSiteThemeState(siteId).catch(() => null);
  state = normalizeThemeState(state || loadThemeState() || createDefaultThemeState());
  return { siteId, user, state };
}

function stripCopyrightCss(css) {
  const source = String(css || "");
  const start = source.indexOf(COPYRIGHT_START);
  if (start < 0) return source.trim();
  const end = source.indexOf(COPYRIGHT_END, start);
  if (end < 0) return source.slice(0, start).trim();
  return `${source.slice(0, start)}${source.slice(end + COPYRIGHT_END.length)}`.trim();
}

function readCopyrightOwner(css) {
  const match = String(css || "").match(/--ng-layout-owner:\s*"((?:\\.|[^"])*)"/);
  return match ? match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : workspaceName();
}

function copyrightCss(owner) {
  const safe = escapeCssString(owner || workspaceName());
  const year = new Date().getFullYear();
  return `${COPYRIGHT_START}\n:root{--ng-layout-owner:"${safe}"}\n.ng-layout-copyright::after{content:"© ${year} " var(--ng-layout-owner) ". Seluruh hak dilindungi."}\n${COPYRIGHT_END}`;
}

function layoutWidgets(state) {
  return normalizeWidgetState(state.widgets).map((widget, order) => ({ ...widget, area: normalizeLayoutArea(widget.area), order }));
}

function chipsFor(widgets, area) {
  const items = widgets.filter((widget) => widget.enabled && widget.area === area);
  return items.length ? items.map((widget) => `<i title="${escapeHtml(widget.title)}">${escapeHtml(widget.title)}</i>`).join("") : "<small>Kosong</small>";
}

function zone(area, widgets) {
  return `<button type="button" class="lb36-zone" data-area="${area}"><b>${escapeHtml(AREA_LABEL.get(area) || area)}</b><span>${chipsFor(widgets, area)}</span></button>`;
}

function previewDevice() {
  if (matchMedia("(max-width: 560px)").matches) return "mobile";
  if (matchMedia("(max-width: 900px)").matches) return "tablet";
  return "desktop";
}

function deviceToolbar(device) {
  return `<div class="lb36-device-switch" role="group" aria-label="Mode pratinjau tata letak">${[["desktop", "Desktop"], ["tablet", "Tablet"], ["mobile", "Mobile"]].map(([value, label]) => `<button type="button" data-device="${value}" aria-pressed="${device === value}">${label}</button>`).join("")}</div>`;
}

function canvasMarkup(widgets, owner, device = previewDevice()) {
  return `<div class="lb36-canvas" data-preview-device="${device}">
    <div class="lb36-header-row">${zone("header-left", widgets)}${zone("header-right", widgets)}</div>
    ${zone("below-header", widgets)}${zone("before-content", widgets)}
    <div class="lb36-content-row">
      <div class="lb36-side-stack lb36-side-left">${zone("sidebar-left-top", widgets)}${zone("sidebar-left-bottom", widgets)}</div>
      <div class="lb36-post-preview"><div><b>Kotak postingan</b><small>Posts dan Pages situs aktif tetap berada di area utama.</small></div></div>
      <div class="lb36-side-stack lb36-side-right">${zone("sidebar-right-top", widgets)}${zone("sidebar-right-bottom", widgets)}</div>
    </div>
    ${zone("after-content", widgets)}
    <div class="lb36-footer-row"><div class="lb36-footer-stack">${zone("footer-left-top", widgets)}${zone("footer-left-bottom", widgets)}</div><div class="lb36-footer-stack">${zone("footer-right-top", widgets)}${zone("footer-right-bottom", widgets)}</div></div>
    ${zone("footer-wide", widgets)}
    <div class="lb36-copyright"><label for="lb36-owner">Copyright atas nama</label><input id="lb36-owner" maxlength="180" value="${escapeHtml(owner)}" placeholder="Nama pemilik situs"></div>
  </div>`;
}

function customCodeFields(entry, enabled) {
  return `<details class="lb36-code-settings" ${enabled ? "" : "hidden"}><summary>Isi HTML / JavaScript</summary><label>HTML<textarea data-setting="html" rows="5" maxlength="60000" placeholder="<section>Konten khusus…</section>">${escapeHtml(entry?.settings?.html || "")}</textarea></label><label>JavaScript<textarea data-setting="javascript" rows="5" maxlength="40000" placeholder="root.querySelector('…')">${escapeHtml(entry?.settings?.javascript || "")}</textarea></label><small>JavaScript dijalankan pada elemen widget situs aktif dan tidak mengubah antarmuka Studio.</small></details>`;
}

function widgetRows(widgets) {
  const current = new Map(widgets.map((widget) => [widget.id, widget]));
  return BUILT_IN_WIDGETS.map((widget) => {
    const entry = current.get(widget.id);
    const enabled = Boolean(entry?.enabled);
    const area = normalizeLayoutArea(entry?.area, "after-content");
    const searchText = `${widget.name} ${widget.category} ${widget.description}`.toLowerCase();
    return `<article class="lb36-widget${enabled ? " enabled" : ""}" data-widget="${widget.id}" data-search="${escapeHtml(searchText)}"><button type="button" class="lb36-widget-toggle" aria-pressed="${enabled}">${enabled ? "✓" : widget.icon}</button><div class="lb36-widget-main"><b>${escapeHtml(widget.name)}</b><small>${escapeHtml(widget.category)} · ${escapeHtml(widget.description)}</small><select aria-label="Area ${escapeHtml(widget.name)}" ${enabled ? "" : "disabled"}>${LAYOUT_AREAS.map((item) => `<option value="${item.id}"${item.id === area ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select>${widget.id === "html-javascript" ? customCodeFields(entry, enabled) : ""}</div></article>`;
  }).join("");
}

function setStatus(layer, message, error = false) {
  const status = layer.querySelector(".lb36-status");
  if (!status) return;
  status.textContent = message;
  status.style.color = error ? "#a74351" : "";
}

function closeBuilder() {
  activeLayer?.remove();
  activeLayer = null;
  document.documentElement.style.removeProperty("overflow");
}

function settingsForRow(row, original = {}) {
  if (row.dataset.widget !== "html-javascript") return original;
  return { html: row.querySelector('[data-setting="html"]')?.value || "", javascript: row.querySelector('[data-setting="javascript"]')?.value || "" };
}

function selectedWidgets(layer, baseWidgets) {
  const base = new Map(baseWidgets.map((widget) => [widget.id, widget]));
  return [...layer.querySelectorAll(".lb36-widget.enabled")].map((row, order) => {
    const id = row.dataset.widget;
    const original = base.get(id);
    return {
      id,
      enabled: true,
      area: normalizeLayoutArea(row.querySelector("select")?.value || "sidebar-right-top"),
      order,
      title: original?.title || BUILT_IN_WIDGETS.find((widget) => widget.id === id)?.name || id,
      settings: settingsForRow(row, original?.settings || {}),
    };
  });
}

function currentDevice(layer) {
  return layer.querySelector(".lb36-canvas")?.dataset.previewDevice || previewDevice();
}

function rerenderCanvas(layer, baseWidgets) {
  const host = layer.querySelector(".lb36-canvas-host");
  if (host) host.innerHTML = canvasMarkup(selectedWidgets(layer, baseWidgets), layer.querySelector("#lb36-owner")?.value || workspaceName(), currentDevice(layer));
  bindCanvas(layer);
}

function bindDeviceSwitch(layer) {
  layer.querySelectorAll(".lb36-device-switch button").forEach((button) => button.addEventListener("click", () => {
    layer.querySelectorAll(".lb36-device-switch button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    const canvas = layer.querySelector(".lb36-canvas");
    if (canvas && button.dataset.device) canvas.dataset.previewDevice = button.dataset.device;
  }));
}

function bindCanvas(layer) {
  layer.querySelectorAll(".lb36-zone").forEach((zoneButton) => zoneButton.addEventListener("click", () => {
    layer.querySelectorAll(".lb36-zone").forEach((item) => item.classList.remove("active"));
    zoneButton.classList.add("active");
    const firstEnabled = layer.querySelector(".lb36-widget.enabled select");
    if (firstEnabled && zoneButton.dataset.area) {
      firstEnabled.value = zoneButton.dataset.area;
      firstEnabled.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }));
}

function bindLibrary(layer, baseWidgets) {
  const list = layer.querySelector(".lb36-widget-list");
  list.querySelectorAll(".lb36-widget").forEach((row) => {
    row.querySelector(".lb36-widget-toggle")?.addEventListener("click", () => {
      row.classList.toggle("enabled");
      const enabled = row.classList.contains("enabled");
      row.querySelector("select").disabled = !enabled;
      row.querySelector(".lb36-widget-toggle").textContent = enabled ? "✓" : BUILT_IN_WIDGETS.find((widget) => widget.id === row.dataset.widget)?.icon || "+";
      row.querySelector(".lb36-widget-toggle").setAttribute("aria-pressed", String(enabled));
      const code = row.querySelector(".lb36-code-settings");
      if (code) code.hidden = !enabled;
      rerenderCanvas(layer, baseWidgets);
    });
    row.querySelector("select")?.addEventListener("change", () => rerenderCanvas(layer, baseWidgets));
    row.querySelectorAll("textarea").forEach((input) => input.addEventListener("input", () => rerenderCanvas(layer, baseWidgets)));
  });
  layer.querySelector(".lb36-search")?.addEventListener("input", (event) => {
    const needle = event.target.value.trim().toLowerCase();
    list.querySelectorAll(".lb36-widget").forEach((row) => { row.hidden = Boolean(needle && !String(row.dataset.search || "").includes(needle)); });
  });
}

function historyEntry(state, widgets) {
  return { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), note: "Tata letak visual responsif diperbarui", activeThemeId: state.activeThemeId, publishedConfig: state.publishedConfig, code: state.code, widgets };
}

async function saveBuilder(layer, context, baseWidgets) {
  const button = layer.querySelector(".lb36-save");
  button.disabled = true;
  setStatus(layer, "Menyimpan tata letak situs aktif…");
  try {
    const widgets = selectedWidgets(layer, baseWidgets);
    const owner = layer.querySelector("#lb36-owner")?.value.trim() || workspaceName();
    const marker = copyrightCss(owner);
    const next = normalizeThemeState({
      ...context.state,
      widgets,
      draftConfig: { ...context.state.draftConfig, customCss: `${stripCopyrightCss(context.state.draftConfig?.customCss)}\n${marker}`.trim() },
      publishedConfig: { ...context.state.publishedConfig, customCss: `${stripCopyrightCss(context.state.publishedConfig?.customCss)}\n${marker}`.trim() },
      updatedAt: new Date().toISOString(),
    });
    next.history = [historyEntry(next, widgets), ...(context.state.history || [])].slice(0, 50);
    saveThemeState(next);
    if (context.siteId && context.user?.id) await saveSiteThemeState(context.siteId, context.user.id, next);
    window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: { siteId: context.siteId, widgets, owner, layoutVersion: "v39" } }));
    setStatus(layer, "Tata letak desktop, tablet, mobile, widget, dan copyright berhasil disimpan.");
    window.setTimeout(() => { closeBuilder(); applyAllPreviews(); }, 550);
  } catch (error) {
    console.error("Layout save failed", error);
    setStatus(layer, error.message || "Tata letak belum dapat disimpan.", true);
    button.disabled = false;
  }
}

async function openBuilder() {
  closeBuilder();
  document.documentElement.style.overflow = "hidden";
  const initialDevice = previewDevice();
  const layer = document.createElement("div");
  layer.className = "lb36-layer";
  layer.dataset.layoutVersion = "v39";
  layer.innerHTML = `<section class="lb36-dialog" role="dialog" aria-modal="true" aria-labelledby="lb36-title"><header class="lb36-head"><div><small>TATA LETAK RESPONSIF PER SITUS</small><h2 id="lb36-title">Susun semua bagian situs</h2><p>Workspace: ${escapeHtml(workspaceName())}. Desktop, tablet, dan mobile disusun terpisah tanpa menimpa menu Studio atau Nara AI.</p></div><button type="button" class="lb36-close" aria-label="Tutup">×</button></header><div class="lb36-body"><section class="lb36-canvas-wrap"><div class="lb36-section-title"><div><h3>Pratinjau kotak tata letak</h3><p>Header, dua sidebar kiri, postingan, dua sidebar kanan, footer bertingkat, footer panjang, dan copyright.</p></div>${deviceToolbar(initialDevice)}</div><div class="lb36-canvas-host"><div class="lb36-post-preview"><div><b>Memuat…</b></div></div></div></section><section class="lb36-library"><div class="lb36-section-title"><div><h3>${BUILT_IN_WIDGET_COUNT} widget bawaan + 1 HTML/JavaScript</h3><p>Aktifkan widget lalu pilih kotak tujuan untuk situs aktif.</p></div></div><div class="lb36-library-toolbar"><input class="lb36-search" placeholder="Cari widget…" aria-label="Cari widget"></div><div class="lb36-widget-list"></div></section></div><footer class="lb36-foot"><span class="lb36-status">Memuat tata letak situs aktif…</span><div class="lb36-actions"><button type="button" class="lb36-cancel">Batal</button><button type="button" class="lb36-save primary">Simpan & terbitkan</button></div></footer></section>`;
  document.body.append(layer);
  activeLayer = layer;
  layer.querySelector(".lb36-close").addEventListener("click", closeBuilder);
  layer.querySelector(".lb36-cancel").addEventListener("click", closeBuilder);
  layer.addEventListener("click", (event) => { if (event.target === layer) closeBuilder(); });
  bindDeviceSwitch(layer);
  try {
    const context = await loadContext();
    if (activeLayer !== layer) return;
    const widgets = layoutWidgets(context.state);
    const owner = readCopyrightOwner(context.state.publishedConfig?.customCss);
    layer.querySelector(".lb36-canvas-host").innerHTML = canvasMarkup(widgets, owner, initialDevice);
    layer.querySelector(".lb36-widget-list").innerHTML = widgetRows(widgets);
    bindCanvas(layer);
    bindLibrary(layer, widgets);
    layer.querySelector(".lb36-save").addEventListener("click", () => saveBuilder(layer, context, widgets));
    setStatus(layer, `${widgets.filter((widget) => widget.enabled).length} widget aktif · tersimpan terpisah untuk ${workspaceName()}.`);
  } catch (error) {
    setStatus(layer, error.message || "Tata letak belum dapat dimuat.", true);
    layer.querySelector(".lb36-save").disabled = true;
  }
}

function addOpenButtons() {
  document.querySelectorAll(".tn-hero-actions, .tn-command nav").forEach((target) => {
    if (target.querySelector("[data-layout-builder-v36]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lb36-open";
    button.dataset.layoutBuilderV36 = "true";
    button.innerHTML = '<span aria-hidden="true">▦</span><span>Tata Letak</span>';
    button.addEventListener("click", openBuilder);
    const widgetButton = [...target.querySelectorAll("button")].find((item) => /widget/i.test(item.textContent));
    if (widgetButton) widgetButton.insertAdjacentElement("beforebegin", button); else target.append(button);
  });
}

function layoutStyle() {
  return `.ng-layout-v36{width:100%;min-width:0;display:grid;grid-template-columns:minmax(0,1fr);overflow-x:hidden}.ng-layout-header{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:16px clamp(16px,4vw,64px)}.ng-layout-below,.ng-layout-before,.ng-layout-after,.ng-layout-footer-wide{min-width:0}.ng-layout-body{min-width:0;display:grid;grid-template-columns:minmax(180px,.58fr) minmax(0,1.75fr) minmax(180px,.58fr);align-items:start;gap:18px;padding:0 clamp(14px,3vw,48px)}.ng-layout-center{min-width:0;overflow:hidden}.ng-layout-side{min-width:0;display:grid;gap:14px;align-content:start}.ng-layout-footer{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:18px clamp(16px,4vw,64px)}.ng-layout-footer-column{min-width:0;display:grid;gap:14px}.ng-layout-footer-wide{padding:0 clamp(16px,4vw,64px) 18px}.ng-layout-copyright{min-height:48px;display:flex;align-items:center;justify-content:center;padding:12px 18px;border-top:1px solid color-mix(in srgb,currentColor,transparent 84%);font-size:.82rem;opacity:.76;text-align:center}.ng-layout-slot:empty{display:none}.ng-layout-slot{min-width:0}.ng-layout-slot>.ng-widget{margin-bottom:14px}.ng-layout-slot>.ng-widget:last-child{margin-bottom:0}@media(max-width:980px){.ng-layout-body{grid-template-columns:minmax(150px,.48fr) minmax(0,1.5fr)}.ng-layout-side-right{grid-column:1/-1;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}@media(max-width:720px){.ng-layout-header,.ng-layout-footer,.ng-layout-body,.ng-layout-side-right{grid-template-columns:minmax(0,1fr)}.ng-layout-body{padding:0 12px;gap:12px}.ng-layout-center{grid-row:1}.ng-layout-side-left{grid-row:2}.ng-layout-side-right{grid-row:3}.ng-layout-header,.ng-layout-footer{padding:12px}.ng-layout-footer-wide{padding:0 12px 12px}}`;
}

function applyLayoutDocument(doc) {
  if (!doc?.body) return;
  const existing = doc.body.querySelector(":scope > .ng-layout-v36");
  if (existing?.dataset.layoutRelease === "v39") return;
  if (existing) {
    const center = existing.querySelector(".ng-layout-center");
    while (center?.firstChild) existing.parentNode.insertBefore(center.firstChild, existing);
    existing.remove();
  }
  const widgets = [...doc.querySelectorAll(".ng-widget[data-layout-area]")];
  const styles = [...doc.querySelectorAll("style")].map((style) => style.textContent || "").join("\n");
  if (!widgets.length && !styles.includes("NG-LAYOUT-COPYRIGHT-V36")) return;
  const scriptNodes = [...doc.body.children].filter((node) => node.tagName === "SCRIPT");
  const contentNodes = [...doc.body.childNodes].filter((node) => !scriptNodes.includes(node) && !(node.nodeType === 1 && node.matches?.(".ng-widget-area")) && !widgets.includes(node));
  const root = doc.createElement("div");
  root.className = "ng-layout-v36";
  root.dataset.layoutRelease = "v39";
  root.innerHTML = `<div class="ng-layout-header"><div class="ng-layout-slot" data-slot="header-left"></div><div class="ng-layout-slot" data-slot="header-right"></div></div><div class="ng-layout-slot ng-layout-below" data-slot="below-header"></div><div class="ng-layout-slot ng-layout-before" data-slot="before-content"></div><div class="ng-layout-body"><aside class="ng-layout-side ng-layout-side-left"><div class="ng-layout-slot" data-slot="sidebar-left-top"></div><div class="ng-layout-slot" data-slot="sidebar-left-bottom"></div></aside><main class="ng-layout-center"></main><aside class="ng-layout-side ng-layout-side-right"><div class="ng-layout-slot" data-slot="sidebar-right-top"></div><div class="ng-layout-slot" data-slot="sidebar-right-bottom"></div></aside></div><div class="ng-layout-slot ng-layout-after" data-slot="after-content"></div><div class="ng-layout-footer"><div class="ng-layout-footer-column"><div class="ng-layout-slot" data-slot="footer-left-top"></div><div class="ng-layout-slot" data-slot="footer-left-bottom"></div></div><div class="ng-layout-footer-column"><div class="ng-layout-slot" data-slot="footer-right-top"></div><div class="ng-layout-slot" data-slot="footer-right-bottom"></div></div></div><div class="ng-layout-slot ng-layout-footer-wide" data-slot="footer-wide"></div><div class="ng-layout-copyright" aria-label="Copyright"></div>`;
  const center = root.querySelector(".ng-layout-center");
  contentNodes.forEach((node) => center.append(node));
  widgets.forEach((widget) => (root.querySelector(`[data-slot="${normalizeLayoutArea(widget.dataset.layoutArea)}"]`) || center).append(widget));
  doc.querySelectorAll(".ng-widget-area").forEach((area) => area.remove());
  const style = doc.createElement("style");
  style.dataset.layoutV39 = "true";
  style.textContent = layoutStyle();
  doc.head?.append(style);
  doc.body.prepend(root);
  scriptNodes.forEach((script) => doc.body.append(script));
}

function applyFrame(frame) {
  try { const run = () => applyLayoutDocument(frame.contentDocument); frame.addEventListener("load", run, { once: true }); run(); } catch {}
}

function applyAllPreviews() {
  document.querySelectorAll(".tn-frame-shell iframe").forEach(applyFrame);
  const host = location.hostname.toLowerCase();
  if (host.endsWith(".ngeblogging.com") && !["www.ngeblogging.com", "studio.ngeblogging.com", "api.ngeblogging.com"].includes(host)) applyLayoutDocument(document);
}

function scan() {
  document.documentElement.dataset.studioLayoutBuilderV36 = RELEASE;
  document.documentElement.dataset.studioLayoutBuilderV39 = RELEASE;
  addOpenButtons();
  applyAllPreviews();
}

function schedule() {
  cancelAnimationFrame(scanFrame);
  scanFrame = requestAnimationFrame(scan);
}

window.addEventListener(OPEN_EVENT, openBuilder);
window.addEventListener(SAVED_EVENT, applyAllPreviews);
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && activeLayer) closeBuilder(); });
new MutationObserver((mutations) => { if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule(); }).observe(document.body, { childList: true, subtree: true });
scan();
