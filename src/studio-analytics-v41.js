import { escapeHtml, formatDate, formatNumber, resolveSiteId, supabase } from "./studio-operations-v41-shared.js";

function zeroSeries(days) {
  const today = new Date();
  return Array.from({ length:days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return { day:date.toISOString().slice(0, 10), views:0, humans:0, bots:0 };
  });
}

function emptyDashboard(days) {
  return {
    rangeDays:days,
    generatedAt:new Date().toISOString(),
    totals:{ views:0, humanViews:0, botViews:0, unknownViews:0, uniqueHumans:0, viewsToday:0, previousViews:0, changePercent:null },
    series:zeroSeries(days), traffic:[], devices:[], referrers:[], countries:[], topContent:[],
  };
}

function simulationDashboard(days) {
  const series = zeroSeries(days).map((entry, index) => {
    const humans = Math.max(0, Math.round(86 + Math.sin(index / 2.4) * 31 + index * 3.2));
    const bots = Math.max(0, Math.round(14 + Math.cos(index / 2.1) * 6 + index * .45));
    return { ...entry, humans, bots, views:humans + bots };
  });
  const humanViews = series.reduce((sum, item) => sum + item.humans, 0);
  const botViews = series.reduce((sum, item) => sum + item.bots, 0);
  const views = humanViews + botViews;
  return {
    rangeDays:days, generatedAt:new Date().toISOString(), simulated:true,
    totals:{ views, humanViews, botViews, unknownViews:0, uniqueHumans:Math.round(humanViews * .61), viewsToday:series.at(-1)?.views || 0, previousViews:Math.round(views * .84), changePercent:19.1 },
    series,
    traffic:[{label:"human",value:humanViews},{label:"bot",value:botViews}],
    devices:[{label:"mobile",value:Math.round(humanViews*.67)},{label:"desktop",value:Math.round(humanViews*.25)},{label:"tablet",value:Math.round(humanViews*.08)}],
    referrers:[{label:"Google",value:1480},{label:"Langsung",value:720},{label:"Facebook",value:310},{label:"Bing",value:120}],
    countries:[{label:"ID",value:2280},{label:"MY",value:210},{label:"SG",value:120}],
    topContent:[
      {path:"/panduan-memulai",title:"Panduan Memulai",views:760,humans:680,bots:80,uniqueHumans:510},
      {path:"/berita-terbaru",title:"Berita Terbaru",views:540,humans:470,bots:70,uniqueHumans:360},
      {path:"/tentang",title:"Tentang",views:330,humans:290,bots:40,uniqueHumans:220},
    ],
  };
}

function normalizeDashboard(data, days) {
  const fallback = emptyDashboard(days);
  const source = data && typeof data === "object" ? data : {};
  return {
    ...fallback, ...source,
    rangeDays:Number(source.rangeDays || days),
    generatedAt:source.generatedAt || fallback.generatedAt,
    totals:{ ...fallback.totals, ...(source.totals || {}) },
    series:Array.isArray(source.series) && source.series.length ? source.series : fallback.series,
    traffic:Array.isArray(source.traffic) ? source.traffic : [],
    devices:Array.isArray(source.devices) ? source.devices : [],
    referrers:Array.isArray(source.referrers) ? source.referrers : [],
    countries:Array.isArray(source.countries) ? source.countries : [],
    topContent:Array.isArray(source.topContent) ? source.topContent : [],
  };
}

