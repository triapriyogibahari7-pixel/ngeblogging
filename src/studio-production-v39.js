import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";
import { loadSiteThemeState, saveSiteThemeState } from "./lib/theme-data.js";
import { loadThemeState, normalizeThemeState, saveThemeState } from "./theme-system.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, normalizeWidgetState } from "./widget-system.js";

const RELEASE = "studio-production-v39-20260726";
const SAVED_EVENT = "ngeblogging:layout-saved-v36";
const ROLE_LABEL = { owner: "Pemilik", admin: "Admin", editor: "Editor", author: "Penulis", contributor: "Kontributor", viewer: "Pengamat" };
const AREA_LABEL = new Map(LAYOUT_AREAS.map((area) => [area.id, area.label]));
const customEditorCache = new Map();
let frame = 0;
let lastSite = "";
let healthCache = null;
let healthAt = 0;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function number(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function activeSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
}

async function session() {
  if (!supabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

async function health(force = false) {
  if (!force && healthCache && Date.now() - healthAt < 15_000) return healthCache;
  healthCache = await fetch("/api/health", { cache: "no-store", headers: { accept: "application/json" } })
    .then((response) => response.ok ? response.json() : {})
    .catch(() => ({}));
  healthAt = Date.now();
  return healthCache;
}

async function api(path, body = null) {
  const current = await session();
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(current?.access_token ? { authorization: `Bearer ${current.access_token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Permintaan belum berhasil.");
  return payload;
}

function pageViewByTitle(title) {
  return [...document.querySelectorAll(".sn-main > .sn-view-pad")]
    .find((view) => view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === title) || null;
}

function enabledLayoutWidgets(layer) {
  return [...layer.querySelectorAll(".lb36-widget.enabled")].map((row, order) => ({
    id: row.dataset.widget || "",
    title: row.querySelector(".lb36-widget-main > b")?.textContent?.trim() || row.dataset.widget || "Widget",
    area: row.querySelector("select")?.value || "sidebar-right",
    order,
  }));
}

function zoneMarkup(area, widgets) {
  const items = widgets.filter((widget) => widget.area === area);
  return `<button type="button" class="sp39-zone" data-area="${escapeHtml(area)}"><b>${escapeHtml(AREA_LABEL.get(area) || area)}</b><span>${items.length ? items.map((widget) => `<i>${escapeHtml(widget.title)}</i>`).join("") : "<small>Kosong</small>"}</span></button>`;
}

function layoutPreviewMarkup(widgets, owner) {
  return `<div class="sp39-layout-preview" aria-label="Pratinjau tata letak responsif">
    <div class="sp39-layout-pair sp39-header-pair">${zoneMarkup("header-left", widgets)}${zoneMarkup("header-right", widgets)}</div>
    ${zoneMarkup("below-header", widgets)}
    ${zoneMarkup("before-content", widgets)}
    <div class="sp39-content-grid">
      <div class="sp39-side-stack sp39-side-left">${zoneMarkup("sidebar-left", widgets)}${zoneMarkup("sidebar-left-bottom", widgets)}</div>
      <div class="sp39-post-preview"><div><b>Kotak postingan</b><small>Posts dan Pages berada di area utama.</small></div></div>
      <div class="sp39-side-stack sp39-side-right">${zoneMarkup("sidebar-right", widgets)}${zoneMarkup("sidebar-right-bottom", widgets)}</div>
    </div>
    ${zoneMarkup("after-content", widgets)}
    <div class="sp39-footer-grid"><div class="sp39-side-stack">${zoneMarkup("footer-left", widgets)}${zoneMarkup("footer-left-bottom", widgets)}</div><div class="sp39-side-stack">${zoneMarkup("footer-right", widgets)}${zoneMarkup("footer-right-bottom", widgets)}</div></div>
    ${zoneMarkup("footer-wide", widgets)}
    <div class="lb36-copyright sp39-copyright"><label for="lb36-owner">Copyright atas nama</label><input id="lb36-owner" maxlength="180" value="${escapeHtml(owner)}" placeholder="Nama pemilik situs"></div>
  </div>`;
}

function bindLayoutZones(layer) {
  layer.querySelectorAll(".sp39-zone").forEach((zone) => {
    zone.addEventListener("click", () => {
      const active = layer.querySelector(".lb36-widget[data-sp39-active-widget='true']")
        || layer.querySelector(".lb36-widget.enabled");
      const select = active?.querySelector("select");
      if (!select) return;
      select.value = zone.dataset.area || "sidebar-right";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
}

async function currentThemeState() {
  const siteId = activeSiteId();
  if (siteId && supabaseConfigured && supabase) {
    const cloud = await loadSiteThemeState(siteId).catch(() => null);
    if (cloud) return normalizeThemeState(cloud);
  }
  return normalizeThemeState(loadThemeState());
}

async function enhanceCustomWidgetEditor(layer) {
  const row = layer.querySelector('.lb36-widget[data-widget="custom-html"]');
  if (!row || row.querySelector(".sp39-code-editor")) return;
  const state = await currentThemeState().catch(() => null);
  if (!row.isConnected) return;
  const saved = normalizeWidgetState(state?.widgets).find((widget) => widget.id === "custom-html")?.settings || {};
  const cacheKey = `custom-html:${activeSiteId() || "local"}`;
  if (!customEditorCache.has(cacheKey)) customEditorCache.set(cacheKey, { html: String(saved.html || ""), javascript: String(saved.javascript || "") });
  const values = customEditorCache.get(cacheKey);
  const editor = document.createElement("div");
  editor.className = "sp39-code-editor";
  editor.innerHTML = `<label>HTML<textarea data-code="html" spellcheck="false" placeholder="<section>Isi widget…</section>">${escapeHtml(values.html)}</textarea></label><label>JavaScript<textarea data-code="javascript" spellcheck="false" placeholder="document.querySelector(…)">${escapeHtml(values.javascript)}</textarea></label><small>Dijalankan di iframe sandbox terisolasi, bukan langsung di tema utama.</small>`;
  row.querySelector(".lb36-widget-main")?.append(editor);
  editor.querySelectorAll("textarea").forEach((textarea) => textarea.addEventListener("input", () => {
    customEditorCache.set(cacheKey, {
      ...customEditorCache.get(cacheKey),
      [textarea.dataset.code]: textarea.value.slice(0, textarea.dataset.code === "html" ? 120000 : 80000),
    });
  }));
}

function enhanceLayoutBuilder(layer) {
  if (!layer?.isConnected) return;
  layer.dataset.sp39Layout = RELEASE;
  const sectionTitle = layer.querySelector(".lb36-library .lb36-section-title h3");
  if (sectionTitle) sectionTitle.textContent = `${BUILT_IN_WIDGETS.length} widget bawaan + HTML/JavaScript`;
  const sectionCopy = layer.querySelector(".lb36-library .lb36-section-title p");
  if (sectionCopy) sectionCopy.textContent = "Aktifkan widget, pilih kotak tujuan, lalu simpan untuk situs aktif.";

  layer.querySelectorAll(".lb36-widget").forEach((row) => {
    if (row.dataset.sp39FocusBound === "true") return;
    row.dataset.sp39FocusBound = "true";
    row.addEventListener("pointerdown", () => {
      layer.querySelectorAll(".lb36-widget").forEach((item) => delete item.dataset.sp39ActiveWidget);
      row.dataset.sp39ActiveWidget = "true";
    });
  });

  const host = layer.querySelector(".lb36-canvas-host");
  if (!host) return;
  const widgets = enabledLayoutWidgets(layer);
  const oldOwner = host.querySelector("#lb36-owner")?.value || document.querySelector(".sn-workspace b")?.textContent?.trim() || "Pemilik situs";
  const signature = JSON.stringify(widgets.map(({ id, area, title }) => [id, area, title]));
  if (!host.querySelector(".sp39-layout-preview") || host.dataset.sp39Signature !== signature) {
    host.dataset.sp39Signature = signature;
    host.innerHTML = layoutPreviewMarkup(widgets, oldOwner);
    bindLayoutZones(layer);
  }
  enhanceCustomWidgetEditor(layer);
}

async function persistCustomWidgetSettings(event) {
  const siteId = event.detail?.siteId || activeSiteId();
  const settings = customEditorCache.get(`custom-html:${siteId || "local"}`);
  if (!settings) return;
  const currentSession = await session();
  let state = null;
  if (siteId && currentSession?.user?.id) state = await loadSiteThemeState(siteId).catch(() => null);
  state = normalizeThemeState(state || loadThemeState());
  const widgets = normalizeWidgetState(event.detail?.widgets || state.widgets).map((widget) => widget.id === "custom-html" ? { ...widget, settings: { ...widget.settings, ...settings } } : widget);
  const next = normalizeThemeState({ ...state, widgets, updatedAt: new Date().toISOString() });
  if (next.history?.[0]) next.history[0] = { ...next.history[0], widgets };
  saveThemeState(next);
  if (siteId && currentSession?.user?.id) await saveSiteThemeState(siteId, currentSession.user.id, next).catch((error) => console.error("Custom widget save failed", error));
}

function normalizeArea(area) {
  if (area === "sidebar") return "sidebar-right";
  if (area === "footer") return "footer-left";
  return AREA_LABEL.has(area) ? area : "after-content";
}

function upgradePublicLayout(doc = document) {
  const oldRoot = doc.body?.querySelector(":scope > .ng-layout-v36");
  if (!oldRoot || oldRoot.classList.contains("ng-layout-v39")) return;
  const widgets = [...oldRoot.querySelectorAll(".ng-widget[data-layout-area]")];
  const oldCenter = oldRoot.querySelector(".ng-layout-center");
  const contentNodes = [...(oldCenter?.childNodes || [])].filter((node) => !(node.nodeType === 1 && node.matches?.(".ng-widget[data-layout-area]")));
  const oldCopyright = oldRoot.querySelector(".ng-layout-copyright")?.cloneNode(true);
  widgets.forEach((widget) => widget.remove());
  contentNodes.forEach((node) => node.remove());

  oldRoot.className = "ng-layout-v36 ng-layout-v39";
  oldRoot.innerHTML = `<header class="ng-layout-header"><div class="ng-layout-slot" data-slot="header-left"></div><div class="ng-layout-slot" data-slot="header-right"></div></header><div class="ng-layout-slot ng-layout-below" data-slot="below-header"></div><div class="ng-layout-slot ng-layout-before" data-slot="before-content"></div><div class="ng-layout-body"><aside class="ng-layout-side ng-layout-side-left"><div class="ng-layout-slot" data-slot="sidebar-left"></div><div class="ng-layout-slot" data-slot="sidebar-left-bottom"></div></aside><main class="ng-layout-center"></main><aside class="ng-layout-side ng-layout-side-right"><div class="ng-layout-slot" data-slot="sidebar-right"></div><div class="ng-layout-slot" data-slot="sidebar-right-bottom"></div></aside></div><div class="ng-layout-slot ng-layout-after" data-slot="after-content"></div><footer class="ng-layout-footer"><div class="ng-layout-footer-stack"><div class="ng-layout-slot" data-slot="footer-left"></div><div class="ng-layout-slot" data-slot="footer-left-bottom"></div></div><div class="ng-layout-footer-stack"><div class="ng-layout-slot" data-slot="footer-right"></div><div class="ng-layout-slot" data-slot="footer-right-bottom"></div></div></footer><div class="ng-layout-slot ng-layout-footer-wide" data-slot="footer-wide"></div>`;
  const center = oldRoot.querySelector(".ng-layout-center");
  contentNodes.forEach((node) => center.append(node));
  widgets.forEach((widget) => {
    const area = normalizeArea(widget.dataset.layoutArea);
    (oldRoot.querySelector(`[data-slot="${area}"]`) || center).append(widget);
  });
  oldRoot.append(oldCopyright || Object.assign(doc.createElement("div"), { className: "ng-layout-copyright" }));
}

function upgradePreviewFrames() {
  document.querySelectorAll(".tn-frame-shell iframe").forEach((iframe) => {
    const run = () => { try { upgradePublicLayout(iframe.contentDocument); } catch {} };
    if (iframe.dataset.sp39LayoutBound !== "true") {
      iframe.dataset.sp39LayoutBound = "true";
      iframe.addEventListener("load", run);
    }
    run();
  });
  upgradePublicLayout(document);
}

function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function zeroSeries(days) {
  const now = new Date();
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (days - index - 1));
    return { day: dateKey(day), views: 0, humans: 0, bots: 0 };
  });
}

function normalizeAnalytics(data, days) {
  const source = data && typeof data === "object" ? data : {};
  const totals = source.totals && typeof source.totals === "object" ? source.totals : {};
  const series = Array.isArray(source.series) && source.series.length ? source.series : zeroSeries(days);
  return {
    rangeDays: Number(source.rangeDays || days),
    generatedAt: source.generatedAt || new Date().toISOString(),
    simulated: Boolean(source.simulated),
    totals: {
      views: Number(totals.views || 0), humanViews: Number(totals.humanViews || 0), botViews: Number(totals.botViews || 0),
      unknownViews: Number(totals.unknownViews || 0), uniqueHumans: Number(totals.uniqueHumans || 0), viewsToday: Number(totals.viewsToday || 0),
      previousViews: Number(totals.previousViews || 0), changePercent: totals.changePercent == null ? null : Number(totals.changePercent),
    },
    series: series.map((item) => ({ day: item.day, views: Number(item.views || 0), humans: Number(item.humans || 0), bots: Number(item.bots || 0) })),
    traffic: Array.isArray(source.traffic) ? source.traffic : [], devices: Array.isArray(source.devices) ? source.devices : [],
    referrers: Array.isArray(source.referrers) ? source.referrers : [], countries: Array.isArray(source.countries) ? source.countries : [],
    topContent: Array.isArray(source.topContent) ? source.topContent : [],
  };
}

function simulationData(days = 30) {
  const series = zeroSeries(days).map((item, index) => {
    const humans = Math.max(0, Math.round(90 + Math.sin(index / 2.5) * 34 + index * 3.1));
    const bots = Math.max(0, Math.round(17 + Math.cos(index / 2.1) * 7 + index * .55));
    return { ...item, humans, bots, views: humans + bots };
  });
  const humanViews = series.reduce((sum, item) => sum + item.humans, 0);
  const botViews = series.reduce((sum, item) => sum + item.bots, 0);
  return normalizeAnalytics({
    rangeDays: days, generatedAt: new Date().toISOString(), simulated: true,
    totals: { views: humanViews + botViews, humanViews, botViews, uniqueHumans: Math.round(humanViews * .61), viewsToday: series.at(-1)?.views || 0, previousViews: Math.round((humanViews + botViews) * .83), changePercent: 20.5 },
    series,
    traffic: [{ label: "human", value: humanViews }, { label: "bot", value: botViews }],
    devices: [{ label: "mobile", value: Math.round(humanViews * .68) }, { label: "desktop", value: Math.round(humanViews * .24) }, { label: "tablet", value: Math.round(humanViews * .08) }],
    referrers: [{ label: "Google", value: 2310 }, { label: "Langsung", value: 1260 }, { label: "Facebook", value: 540 }, { label: "Bing", value: 220 }],
    countries: [{ label: "ID", value: 3560 }, { label: "MY", value: 310 }, { label: "SG", value: 190 }],
    topContent: [{ path: "/panduan-memulai", title: "Panduan Memulai", views: 1120, humans: 980, bots: 140, uniqueHumans: 730 }, { path: "/berita-hari-ini", title: "Berita Hari Ini", views: 890, humans: 790, bots: 100, uniqueHumans: 610 }, { path: "/tentang", title: "Tentang", views: 540, humans: 470, bots: 70, uniqueHumans: 390 }],
  }, days);
}

function lineSvg(series) {
  const width = 820, height = 270, left = 46, top = 20, right = 18, bottom = 34;
  const chartWidth = width - left - right, chartHeight = height - top - bottom;
  const maximum = Math.max(1, ...series.map((item) => item.views));
  const points = series.map((item, index) => `${(left + (series.length <= 1 ? chartWidth / 2 : index / (series.length - 1) * chartWidth)).toFixed(1)},${(top + chartHeight - item.views / maximum * chartHeight).toFixed(1)}`).join(" ");
  const area = `${left},${top + chartHeight} ${points} ${left + chartWidth},${top + chartHeight}`;
  const grid = [0, .25, .5, .75, 1].map((ratio) => {
    const y = top + chartHeight * ratio;
    return `<line x1="${left}" y1="${y}" x2="${left + chartWidth}" y2="${y}"/><text x="${left - 9}" y="${y + 4}" text-anchor="end">${number(Math.round(maximum * (1 - ratio)))}</text>`;
  }).join("");
  return `<svg class="sp39-line-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik kunjungan ${series.length} hari"><g class="grid">${grid}</g><polygon class="area" points="${area}"/><polyline class="line" points="${points}"/></svg>`;
}

function donut(items) {
  const values = items.length ? items : [{ label: "Belum ada data", value: 1, empty: true }];
  const total = Math.max(1, values.reduce((sum, item) => sum + Number(item.value || 0), 0));
  const colors = ["#2d6edf", "#e59b35", "#8b96a8", "#5c4ec9"];
  let cursor = 0;
  const stops = values.map((item, index) => {
    const start = cursor;
    cursor += Number(item.value || 0) / total * 360;
    return `${item.empty ? "#dfe6ef" : colors[index % colors.length]} ${start.toFixed(1)}deg ${cursor.toFixed(1)}deg`;
  });
  return `conic-gradient(${stops.join(",")})`;
}

function legend(items, mapping = {}) {
  const values = items.length ? items : [{ label: "Belum ada data", value: 0 }];
  const total = Math.max(1, values.reduce((sum, item) => sum + Number(item.value || 0), 0));
  return values.map((item, index) => `<li><i data-index="${index}"></i><span>${escapeHtml(mapping[item.label] || item.label)}</span><b>${number(item.value)}</b><small>${Math.round(Number(item.value || 0) / total * 100)}%</small></li>`).join("");
}

function bars(items, mapping = {}) {
  if (!items.length) return `<p class="sp39-empty-copy">Belum ada data pada rentang ini.</p>`;
  const maximum = Math.max(1, ...items.map((item) => Number(item.value || 0)));
  return items.map((item) => `<div class="sp39-bar-row"><span>${escapeHtml(mapping[item.label] || item.label)}</span><div><i style="width:${Math.max(2, Number(item.value || 0) / maximum * 100).toFixed(1)}%"></i></div><b>${number(item.value)}</b></div>`).join("");
}

function analyticsMarkup(data, simulated) {
  const totals = data.totals;
  const change = totals.changePercent == null ? "Belum ada periode pembanding" : `${totals.changePercent >= 0 ? "+" : ""}${totals.changePercent}% dari periode sebelumnya`;
  const empty = totals.views === 0;
  return `<section class="sp39-analytics" data-simulated="${simulated}">
    <div class="sp39-analytics-toolbar"><div><b>${simulated ? "SIMULASI TAMPILAN — BUKAN DATA PRODUKSI" : "DATA PRODUKSI NYATA"}</b><span>${data.rangeDays} hari terakhir · diperbarui ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.generatedAt))}</span></div><div><select class="sp39-range" aria-label="Rentang analitik"><option value="7">7 hari</option><option value="30">30 hari</option><option value="90">90 hari</option><option value="365">1 tahun</option></select><button type="button" class="sp39-simulation">${simulated ? "Kembali ke data nyata" : "Lihat simulasi"}</button><button type="button" class="sp39-refresh">Muat ulang</button></div></div>
    ${empty && !simulated ? `<div class="sp39-zero-state"><b>Collector aktif, belum ada kunjungan tercatat</b><p>Buka situs publik untuk mulai mengumpulkan page view manusia, bot, perangkat, negara, dan performa Posts/Pages.</p></div>` : ""}
    <div class="sp39-metrics"><article><small>Total kunjungan</small><b>${number(totals.views)}</b><span>${escapeHtml(change)}</span></article><article><small>Manusia unik</small><b>${number(totals.uniqueHumans)}</b><span>${number(totals.humanViews)} page view manusia</span></article><article><small>Trafik bot</small><b>${number(totals.botViews)}</b><span>Mesin pencari dan otomatisasi</span></article><article><small>Hari ini</small><b>${number(totals.viewsToday)}</b><span>Event produksi yang diterima</span></article></div>
    <div class="sp39-chart-grid"><article class="sp39-chart-wide"><header><div><small>TREN TRAFIK</small><h2>Kunjungan per hari</h2></div><span>Manusia + bot</span></header>${lineSvg(data.series)}</article><article><header><div><small>JENIS TRAFIK</small><h2>Manusia dan bot</h2></div></header><div class="sp39-donut-wrap"><div class="sp39-donut" style="background:${donut(data.traffic)}"><b>${number(totals.views)}</b><small>Total</small></div><ul class="sp39-legend">${legend(data.traffic, { human: "Manusia", bot: "Bot", unknown: "Tidak diketahui" })}</ul></div></article></div>
    <div class="sp39-chart-grid sp39-chart-grid-equal"><article><header><div><small>PERANGKAT</small><h2>Distribusi perangkat</h2></div></header><div class="sp39-bars">${bars(data.devices, { mobile: "Mobile", desktop: "Desktop/laptop", tablet: "Tablet", tv: "TV", unknown: "Tidak diketahui" })}</div></article><article><header><div><small>SUMBER</small><h2>Referrer teratas</h2></div></header><div class="sp39-bars">${bars(data.referrers)}</div></article><article><header><div><small>NEGARA</small><h2>Lokasi agregat</h2></div></header><div class="sp39-bars">${bars(data.countries)}</div></article></div>
    <article class="sp39-content-table"><header><div><small>POSTS & PAGES</small><h2>Performa konten</h2></div></header><div class="sp39-table-head"><span>Konten</span><span>Kunjungan</span><span>Manusia</span><span>Bot</span><span>Unik</span></div>${data.topContent.map((item) => `<div class="sp39-table-row"><div><b>${escapeHtml(item.title || item.path)}</b><small>${escapeHtml(item.path)}</small></div><strong>${number(item.views)}</strong><span>${number(item.humans)}</span><span>${number(item.bots)}</span><span>${number(item.uniqueHumans)}</span></div>`).join("") || `<p class="sp39-empty-copy">Belum ada performa konten. Data akan muncul setelah Posts atau Pages publik dikunjungi.</p>`}</article>
  </section>`;
}

async function loadAnalytics(view, days = 30, simulated = false) {
  if (!view?.isConnected || view.dataset.sp39AnalyticsLoading === "true") return;
  view.dataset.sp39AnalyticsLoading = "true";
  view.dataset.sp39Analytics = RELEASE;
  const host = view.querySelector(".sp39-analytics-host") || view.querySelector(".sp37-analytics-host") || view.querySelector(".sn-info-grid");
  if (!host) { delete view.dataset.sp39AnalyticsLoading; return; }
  host.className = "sp39-analytics-host";
  host.innerHTML = `<div class="sp39-loading">Memuat analitik situs aktif…</div>`;
  try {
    const siteId = activeSiteId();
    if (!siteId) throw new Error("Pilih situs aktif terlebih dahulu.");
    let data;
    if (simulated) data = simulationData(days);
    else {
      if (!supabaseConfigured || !supabase) throw new Error("Koneksi analitik belum tersedia.");
      const result = await supabase.rpc("get_site_analytics_dashboard", { target_site: siteId, range_days: days });
      if (result.error) throw result.error;
      data = normalizeAnalytics(result.data, days);
    }
    host.innerHTML = analyticsMarkup(normalizeAnalytics(data, days), simulated);
    const range = host.querySelector(".sp39-range");
    if (range) range.value = String(days);
    range?.addEventListener("change", () => { delete view.dataset.sp39AnalyticsLoading; loadAnalytics(view, Number(range.value), simulated); });
    host.querySelector(".sp39-refresh")?.addEventListener("click", () => { delete view.dataset.sp39AnalyticsLoading; loadAnalytics(view, Number(range?.value || days), simulated); });
    host.querySelector(".sp39-simulation")?.addEventListener("click", () => { delete view.dataset.sp39AnalyticsLoading; loadAnalytics(view, Number(range?.value || days), !simulated); });
  } catch (error) {
    host.innerHTML = `<div class="sp39-error"><b>Analitik belum dapat dimuat</b><p>${escapeHtml(error.message || "Terjadi gangguan sementara.")}</p><div><button type="button" data-action="retry">Coba lagi</button><button type="button" data-action="simulation">Lihat simulasi tampilan</button></div></div>`;
    host.querySelector('[data-action="retry"]')?.addEventListener("click", () => { delete view.dataset.sp39AnalyticsLoading; loadAnalytics(view, days, false); });
    host.querySelector('[data-action="simulation"]')?.addEventListener("click", () => { delete view.dataset.sp39AnalyticsLoading; loadAnalytics(view, days, true); });
  } finally {
    delete view.dataset.sp39AnalyticsLoading;
  }
}

async function membersData(siteId) {
  const memberResult = await supabase.from("site_members").select("user_id,role,joined_at").eq("site_id", siteId).order("joined_at");
  if (memberResult.error) throw memberResult.error;
  const members = memberResult.data || [];
  const ids = members.map((member) => member.user_id);
  const profileResult = ids.length ? await supabase.from("profiles").select("id,display_name,avatar_url").in("id", ids) : { data: [], error: null };
  if (profileResult.error) throw profileResult.error;
  const profiles = new Map((profileResult.data || []).map((profile) => [profile.id, profile]));
  const invitationResult = await supabase.from("site_invitations").select("id,email,role,expires_at,created_at").eq("site_id", siteId).is("accepted_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
  const quotaResult = await supabase.rpc("get_site_member_quota", { target_site: siteId });
  const quota = Array.isArray(quotaResult.data) ? quotaResult.data[0] : quotaResult.data;
  return {
    members: members.map((member) => ({ ...member, profile: profiles.get(member.user_id) })),
    invitations: invitationResult.error?.code === "42501" ? [] : (invitationResult.data || []),
    quota: quota || { active_count: members.length, pending_count: 0, allowed_limit: 100, remaining: Math.max(100 - members.length, 0), can_invite: false },
  };
}

function membersMarkup(data, inviteReady) {
  const quota = data.quota || {};
  return `<section class="sp39-members-panel">
    <div class="sp39-member-summary"><article><small>Anggota aktif</small><b>${number(quota.active_count ?? data.members.length)}</b></article><article><small>Undangan menunggu</small><b>${number(quota.pending_count ?? data.invitations.length)}</b></article><article><small>Kapasitas tim</small><b>${number(quota.allowed_limit ?? 100)}</b></article><article><small>Slot tersisa</small><b>${number(quota.remaining ?? 0)}</b></article></div>
    ${inviteReady && quota.can_invite ? `<form class="sp39-invite-form"><div><small>UNDANG ANGGOTA</small><h2>Kirim undangan melalui email</h2><p>Tautan berlaku tujuh hari dan hanya dapat diterima alamat tujuan.</p></div><label>Email<input name="email" type="email" required autocomplete="email" placeholder="nama@contoh.com"></label><label>Peran<select name="role"><option value="viewer">Pengamat</option><option value="contributor">Kontributor</option><option value="author">Penulis</option><option value="editor">Editor</option><option value="admin">Admin</option></select></label><button type="submit">Kirim undangan</button></form>` : ""}
    <div class="sp39-member-grid"><section><header><div><small>TIM AKTIF</small><h2>${number(data.members.length)} anggota</h2></div></header><div class="sp39-member-list">${data.members.map((member) => { const name = member.profile?.display_name || "Pengguna"; return `<article><span>${escapeHtml(name.slice(0, 2).toUpperCase())}</span><div><b>${escapeHtml(name)}</b><small>Bergabung ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(member.joined_at))}</small></div><i>${escapeHtml(ROLE_LABEL[member.role] || member.role)}</i></article>`; }).join("") || `<p class="sp39-empty-copy">Belum ada anggota yang dapat ditampilkan.</p>`}</div></section><section><header><div><small>UNDANGAN AKTIF</small><h2>${number(data.invitations.length)} menunggu</h2></div></header><div class="sp39-invite-list">${data.invitations.map((invite) => `<article data-invitation-id="${escapeHtml(invite.id)}"><div><b>${escapeHtml(invite.email)}</b><small>${escapeHtml(ROLE_LABEL[invite.role] || invite.role)} · berakhir ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(invite.expires_at))}</small></div>${inviteReady ? `<button type="button">Batalkan</button>` : ""}</article>`).join("") || `<p class="sp39-empty-copy">Tidak ada undangan yang menunggu.</p>`}</div></section></div>
  </section>`;
}

function membersHost(view) {
  let host = view.querySelector(".sp39-members-host") || view.querySelector(".sp37-members-host") || view.querySelector(".sn-members");
  if (!host) {
    host = document.createElement("section");
    view.querySelector(":scope > .sn-page-title")?.insertAdjacentElement("afterend", host);
  }
  view.querySelectorAll(".sn-loading").forEach((node) => node.remove());
  host.className = "sp37-members-host sp39-members-host";
  return host;
}

async function loadMembers(view) {
  if (!view?.isConnected || view.dataset.sp39MembersLoading === "true") return;
  view.dataset.sp39MembersLoading = "true";
  view.dataset.sp39Members = RELEASE;
  view.dataset.sp37Members = "true";
  const host = membersHost(view);
  host.innerHTML = `<div class="sp39-loading">Memuat anggota situs aktif…</div>`;
  try {
    const siteId = activeSiteId();
    if (!siteId) throw new Error("Pilih situs aktif terlebih dahulu.");
    if (!supabaseConfigured || !supabase) throw new Error("Koneksi anggota belum tersedia.");
    const [data, state] = await Promise.all([membersData(siteId), health()]);
    host.innerHTML = membersMarkup(data, state.memberInvites === true);
    const form = host.querySelector(".sp39-invite-form");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      button.disabled = true; button.textContent = "Mengirim…";
      try {
        const values = new FormData(form);
        await api("/api/member-invitations/create", { siteId, email: values.get("email"), role: values.get("role") });
        form.reset();
        delete view.dataset.sp39MembersLoading;
        await loadMembers(view);
      } catch (error) {
        button.disabled = false; button.textContent = "Kirim undangan";
        window.alert(error.message);
      }
    });
    host.querySelectorAll(".sp39-invite-list article button").forEach((button) => button.addEventListener("click", async () => {
      if (!window.confirm("Batalkan undangan email ini?")) return;
      button.disabled = true;
      try {
        await api("/api/member-invitations/cancel", { invitationId: button.closest("article")?.dataset.invitationId });
        delete view.dataset.sp39MembersLoading;
        await loadMembers(view);
      } catch (error) { button.disabled = false; window.alert(error.message); }
    }));
  } catch (error) {
    host.innerHTML = `<div class="sp39-error"><b>Anggota belum dapat dimuat</b><p>${escapeHtml(error.message || "Terjadi gangguan sementara.")}</p><button type="button">Coba lagi</button></div>`;
    host.querySelector("button")?.addEventListener("click", () => { delete view.dataset.sp39MembersLoading; loadMembers(view); });
  } finally {
    delete view.dataset.sp39MembersLoading;
  }
}

async function siteSummary() {
  const siteId = activeSiteId();
  if (!siteId || !supabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.from("sites").select("id,name,slug,status,is_public,blueprint,description,custom_domain").eq("id", siteId).maybeSingle();
  if (error) throw error;
  return data;
}

function openSiteManager(create = false) {
  document.querySelector(".sn-workspace")?.click();
  if (create) setTimeout(() => document.querySelector(".sn-create-site")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
}

async function enhanceHome(force = false) {
  const welcome = document.querySelector(".sn-main > .sn-view-pad > .sn-welcome");
  if (!welcome) return;
  const currentId = activeSiteId();
  let card = welcome.parentElement.querySelector(":scope > .sp39-active-site");
  if (card && !force && card.dataset.siteId === currentId) return;
  welcome.parentElement.querySelector(":scope > .sp37-active-site")?.remove();
  const site = await siteSummary().catch(() => null);
  if (!site || !welcome.isConnected) return;
  if (!card) { card = document.createElement("section"); card.className = "sp39-active-site"; welcome.insertAdjacentElement("afterend", card); }
  card.dataset.siteId = site.id;
  card.innerHTML = `<div><small>SITUS YANG SEDANG DIKELOLA</small><h2>${escapeHtml(site.name)}</h2><p>${escapeHtml(site.custom_domain || `${site.slug}.ngeblogging.com`)}</p></div><dl><div><dt>Jenis</dt><dd>${escapeHtml(site.blueprint || "website")}</dd></div><div><dt>Status</dt><dd>${site.status === "active" && site.is_public ? "Publik" : "Draf"}</dd></div><div><dt>Workspace</dt><dd>Data dan fitur terpisah per situs</dd></div></dl><nav><button type="button" data-action="switch">Pilih / Ganti Situs</button><button type="button" data-action="add">Tambah Situs</button></nav>`;
  card.querySelector('[data-action="switch"]')?.addEventListener("click", () => openSiteManager(false));
  card.querySelector('[data-action="add"]')?.addEventListener("click", () => openSiteManager(true));
}

async function enhanceDomainReadiness() {
  const view = pageViewByTitle("Domain & publikasi");
  const panel = view?.querySelector(".sp37-domain-readiness");
  if (!panel) return;
  const state = await health();
  const missing = Array.isArray(state.customDomainMissing) ? state.customDomainMissing : [];
  const list = panel.querySelector("ul");
  if (list) list.innerHTML = missing.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>Menunggu sinkronisasi konfigurasi Cloudflare.</li>";
  const heading = panel.querySelector("h2");
  if (heading) heading.textContent = "Custom domain siap setelah konfigurasi Worker tersinkron";
  const copy = panel.querySelector("p");
  if (copy) copy.textContent = "Token dan Zone ID GitHub harus disinkronkan menjadi secret Worker. Setelah aktif, semua TLD valid memakai alur DNS dan HTTPS yang sama.";
}

function refreshViewsForSiteChange() {
  const current = activeSiteId();
  if (current === lastSite) return;
  lastSite = current;
  const analytics = pageViewByTitle("Analitik");
  if (analytics) { delete analytics.dataset.sp39AnalyticsLoading; loadAnalytics(analytics, 30, false); }
  const members = pageViewByTitle("Anggota & tim");
  if (members) { delete members.dataset.sp39MembersLoading; loadMembers(members); }
  enhanceHome(true);
}

function scan() {
  document.documentElement.dataset.studioProductionV39 = RELEASE;
  document.querySelectorAll(".lb36-layer").forEach(enhanceLayoutBuilder);
  upgradePreviewFrames();
  refreshViewsForSiteChange();
  enhanceHome();
  const analytics = pageViewByTitle("Analitik");
  if (analytics && !analytics.querySelector(".sp39-analytics")) loadAnalytics(analytics, 30, false);
  const members = pageViewByTitle("Anggota & tim");
  if (members && !members.querySelector(".sp39-members-panel")) loadMembers(members);
  enhanceDomainReadiness();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

window.addEventListener(SAVED_EVENT, (event) => {
  persistCustomWidgetSettings(event);
  setTimeout(upgradePreviewFrames, 80);
});
window.addEventListener("storage", (event) => { if (event.key === ACTIVE_SITE_STORAGE_KEY) schedule(); });
new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

scan();
