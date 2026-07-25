import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";
import { loadSiteThemeState, saveSiteThemeState } from "./lib/theme-data.js";
import { createDefaultThemeState, loadThemeState, normalizeThemeState, saveThemeState } from "./theme-system.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, normalizeWidgetState } from "./widget-system.js";

const RELEASE = "studio-layout-builder-v36-20260725";
const COPYRIGHT_START = "/* NG-LAYOUT-COPYRIGHT-V36:start */";
const COPYRIGHT_END = "/* NG-LAYOUT-COPYRIGHT-V36:end */";
const OPEN_EVENT = "ngeblogging:open-layout-builder-v36";
const SAVED_EVENT = "ngeblogging:layout-saved-v36";
let activeLayer = null;
let scanFrame = 0;

const AREA_LABEL = new Map(LAYOUT_AREAS.map((area) => [area.id, area.label]));
const AREA_IDS = new Set(LAYOUT_AREAS.map((area) => area.id));

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function escapeCssString(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, " ")
    .slice(0, 180);
}

function activeSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
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
  const source = String(css || "");
  const match = source.match(/--ng-layout-owner:\s*"((?:\\.|[^"])*)"/);
  if (!match) return workspaceName();
  return match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function copyrightCss(owner) {
  const safe = escapeCssString(owner || workspaceName());
  const year = new Date().getFullYear();
  return `${COPYRIGHT_START}\n:root{--ng-layout-owner:"${safe}"}\n.ng-layout-copyright::after{content:"© ${year} " var(--ng-layout-owner) ". Seluruh hak dilindungi."}\n${COPYRIGHT_END}`;
}

function normalizeArea(area) {
  if (AREA_IDS.has(area)) return area;
  if (area === "sidebar") return "sidebar-right";
  if (area === "footer") return "footer-left";
  return "after-content";
}

function layoutWidgets(state) {
  return normalizeWidgetState(state.widgets).map((widget, order) => ({
    ...widget,
    area: normalizeArea(widget.area),
    order,
  }));
}

function chipsFor(widgets, area) {
  const items = widgets.filter((widget) => widget.enabled && widget.area === area);
  return items.length
    ? items.map((widget) => `<i title="${escapeHtml(widget.title)}">${escapeHtml(widget.title)}</i>`).join("")
    : `<small>Kosong</small>`;
}

function zone(area, widgets) {
  return `<button type="button" class="lb36-zone" data-area="${area}"><b>${escapeHtml(AREA_LABEL.get(area) || area)}</b><span>${chipsFor(widgets, area)}</span></button>`;
}

function canvasMarkup(widgets, owner) {
  return `<div class="lb36-canvas">
    ${zone("header-left", widgets)}
    ${zone("header-right", widgets)}
    ${zone("below-header", widgets)}
    ${zone("before-content", widgets)}
    <div class="lb36-content-row">
      ${zone("sidebar-left", widgets)}
      <div class="lb36-post-preview"><div><b>Kotak postingan</b><small>Posts dan Pages situs aktif tetap berada di area utama.</small></div></div>
      ${zone("sidebar-right", widgets)}
    </div>
    ${zone("after-content", widgets)}
    <div class="lb36-footer-row">${zone("footer-left", widgets)}${zone("footer-right", widgets)}</div>
    <div class="lb36-copyright"><label for="lb36-owner">Copyright atas nama</label><input id="lb36-owner" maxlength="180" value="${escapeHtml(owner)}" placeholder="Nama pemilik situs"></div>
  </div>`;
}

