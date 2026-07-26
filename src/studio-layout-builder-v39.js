import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";
import { loadSiteThemeState, saveSiteThemeState } from "./lib/theme-data.js";
import { createDefaultThemeState, loadThemeState, normalizeThemeState, saveThemeState } from "./theme-system.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, normalizeWidgetState } from "./widget-system.js";

const RELEASE = "studio-layout-builder-v39-20260726";
const COPYRIGHT_START = "/* NG-LAYOUT-COPYRIGHT-V39:start */";
const COPYRIGHT_END = "/* NG-LAYOUT-COPYRIGHT-V39:end */";
const OPEN_EVENT = "ngeblogging:open-layout-builder-v39";
const SAVED_EVENT = "ngeblogging:layout-saved-v39";
let activeLayer = null;
let scanFrame = 0;

const AREA_LABEL = new Map(LAYOUT_AREAS.map((area) => [area.id, area.label]));
const AREA_IDS = new Set(LAYOUT_AREAS.map((area) => area.id));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character]));
}

function escapeCssString(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ").slice(0, 180);
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
  return normalizeWidgetState(state.widgets).map((widget, order) => ({ ...widget, area:normalizeArea(widget.area), order }));
}

function widgetsInSlot(widgets, area, slotIndex = 0, slotCount = 1) {
  return widgets
    .filter((widget) => widget.enabled && widget.area === area)
    .filter((_, index) => index % slotCount === slotIndex);
}

function chipsFor(widgets, area, slotIndex = 0, slotCount = 1) {
  const items = widgetsInSlot(widgets, area, slotIndex, slotCount);
  return items.length
    ? items.map((widget) => `<i title="${escapeHtml(widget.title)}">${escapeHtml(widget.title)}</i>`).join("")
    : `<small>Kosong</small>`;
}

function zone(area, widgets, { label = "", slotIndex = 0, slotCount = 1, className = "" } = {}) {
  return `<button type="button" class="lb39-zone ${className}" data-area="${escapeHtml(area)}" data-slot-index="${slotIndex}"><b>${escapeHtml(label || AREA_LABEL.get(area) || area)}</b><span>${chipsFor(widgets, area, slotIndex, slotCount)}</span></button>`;
}

function canvasMarkup(widgets, owner) {
  return `<div class="lb39-canvas">
    <div class="lb39-pair lb39-header-pair">
      ${zone("header-left", widgets, { label:"Header kiri · kotak 1", slotIndex:0, slotCount:2 })}
      ${zone("header-right", widgets, { label:"Header kanan · kotak 1", slotIndex:0, slotCount:2 })}
    </div>
    ${zone("below-header", widgets, { label:"Kotak panjang di bawah header", className:"lb39-wide" })}
    <div class="lb39-pair lb39-header-pair">
      ${zone("header-left", widgets, { label:"Header kiri · kotak 2", slotIndex:1, slotCount:2 })}
      ${zone("header-right", widgets, { label:"Header kanan · kotak 2", slotIndex:1, slotCount:2 })}
    </div>
    ${zone("before-content", widgets, { label:"Kotak di atas postingan", className:"lb39-wide" })}
    <div class="lb39-content-row">
      <div class="lb39-stack lb39-left-stack">
        ${zone("sidebar-left", widgets, { label:"Sidebar kiri · kotak 1", slotIndex:0, slotCount:2 })}
        ${zone("sidebar-left", widgets, { label:"Sidebar kiri · kotak 2", slotIndex:1, slotCount:2 })}
      </div>
      <div class="lb39-post-preview"><div><small>AREA UTAMA</small><b>Kotak postingan</b><p>Posts dan Pages tetap berada di tengah.</p></div></div>
      <div class="lb39-stack lb39-right-stack">
        ${zone("sidebar-right", widgets, { label:"Sidebar kanan · kotak 1", slotIndex:0, slotCount:2 })}
        ${zone("sidebar-right", widgets, { label:"Sidebar kanan · kotak 2", slotIndex:1, slotCount:2 })}
      </div>
    </div>
    ${zone("after-content", widgets, { label:"Kotak panjang di bawah postingan", className:"lb39-wide" })}
    <div class="lb39-footer-grid">
      <div class="lb39-stack">
        ${zone("footer-left", widgets, { label:"Footer kiri · kotak 1", slotIndex:0, slotCount:2 })}
        ${zone("footer-left", widgets, { label:"Footer kiri · kotak 2", slotIndex:1, slotCount:2 })}
      </div>
      <div class="lb39-stack">
        ${zone("footer-right", widgets, { label:"Footer kanan · kotak 1", slotIndex:0, slotCount:2 })}
        ${zone("footer-right", widgets, { label:"Footer kanan · kotak 2", slotIndex:1, slotCount:2 })}
      </div>
    </div>
    ${zone("footer-wide", widgets, { label:"Kotak footer panjang", className:"lb39-wide" })}
    <div class="lb39-copyright"><label for="lb39-owner">Copyright atas nama</label><input id="lb39-owner" maxlength="180" value="${escapeHtml(owner)}" placeholder="Nama pemilik situs"></div>
  </div>`;
}