function lineSvg(series) {
  const width = 760, height = 250, left = 42, top = 18, right = 16, bottom = 30;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = Math.max(1, ...series.map((item) => Number(item.views || 0)));
  const points = series.map((item, index) => {
    const x = left + (series.length <= 1 ? chartWidth / 2 : index / (series.length - 1) * chartWidth);
    const y = top + chartHeight - Number(item.views || 0) / maximum * chartHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area = points ? `${left},${top + chartHeight} ${points} ${left + chartWidth},${top + chartHeight}` : "";
  const grid = [0,.25,.5,.75,1].map((ratio) => {
    const y = top + chartHeight * ratio;
    const value = Math.round(maximum * (1-ratio));
    return `<line x1="${left}" y1="${y}" x2="${left+chartWidth}" y2="${y}"/><text x="${left-8}" y="${y+4}" text-anchor="end">${formatNumber(value)}</text>`;
  }).join("");
  return `<svg class="op41-line" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik kunjungan ${series.length} hari"><g class="grid">${grid}</g>${area ? `<polygon class="area" points="${area}"/>` : ""}${points ? `<polyline class="line" points="${points}"/>` : ""}</svg>`;
}

function donutBackground(items) {
  const values = items.filter((item) => Number(item.value || 0) > 0);
  const total = Math.max(1, values.reduce((sum, item) => sum + Number(item.value || 0), 0));
  const colors = ["#2d6edf", "#e59b35", "#8b96a8", "#5c4ec9"];
  let cursor = 0;
  const stops = values.map((item, index) => {
    const start = cursor;
    cursor += Number(item.value || 0) / total * 360;
    return `${colors[index % colors.length]} ${start.toFixed(1)}deg ${cursor.toFixed(1)}deg`;
  });
  return `conic-gradient(${stops.join(",") || "#e5ebf2 0deg 360deg"})`;
}

function legend(items, mapping = {}) {
  const total = Math.max(1, items.reduce((sum, item) => sum + Number(item.value || 0), 0));
  if (!items.length) return `<li><i></i><span>Belum ada data</span><b>0</b><small>0%</small></li>`;
  return items.map((item) => `<li><i></i><span>${escapeHtml(mapping[item.label] || item.label || "Tidak diketahui")}</span><b>${formatNumber(item.value)}</b><small>${Math.round(Number(item.value || 0)/total*100)}%</small></li>`).join("");
}

function bars(items, mapping = {}) {
  const maximum = Math.max(1, ...items.map((item) => Number(item.value || 0)));
  if (!items.length) return `<p>Belum ada data pada rentang ini.</p>`;
  return items.map((item) => `<div class="op41-bar"><span>${escapeHtml(mapping[item.label] || item.label || "Tidak diketahui")}</span><div><i style="width:${Math.max(2, Number(item.value || 0)/maximum*100).toFixed(1)}%"></i></div><b>${formatNumber(item.value)}</b></div>`).join("");
}

function analyticsMarkup(data, simulated) {
  const totals = data.totals || {};
  const change = totals.changePercent == null ? "Belum ada periode pembanding" : `${totals.changePercent >= 0 ? "+" : ""}${totals.changePercent}% dari periode sebelumnya`;
  const traffic = data.traffic?.length ? data.traffic : [
    { label:"human", value:totals.humanViews || 0 },
    { label:"bot", value:totals.botViews || 0 },
    { label:"unknown", value:totals.unknownViews || 0 },
  ];
  return `<section class="op41-panel" data-simulated="${simulated}">
    <div class="op41-toolbar"><div><small class="op41-kicker">${simulated ? "SIMULASI TAMPILAN — BUKAN DATA PRODUKSI" : "DATA PRODUKSI NYATA"}</small><h2>Analitik situs aktif</h2><p>${data.rangeDays} hari terakhir · diperbarui ${formatDate(data.generatedAt, true)}</p></div><div class="op41-toolbar-actions"><select class="op41-range" aria-label="Rentang analitik"><option value="7">7 hari</option><option value="30">30 hari</option><option value="90">90 hari</option><option value="365">1 tahun</option></select><button type="button" class="op41-simulate">${simulated ? "Kembali ke data nyata" : "Lihat simulasi"}</button><button type="button" class="primary op41-refresh">Muat ulang</button></div></div>
    <div class="op41-metrics"><article><small>Total kunjungan</small><b>${formatNumber(totals.views)}</b><span>${escapeHtml(change)}</span></article><article><small>Pengunjung manusia unik</small><b>${formatNumber(totals.uniqueHumans)}</b><span>${formatNumber(totals.humanViews)} page view manusia</span></article><article><small>Trafik bot</small><b>${formatNumber(totals.botViews)}</b><span>Bot mesin pencari dan otomatisasi</span></article><article><small>Kunjungan hari ini</small><b>${formatNumber(totals.viewsToday)}</b><span>Event yang sudah diterima collector</span></article></div>
    <div class="op41-chart-grid"><article class="op41-card"><header><div><small class="op41-kicker">TREN TRAFIK</small><h2>Kunjungan per hari</h2></div><span>Manusia + bot</span></header>${lineSvg(data.series || [])}</article><article class="op41-card"><header><div><small class="op41-kicker">JENIS TRAFIK</small><h2>Manusia dan bot</h2></div></header><div class="op41-donut-wrap"><div class="op41-donut" style="background:${donutBackground(traffic)}"><div><b>${formatNumber(totals.views)}</b><small>Total</small></div></div><ul class="op41-legend">${legend(traffic,{human:"Manusia",bot:"Bot",unknown:"Tidak diketahui"})}</ul></div></article></div>
    <div class="op41-chart-grid equal"><article class="op41-card"><header><div><small class="op41-kicker">PERANGKAT</small><h2>Distribusi perangkat</h2></div></header><div class="op41-bars">${bars(data.devices || [],{mobile:"Mobile",desktop:"Desktop/laptop",tablet:"Tablet",tv:"TV",unknown:"Tidak diketahui"})}</div></article><article class="op41-card"><header><div><small class="op41-kicker">SUMBER TRAFIK</small><h2>Referrer teratas</h2></div></header><div class="op41-bars">${bars(data.referrers || [])}</div></article><article class="op41-card"><header><div><small class="op41-kicker">NEGARA</small><h2>Lokasi agregat</h2></div></header><div class="op41-bars">${bars(data.countries || [])}</div></article></div>
    <article class="op41-card"><header><div><small class="op41-kicker">POSTS & PAGES</small><h2>Performa konten</h2></div></header><div class="op41-table-wrap"><div class="op41-table"><div class="head"><span>Konten</span><span>Kunjungan</span><span>Manusia</span><span>Bot</span><span>Unik</span></div>${(data.topContent || []).map((item) => `<div><div><b>${escapeHtml(item.title || item.path)}</b><small>${escapeHtml(item.path)}</small></div><strong>${formatNumber(item.views)}</strong><span>${formatNumber(item.humans)}</span><span>${formatNumber(item.bots)}</span><span>${formatNumber(item.uniqueHumans)}</span></div>`).join("") || `<div><div><b>Belum ada kunjungan konten</b><small>Collector akan mengisi tabel setelah Posts atau Pages publik dibuka.</small></div><strong>0</strong><span>0</span><span>0</span><span>0</span></div>`}</div></div></article>
  </section>`;
}

function hostFor(view) {
  let host = view.querySelector(":scope > .op41-host[data-surface='analytics'], :scope > .sp37-analytics-host, :scope > .sn-info-grid");
  if (!host) { host = document.createElement("div"); view.append(host); }
  host.className = "op41-host";
  host.dataset.surface = "analytics";
  return host;
}

export async function loadAnalytics(view, days = 30, simulated = false) {
  if (!view || view.dataset.op41AnalyticsBusy === "true") return;
  view.dataset.sp37Analytics = "true";
  view.dataset.op41AnalyticsBusy = "true";
  const host = hostFor(view);
  host.innerHTML = `<div class="op41-state"><b>Memuat analitik situs aktif…</b><span>Mengambil event produksi terbaru.</span></div>`;
  try {
    const siteId = await resolveSiteId();
    if (!siteId) throw new Error("Situs aktif belum dipilih. Gunakan tombol Beralih situs lalu buka Analitik kembali.");
    let raw;
    if (simulated) raw = simulationDashboard(days);
    else {
      if (!supabase) throw new Error("Koneksi Supabase belum tersedia.");
      const result = await supabase.rpc("get_site_analytics_dashboard", { target_site:siteId, range_days:days });
      if (result.error) throw result.error;
      raw = result.data;
    }
    const data = normalizeDashboard(raw, days);
    host.innerHTML = analyticsMarkup(data, simulated);
    const range = host.querySelector(".op41-range");
    if (range) range.value = String(days);
    range?.addEventListener("change", () => loadAnalytics(view, Number(range.value), simulated));
    host.querySelector(".op41-refresh")?.addEventListener("click", () => loadAnalytics(view, Number(range?.value || days), simulated));
    host.querySelector(".op41-simulate")?.addEventListener("click", () => loadAnalytics(view, Number(range?.value || days), !simulated));
    view.dataset.op41AnalyticsSite = siteId;
    view.dataset.op41AnalyticsMode = simulated ? "simulation" : "production";
  } catch (error) {
    host.innerHTML = `<div class="op41-state error"><b>Analitik belum dapat dimuat</b><p>${escapeHtml(error.message || "Terjadi gangguan sementara.")}</p><div class="op41-toolbar-actions"><button type="button" class="op41-button op41-analytics-retry">Coba lagi</button><button type="button" class="op41-button primary op41-analytics-simulation">Lihat simulasi tampilan</button></div></div>`;
    host.querySelector(".op41-analytics-retry")?.addEventListener("click", () => loadAnalytics(view, days, false));
    host.querySelector(".op41-analytics-simulation")?.addEventListener("click", () => loadAnalytics(view, days, true));
  } finally {
    delete view.dataset.op41AnalyticsBusy;
  }
}