function widgetRows(widgets) {
  const current = new Map(widgets.map((widget) => [widget.id, widget]));
  return BUILT_IN_WIDGETS.map((widget) => {
    const entry = current.get(widget.id);
    const enabled = Boolean(entry?.enabled);
    const area = normalizeArea(entry?.area);
    const searchText = `${widget.name} ${widget.category} ${widget.description}`.toLowerCase();
    return `<article class="lb36-widget${enabled ? " enabled" : ""}" data-widget="${widget.id}" data-search="${escapeHtml(searchText)}">
      <button type="button" class="lb36-widget-toggle" aria-pressed="${enabled}">${enabled ? "✓" : widget.icon}</button>
      <div class="lb36-widget-main"><b>${escapeHtml(widget.name)}</b><small>${escapeHtml(widget.category)} · ${escapeHtml(widget.description)}</small>
      <select aria-label="Area ${escapeHtml(widget.name)}" ${enabled ? "" : "disabled"}>${LAYOUT_AREAS.map((areaItem) => `<option value="${areaItem.id}"${areaItem.id === area ? " selected" : ""}>${escapeHtml(areaItem.label)}</option>`).join("")}</select></div>
    </article>`;
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

function selectedWidgets(layer, baseWidgets) {
  const base = new Map(baseWidgets.map((widget) => [widget.id, widget]));
  return [...layer.querySelectorAll(".lb36-widget.enabled")].map((row, order) => {
    const id = row.dataset.widget;
    const original = base.get(id);
    return {
      id,
      enabled: true,
      area: row.querySelector("select")?.value || "sidebar-right",
      order,
      title: original?.title || BUILT_IN_WIDGETS.find((widget) => widget.id === id)?.name || id,
      settings: original?.settings || {},
    };
  });
}

function rerenderCanvas(layer, baseWidgets) {
  const widgets = selectedWidgets(layer, baseWidgets);
  const owner = layer.querySelector("#lb36-owner")?.value || workspaceName();
  const host = layer.querySelector(".lb36-canvas-host");
  if (host) host.innerHTML = canvasMarkup(widgets, owner);
  bindCanvas(layer);
}

function bindCanvas(layer) {
  layer.querySelectorAll(".lb36-zone").forEach((zoneButton) => {
    zoneButton.addEventListener("click", () => {
      layer.querySelectorAll(".lb36-zone").forEach((item) => item.classList.remove("active"));
      zoneButton.classList.add("active");
      const activeArea = zoneButton.dataset.area;
      const firstEnabled = layer.querySelector(".lb36-widget.enabled select");
      if (firstEnabled && activeArea) {
        firstEnabled.value = activeArea;
        firstEnabled.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });
}

function bindLibrary(layer, baseWidgets) {
  const list = layer.querySelector(".lb36-widget-list");
  const search = layer.querySelector(".lb36-search");

  list.querySelectorAll(".lb36-widget").forEach((row) => {
    row.querySelector(".lb36-widget-toggle")?.addEventListener("click", () => {
      row.classList.toggle("enabled");
      const enabled = row.classList.contains("enabled");
      row.querySelector("select").disabled = !enabled;
      row.querySelector(".lb36-widget-toggle").textContent = enabled ? "✓" : BUILT_IN_WIDGETS.find((widget) => widget.id === row.dataset.widget)?.icon || "+";
      rerenderCanvas(layer, baseWidgets);
    });
    row.querySelector("select")?.addEventListener("change", () => rerenderCanvas(layer, baseWidgets));
  });

  search?.addEventListener("input", () => {
    const needle = search.value.trim().toLowerCase();
    list.querySelectorAll(".lb36-widget").forEach((row) => {
      row.hidden = Boolean(needle && !String(row.dataset.search || "").includes(needle));
    });
  });
}

function historyEntry(state, widgets) {
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    note: "Tata letak visual diperbarui",
    activeThemeId: state.activeThemeId,
    publishedConfig: state.publishedConfig,
    code: state.code,
    widgets,
  };
}

async function saveBuilder(layer, context, baseWidgets) {
  const button = layer.querySelector(".lb36-save");
  button.disabled = true;
  setStatus(layer, "Menyimpan tata letak situs aktif…");
  try {
    const widgets = selectedWidgets(layer, baseWidgets);
    const owner = layer.querySelector("#lb36-owner")?.value.trim() || workspaceName();
    const cleanDraftCss = stripCopyrightCss(context.state.draftConfig?.customCss);
    const cleanPublishedCss = stripCopyrightCss(context.state.publishedConfig?.customCss);
    const marker = copyrightCss(owner);
    const next = normalizeThemeState({
      ...context.state,
      widgets,
      draftConfig: { ...context.state.draftConfig, customCss: `${cleanDraftCss}\n${marker}`.trim() },
      publishedConfig: { ...context.state.publishedConfig, customCss: `${cleanPublishedCss}\n${marker}`.trim() },
      updatedAt: new Date().toISOString(),
    });
    next.history = [historyEntry(next, widgets), ...(context.state.history || [])].slice(0, 50);
    saveThemeState(next);
    if (context.siteId && context.user?.id) await saveSiteThemeState(context.siteId, context.user.id, next);
    window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: { siteId: context.siteId, widgets, owner } }));
    setStatus(layer, "Tata letak, widget, dan copyright berhasil disimpan untuk situs aktif.");
    window.setTimeout(() => {
      closeBuilder();
      applyAllPreviews();
    }, 550);
  } catch (error) {
    console.error("Layout save failed", error);
    setStatus(layer, error.message || "Tata letak belum dapat disimpan.", true);
    button.disabled = false;
  }
}

async function openBuilder() {
  closeBuilder();
  document.documentElement.style.overflow = "hidden";
  const layer = document.createElement("div");
  layer.className = "lb36-layer";
  layer.innerHTML = `<section class="lb36-dialog" role="dialog" aria-modal="true" aria-labelledby="lb36-title">
    <header class="lb36-head"><div><small>TATA LETAK PER SITUS</small><h2 id="lb36-title">Susun semua bagian situs</h2><p>Workspace: ${escapeHtml(workspaceName())}. Perubahan hanya berlaku pada situs aktif.</p></div><button type="button" class="lb36-close" aria-label="Tutup">×</button></header>
    <div class="lb36-body"><section class="lb36-canvas-wrap"><div class="lb36-section-title"><div><h3>Pratinjau kotak tata letak</h3><p>Header, konten, sidebar, footer, dan copyright memiliki posisi sendiri.</p></div></div><div class="lb36-canvas-host"><div class="lb36-post-preview"><div><b>Memuat…</b></div></div></div></section>
    <section class="lb36-library"><div class="lb36-section-title"><div><h3>25 widget bawaan</h3><p>Aktifkan widget lalu pilih kotak tujuannya.</p></div></div><div class="lb36-library-toolbar"><input class="lb36-search" placeholder="Cari widget…" aria-label="Cari widget"></div><div class="lb36-widget-list"></div></section></div>
    <footer class="lb36-foot"><span class="lb36-status">Memuat tata letak situs aktif…</span><div class="lb36-actions"><button type="button" class="lb36-cancel">Batal</button><button type="button" class="lb36-save primary">Simpan & terbitkan</button></div></footer>
  </section>`;
  document.body.append(layer);
  activeLayer = layer;
  layer.querySelector(".lb36-close").addEventListener("click", closeBuilder);
  layer.querySelector(".lb36-cancel").addEventListener("click", closeBuilder);
  layer.addEventListener("click", (event) => { if (event.target === layer) closeBuilder(); });

  try {
    const context = await loadContext();
    if (activeLayer !== layer) return;
    const widgets = layoutWidgets(context.state);
    const owner = readCopyrightOwner(context.state.publishedConfig?.customCss);
    layer.querySelector(".lb36-canvas-host").innerHTML = canvasMarkup(widgets, owner);
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
  const targets = document.querySelectorAll(".tn-hero-actions, .tn-command nav");
  targets.forEach((target) => {
    if (target.querySelector("[data-layout-builder-v36]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lb36-open";
    button.dataset.layoutBuilderV36 = "true";
    button.innerHTML = `<span aria-hidden="true">▦</span><span>Tata Letak</span>`;
    button.addEventListener("click", openBuilder);
    const widgetButton = [...target.querySelectorAll("button")].find((item) => /widget/i.test(item.textContent));
    if (widgetButton) widgetButton.insertAdjacentElement("beforebegin", button);
    else target.append(button);
  });
}

function layoutStyle() {
  return `
  .ng-layout-v36{width:100%;min-width:0;display:grid;grid-template-columns:minmax(0,1fr);overflow-x:hidden}
  .ng-layout-header{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:16px clamp(16px,4vw,64px)}
  .ng-layout-below,.ng-layout-before,.ng-layout-after{min-width:0}
  .ng-layout-body{min-width:0;display:grid;grid-template-columns:minmax(170px,.55fr) minmax(0,1.7fr) minmax(170px,.55fr);align-items:start;gap:18px;padding:0 clamp(14px,3vw,48px)}
  .ng-layout-center{min-width:0;overflow:hidden}
  .ng-layout-side{min-width:0;display:grid;gap:14px}
  .ng-layout-footer{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:18px clamp(16px,4vw,64px)}
  .ng-layout-copyright{min-height:48px;display:flex;align-items:center;justify-content:center;padding:12px 18px;border-top:1px solid color-mix(in srgb,currentColor,transparent 84%);font-size:.82rem;opacity:.76;text-align:center}
  .ng-layout-slot:empty{display:none}.ng-layout-slot{min-width:0}.ng-layout-slot>.ng-widget{margin-bottom:14px}
  .ng-layout-center>.ng-widget-area{padding-left:0!important;padding-right:0!important}
  @media(max-width:900px){.ng-layout-body{grid-template-columns:minmax(0,1fr)}.ng-layout-side{grid-row:auto}.ng-layout-header,.ng-layout-footer{grid-template-columns:minmax(0,1fr)}}
  @media(max-width:560px){.ng-layout-header,.ng-layout-footer{padding:12px}.ng-layout-body{padding:0 10px;gap:10px}.ng-layout-copyright{font-size:.72rem}}
  `;
}

function applyLayoutDocument(doc) {
  if (!doc?.body || doc.body.querySelector(":scope > .ng-layout-v36")) return;
  const widgets = [...doc.querySelectorAll(".ng-widget[data-layout-area]")];
  const styles = [...doc.querySelectorAll("style")].map((style) => style.textContent || "").join("\n");
  if (!widgets.length && !styles.includes("NG-LAYOUT-COPYRIGHT-V36")) return;

  const scriptNodes = [...doc.body.children].filter((node) => node.tagName === "SCRIPT");
  const contentNodes = [...doc.body.childNodes].filter((node) => !scriptNodes.includes(node) && !(node.nodeType === 1 && node.matches?.(".ng-widget-area")));
  const root = doc.createElement("div");
  root.className = "ng-layout-v36";
  root.innerHTML = `<div class="ng-layout-header"><div class="ng-layout-slot" data-slot="header-left"></div><div class="ng-layout-slot" data-slot="header-right"></div></div><div class="ng-layout-slot ng-layout-below" data-slot="below-header"></div><div class="ng-layout-slot ng-layout-before" data-slot="before-content"></div><div class="ng-layout-body"><aside class="ng-layout-slot ng-layout-side" data-slot="sidebar-left"></aside><main class="ng-layout-center"></main><aside class="ng-layout-slot ng-layout-side" data-slot="sidebar-right"></aside></div><div class="ng-layout-slot ng-layout-after" data-slot="after-content"></div><div class="ng-layout-footer"><div class="ng-layout-slot" data-slot="footer-left"></div><div class="ng-layout-slot" data-slot="footer-right"></div></div><div class="ng-layout-copyright" aria-label="Copyright"></div>`;
  const center = root.querySelector(".ng-layout-center");
  contentNodes.forEach((node) => center.append(node));
  widgets.forEach((widget) => {
    const area = normalizeArea(widget.dataset.layoutArea);
    const slot = root.querySelector(`[data-slot="${area}"]`) || center;
    slot.append(widget);
  });
  doc.querySelectorAll(".ng-widget-area").forEach((area) => area.remove());
  const style = doc.createElement("style");
  style.dataset.layoutV36 = "true";
  style.textContent = layoutStyle();
  doc.head?.append(style);
  doc.body.prepend(root);
  scriptNodes.forEach((script) => doc.body.append(script));
}

function applyFrame(frame) {
  try {
    const run = () => applyLayoutDocument(frame.contentDocument);
    frame.addEventListener("load", run, { once: true });
    run();
  } catch {
    // Sandboxed or cross-origin preview remains untouched.
  }
}

function applyAllPreviews() {
  document.querySelectorAll(".tn-frame-shell iframe").forEach(applyFrame);
  const host = location.hostname.toLowerCase();
  if (host.endsWith(".ngeblogging.com") && !["www.ngeblogging.com", "studio.ngeblogging.com", "api.ngeblogging.com"].includes(host)) applyLayoutDocument(document);
}

function scan() {
  document.documentElement.dataset.studioLayoutBuilderV36 = RELEASE;
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
new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.body, { childList: true, subtree: true });
scan();