function codeSettings(entry) {
  const settings = entry?.settings || {};
  return `<div class="lb39-code-settings">
    <label>HTML<textarea class="lb39-html-code" spellcheck="false" placeholder="<div>Konten HTML Anda</div>">${escapeHtml(settings.html || "")}</textarea></label>
    <label>JavaScript<textarea class="lb39-js-code" spellcheck="false" placeholder="document.querySelector('...')">${escapeHtml(settings.javascript || "")}</textarea></label>
    <p>Kode dijalankan di iframe sandbox terisolasi tanpa akses ke halaman Studio, akun, atau rahasia server.</p>
  </div>`;
}

function widgetRows(widgets) {
  const current = new Map(widgets.map((widget) => [widget.id, widget]));
  return BUILT_IN_WIDGETS.map((widget) => {
    const entry = current.get(widget.id);
    const enabled = Boolean(entry?.enabled);
    const area = normalizeArea(entry?.area);
    const searchText = `${widget.name} ${widget.category} ${widget.description}`.toLowerCase();
    return `<article class="lb39-widget${enabled ? " enabled" : ""}" data-widget="${escapeHtml(widget.id)}" data-search="${escapeHtml(searchText)}">
      <button type="button" class="lb39-widget-toggle" aria-pressed="${enabled}">${enabled ? "✓" : escapeHtml(widget.icon)}</button>
      <div class="lb39-widget-main"><b>${escapeHtml(widget.name)}</b><small>${escapeHtml(widget.category)} · ${escapeHtml(widget.description)}</small>
      <select aria-label="Area ${escapeHtml(widget.name)}" ${enabled ? "" : "disabled"}>${LAYOUT_AREAS.map((areaItem) => `<option value="${areaItem.id}"${areaItem.id === area ? " selected" : ""}>${escapeHtml(areaItem.label)}</option>`).join("")}</select>
      ${widget.id === "custom-html" ? codeSettings(entry) : ""}</div>
    </article>`;
  }).join("");
}

function setStatus(layer, message, error = false) {
  const status = layer.querySelector(".lb39-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", error);
}

function closeBuilder() {
  activeLayer?.remove();
  activeLayer = null;
  document.documentElement.style.removeProperty("overflow");
}

function settingsForRow(row, original) {
  if (row.dataset.widget !== "custom-html") return original?.settings || {};
  return {
    ...(original?.settings || {}),
    html: row.querySelector(".lb39-html-code")?.value || "",
    javascript: row.querySelector(".lb39-js-code")?.value || "",
  };
}

function selectedWidgets(layer, baseWidgets) {
  const base = new Map(baseWidgets.map((widget) => [widget.id, widget]));
  return [...layer.querySelectorAll(".lb39-widget.enabled")].map((row, order) => {
    const id = row.dataset.widget;
    const original = base.get(id);
    return {
      id,
      enabled:true,
      area:row.querySelector("select")?.value || "sidebar-right",
      order,
      title:original?.title || BUILT_IN_WIDGETS.find((widget) => widget.id === id)?.name || id,
      settings:settingsForRow(row, original),
    };
  });
}

function rerenderCanvas(layer, baseWidgets) {
  const widgets = selectedWidgets(layer, baseWidgets);
  const owner = layer.querySelector("#lb39-owner")?.value || workspaceName();
  const host = layer.querySelector(".lb39-canvas-host");
  if (host) host.innerHTML = canvasMarkup(widgets, owner);
  bindCanvas(layer);
}

function bindCanvas(layer) {
  layer.querySelectorAll(".lb39-zone").forEach((zoneButton) => {
    zoneButton.addEventListener("click", () => {
      layer.querySelectorAll(".lb39-zone").forEach((item) => item.classList.remove("active"));
      zoneButton.classList.add("active");
      layer.dataset.activeArea = zoneButton.dataset.area || "sidebar-right";
      const label = AREA_LABEL.get(layer.dataset.activeArea) || layer.dataset.activeArea;
      setStatus(layer, `Kotak ${label} dipilih. Aktifkan widget atau pilih area yang sama pada daftar.`);
      layer.querySelector(".lb39-library")?.scrollIntoView({ behavior:"smooth", block:"nearest" });
    });
  });
}

function bindLibrary(layer, baseWidgets) {
  const list = layer.querySelector(".lb39-widget-list");
  const search = layer.querySelector(".lb39-search");
  list.querySelectorAll(".lb39-widget").forEach((row) => {
    row.querySelector(".lb39-widget-toggle")?.addEventListener("click", () => {
      row.classList.toggle("enabled");
      const enabled = row.classList.contains("enabled");
      const select = row.querySelector("select");
      if (select) {
        select.disabled = !enabled;
        if (enabled && layer.dataset.activeArea) select.value = layer.dataset.activeArea;
      }
      const toggle = row.querySelector(".lb39-widget-toggle");
      toggle.textContent = enabled ? "✓" : BUILT_IN_WIDGETS.find((widget) => widget.id === row.dataset.widget)?.icon || "+";
      toggle.setAttribute("aria-pressed", String(enabled));
      rerenderCanvas(layer, baseWidgets);
    });
    row.querySelector("select")?.addEventListener("change", () => rerenderCanvas(layer, baseWidgets));
    row.querySelectorAll("textarea").forEach((field) => field.addEventListener("input", () => rerenderCanvas(layer, baseWidgets)));
  });
  search?.addEventListener("input", () => {
    const needle = search.value.trim().toLowerCase();
    list.querySelectorAll(".lb39-widget").forEach((row) => { row.hidden = Boolean(needle && !String(row.dataset.search || "").includes(needle)); });
  });
}

function historyEntry(state, widgets) {
  return {
    id:crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    createdAt:new Date().toISOString(),
    note:"Tata letak visual v39 diperbarui",
    activeThemeId:state.activeThemeId,
    publishedConfig:state.publishedConfig,
    code:state.code,
    widgets,
  };
}

async function saveBuilder(layer, context, baseWidgets) {
  const button = layer.querySelector(".lb39-save");
  button.disabled = true;
  setStatus(layer, "Menyimpan tata letak situs aktif…");
  try {
    const widgets = selectedWidgets(layer, baseWidgets);
    const owner = layer.querySelector("#lb39-owner")?.value.trim() || workspaceName();
    const cleanDraftCss = stripCopyrightCss(context.state.draftConfig?.customCss);
    const cleanPublishedCss = stripCopyrightCss(context.state.publishedConfig?.customCss);
    const marker = copyrightCss(owner);
    const next = normalizeThemeState({
      ...context.state,
      widgets,
      draftConfig:{ ...context.state.draftConfig, customCss:`${cleanDraftCss}\n${marker}`.trim() },
      publishedConfig:{ ...context.state.publishedConfig, customCss:`${cleanPublishedCss}\n${marker}`.trim() },
      updatedAt:new Date().toISOString(),
    });
    next.history = [historyEntry(next, widgets), ...(context.state.history || [])].slice(0, 50);
    saveThemeState(next);
    if (context.siteId && context.user?.id) await saveSiteThemeState(context.siteId, context.user.id, next);
    window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail:{ siteId:context.siteId, widgets, owner } }));
    setStatus(layer, "Tata letak, 26 widget, kode sandbox, dan copyright berhasil disimpan.");
    window.setTimeout(() => { closeBuilder(); applyAllPreviews(); }, 600);
  } catch (error) {
    console.error("Layout v39 save failed", error);
    setStatus(layer, error.message || "Tata letak belum dapat disimpan.", true);
    button.disabled = false;
  }
}

async function openBuilder() {
  closeBuilder();
  document.documentElement.style.overflow = "hidden";
  const layer = document.createElement("div");
  layer.className = "lb39-layer";
  layer.innerHTML = `<section class="lb39-dialog" role="dialog" aria-modal="true" aria-labelledby="lb39-title">
    <header class="lb39-head"><div><small>TATA LETAK PER SITUS</small><h2 id="lb39-title">Susun semua bagian situs</h2><p>Workspace: ${escapeHtml(workspaceName())}. Setiap situs menyimpan tata letak, widget, dan kode secara terpisah.</p></div><button type="button" class="lb39-close" aria-label="Tutup">×</button></header>
    <div class="lb39-body"><section class="lb39-canvas-wrap"><div class="lb39-section-title"><div><h3>Peta tata letak lengkap</h3><p>Kotak kiri/kanan, area panjang, dua sidebar per sisi, footer bertingkat, dan copyright.</p></div><span>Responsif</span></div><div class="lb39-canvas-host"><div class="lb39-post-preview"><div><b>Memuat…</b></div></div></div></section>
    <section class="lb39-library"><div class="lb39-section-title"><div><h3>26 widget</h3><p>25 widget bawaan + 1 widget HTML/JavaScript dalam sandbox aman.</p></div></div><div class="lb39-library-toolbar"><input class="lb39-search" placeholder="Cari widget…" aria-label="Cari widget"></div><div class="lb39-widget-list"></div></section></div>
    <footer class="lb39-foot"><span class="lb39-status">Memuat tata letak situs aktif…</span><div class="lb39-actions"><button type="button" class="lb39-cancel">Batal</button><button type="button" class="lb39-save primary">Simpan & terbitkan</button></div></footer>
  </section>`;
  document.body.append(layer);
  activeLayer = layer;
  layer.querySelector(".lb39-close")?.addEventListener("click", closeBuilder);
  layer.querySelector(".lb39-cancel")?.addEventListener("click", closeBuilder);
  layer.addEventListener("click", (event) => { if (event.target === layer) closeBuilder(); });
  try {
    const context = await loadContext();
    if (activeLayer !== layer) return;
    const widgets = layoutWidgets(context.state);
    const owner = readCopyrightOwner(context.state.publishedConfig?.customCss);
    layer.querySelector(".lb39-canvas-host").innerHTML = canvasMarkup(widgets, owner);
    layer.querySelector(".lb39-widget-list").innerHTML = widgetRows(widgets);
    bindCanvas(layer);
    bindLibrary(layer, widgets);
    layer.querySelector("#lb39-owner")?.addEventListener("input", () => rerenderCanvas(layer, widgets));
    layer.querySelector(".lb39-save")?.addEventListener("click", () => saveBuilder(layer, context, widgets));
    setStatus(layer, `${widgets.filter((widget) => widget.enabled).length} widget aktif · tersimpan khusus untuk ${workspaceName()}.`);
  } catch (error) {
    setStatus(layer, error.message || "Tata letak belum dapat dimuat.", true);
    layer.querySelector(".lb39-save").disabled = true;
  }
}

function addOpenButtons() {
  document.querySelectorAll("[data-layout-builder-v36]").forEach((button) => button.remove());
  const targets = document.querySelectorAll(".tn-hero-actions, .tn-command nav");
  targets.forEach((target) => {
    if (target.querySelector("[data-layout-builder-v39]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lb39-open";
    button.dataset.layoutBuilderV39 = "true";
    button.innerHTML = `<span aria-hidden="true">▦</span><span>Tata Letak</span>`;
    button.addEventListener("click", openBuilder);
    const widgetButton = [...target.querySelectorAll("button")].find((item) => /widget/i.test(item.textContent));
    if (widgetButton) widgetButton.insertAdjacentElement("beforebegin", button);
    else target.append(button);
  });
}

function layoutStyle() {
  return `
  .ng-layout-v39{width:100%;min-width:0;display:grid;grid-template-columns:minmax(0,1fr);overflow-x:hidden}
  .ng-layout-header{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:16px clamp(16px,4vw,64px)}
  .ng-layout-header>.ng-layout-slot{display:grid;gap:14px;align-content:start}
  .ng-layout-below,.ng-layout-before,.ng-layout-after,.ng-layout-footer-wide{min-width:0;padding-left:clamp(14px,3vw,48px);padding-right:clamp(14px,3vw,48px)}
  .ng-layout-body{min-width:0;display:grid;grid-template-columns:minmax(180px,.58fr) minmax(0,1.7fr) minmax(180px,.58fr);align-items:start;gap:18px;padding:0 clamp(14px,3vw,48px)}
  .ng-layout-center{min-width:0;overflow:hidden}.ng-layout-side{min-width:0;display:grid;gap:14px;align-content:start}
  .ng-layout-footer{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:18px clamp(16px,4vw,64px)}
  .ng-layout-footer>.ng-layout-slot{display:grid;gap:14px;align-content:start}
  .ng-layout-copyright{min-height:48px;display:flex;align-items:center;justify-content:center;padding:12px 18px;border-top:1px solid color-mix(in srgb,currentColor,transparent 84%);font-size:.82rem;opacity:.76;text-align:center}
  .ng-layout-slot:empty{display:none}.ng-layout-slot{min-width:0}.ng-layout-slot>.ng-widget{margin-bottom:14px}.ng-layout-slot>.ng-widget:last-child{margin-bottom:0}
  .ng-widget-custom-html{padding:0!important;overflow:hidden}.ng-widget-custom-frame{display:block;width:100%;min-height:180px;border:0;background:transparent}
  .ng-layout-center>.ng-widget-area{padding-left:0!important;padding-right:0!important}
  @media(max-width:980px){.ng-layout-body{grid-template-columns:minmax(0,1fr)}.ng-layout-side{grid-row:auto}.ng-layout-header,.ng-layout-footer{grid-template-columns:minmax(0,1fr)}}
  @media(max-width:560px){.ng-layout-header,.ng-layout-footer{padding:12px}.ng-layout-below,.ng-layout-before,.ng-layout-after,.ng-layout-footer-wide{padding-left:10px;padding-right:10px}.ng-layout-body{padding:0 10px;gap:10px}.ng-layout-copyright{font-size:.72rem}}
  `;
}

function applyLayoutDocument(doc) {
  if (!doc?.body || doc.body.querySelector(":scope > .ng-layout-v39")) return;
  const widgets = [...doc.querySelectorAll(".ng-widget[data-layout-area]")];
  const styles = [...doc.querySelectorAll("style")].map((style) => style.textContent || "").join("\n");
  if (!widgets.length && !styles.includes("NG-LAYOUT-COPYRIGHT-V39") && !styles.includes("NG-LAYOUT-COPYRIGHT-V36")) return;
  const scriptNodes = [...doc.body.children].filter((node) => node.tagName === "SCRIPT");
  const contentNodes = [...doc.body.childNodes].filter((node) => !scriptNodes.includes(node) && !(node.nodeType === 1 && node.matches?.(".ng-widget-area")));
  const root = doc.createElement("div");
  root.className = "ng-layout-v39";
  root.innerHTML = `<div class="ng-layout-header"><div class="ng-layout-slot" data-slot="header-left"></div><div class="ng-layout-slot" data-slot="header-right"></div></div><div class="ng-layout-slot ng-layout-below" data-slot="below-header"></div><div class="ng-layout-slot ng-layout-before" data-slot="before-content"></div><div class="ng-layout-body"><aside class="ng-layout-slot ng-layout-side" data-slot="sidebar-left"></aside><main class="ng-layout-center"></main><aside class="ng-layout-slot ng-layout-side" data-slot="sidebar-right"></aside></div><div class="ng-layout-slot ng-layout-after" data-slot="after-content"></div><div class="ng-layout-footer"><div class="ng-layout-slot" data-slot="footer-left"></div><div class="ng-layout-slot" data-slot="footer-right"></div></div><div class="ng-layout-slot ng-layout-footer-wide" data-slot="footer-wide"></div><div class="ng-layout-copyright" aria-label="Copyright"></div>`;
  const center = root.querySelector(".ng-layout-center");
  contentNodes.forEach((node) => center.append(node));
  widgets.forEach((widget) => {
    const area = normalizeArea(widget.dataset.layoutArea);
    const slot = root.querySelector(`[data-slot="${area}"]`) || center;
    slot.append(widget);
  });
  doc.querySelectorAll(".ng-widget-area").forEach((area) => area.remove());
  const style = doc.createElement("style");
  style.dataset.layoutV39 = "true";
  style.textContent = layoutStyle();
  doc.head?.append(style);
  doc.body.prepend(root);
  scriptNodes.forEach((script) => doc.body.append(script));
}

function applyFrame(frame) {
  try {
    const run = () => applyLayoutDocument(frame.contentDocument);
    frame.addEventListener("load", run, { once:true });
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
new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.body, { childList:true, subtree:true });
scan();
