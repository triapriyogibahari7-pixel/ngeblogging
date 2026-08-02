import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v212-20260802";
const VERSION = "ngeblogging-app-v212-layout-code-nara-analytics-20260802";
const CACHE = "layout-code-nara-analytics-cache-v212";
const FORCE = "studio-v212";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V212_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`V212_RANGE_MISSING:${label}`);
  return `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v212.js";')) {
    source = replaceRequired(
      source,
      'import "./studio-production-v211.js";',
      'import "./studio-production-v211.js";\nimport "./studio-production-v212.js";',
      "studio-v211-import",
    );
    await write(path, source);
  }
}

async function patchThemeStudio() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);

  const codeEditor = `function CodeEditor({ value, onChange, config, widgets, theme, device, onDeviceChange }) {
  const [tab, setTab] = useState("html");
  const [panelOrder, setPanelOrder] = useState("code");
  const tabs = [{ id:"html",label:"HTML",icon:FileCode2 },{ id:"css",label:"CSS",icon:Palette },{ id:"javascript",label:"JavaScript",icon:Code2 }];
  const selectedDevice = deviceInfo(device);
  return <div className={\`tn-code-workspace tn-code-workspace-v212 tn-code-order-\${panelOrder}\`} data-code-layout-v212="split-or-stack">
    <section className="tn-code-pane">
      <nav>{tabs.map(({id,label,icon:Icon}) => <button type="button" key={id} className={tab===id?"active":""} onClick={() => setTab(id)}><Icon/>{label}</button>)}</nav>
      <div className="tn-code-status"><span><ShieldCheck/> Sandbox aktif</span><small>{String(value[tab] || "").length.toLocaleString("id-ID")} karakter</small></div>
      <textarea aria-label={\`Editor \${tab}\`} value={value[tab] || ""} onChange={(event) => onChange({ ...value, [tab]: event.target.value })} spellCheck="false"/>
    </section>
    <section className="tn-code-preview-pane">
      <header><div><small>PREVIEW LANGSUNG</small><b>{selectedDevice.label} · {selectedDevice.width}px</b></div><DeviceSwitch value={device} onChange={onDeviceChange}/><button type="button" className="tn-code-swap-v212" onClick={() => setPanelOrder((current) => current === "code" ? "preview" : "code")} aria-label="Tukar posisi kode dan preview">Tukar panel</button></header>
      <ThemeFrame theme={theme} code={value} config={config} widgets={widgets} device={device} title={\`Pratinjau kode tema mode \${selectedDevice.label}\`}/>
    </section>
  </div>;
}`;

  source = replaceBetween(source, "function CodeEditor(", "function WidgetStudio(", codeEditor, "code-editor");

  const layoutMap = `function LayoutMap({ widgets, onOpenWidgets }) {
  const enabled = normalizeWidgetState(widgets).filter((entry) => entry.enabled !== false);
  const areas = [
    ["header-left","Header kiri"],["header-right","Header kanan"],["below-header","Di bawah header"],
    ["sidebar-left","Widget kiri 1"],["sidebar-left-2","Widget kiri 2"],["sidebar-left-3","Widget kiri 3"],["sidebar-left-4","Widget kiri 4"],
    ["before-content","Tepat di atas postingan"],["after-content","Tepat di bawah postingan"],
    ["sidebar-right","Widget kanan 1"],["sidebar-right-2","Widget kanan 2"],["sidebar-right-3","Widget kanan 3"],["sidebar-right-4","Widget kanan 4"],
    ["footer-left","Footer kiri"],["footer-right","Footer kanan"],["footer-wide","Footer panjang"],
  ];
  const labelMap = new Map(areas);
  const entriesFor = (areaId) => enabled.filter((entry) => entry.area === areaId);
  const areaButton = (areaId) => {
    const entries = entriesFor(areaId);
    const label = labelMap.get(areaId) || areaId;
    return <button type="button" key={areaId} className={\`tn-layout-slot-v212 \${areaId}\`} onClick={() => onOpenWidgets(areaId)} title={entries.map((entry) => entry.title).join(", ") || label + " kosong"}><span>{entries.length}</span><i><small>{label}</small><b>{entries.length ? entries.map((entry) => entry.title).join(" · ") : "Siap diisi"}</b></i></button>;
  };
  const left = ["sidebar-left","sidebar-left-2","sidebar-left-3","sidebar-left-4"];
  const right = ["sidebar-right","sidebar-right-2","sidebar-right-3","sidebar-right-4"];
  return <section id="ngeblogging-layout-map" className="tn-layout-studio tn-layout-studio-v212" aria-label="Peta tata letak situs dengan konten utama terkunci dan empat widget kiri serta kanan">
    <div>
      <header className="tn-layout-studio-header"><div><small>PETA TATA LETAK SITUS</small><h2>Konten utama tetap besar di tengah. Widget berada di area sekelilingnya.</h2><p>POST atau PAGE tidak dapat diganti widget. Empat area kiri dan empat area kanan dapat diisi Pencarian, Post terbaru, kategori, media, HTML / JavaScript kustom, dan widget lainnya.</p></div><button type="button" onClick={() => onOpenWidgets("sidebar-right")}><Blocks/> Atur widget</button></header>
      <div className="tn-layout-canvas-v212">
        <div className="tn-layout-top-v212">{areaButton("header-left")}{areaButton("header-right")}{areaButton("below-header")}</div>
        <div className="tn-layout-post-grid-v212">
          <div className="tn-layout-rail-v212 left" aria-label="Empat widget kiri postingan">{left.map(areaButton)}</div>
          <div className="tn-layout-center-v212">{areaButton("before-content")}<div className="tn-layout-content-main-v212" role="group" aria-label="Konten utama Post atau Page terkunci"><span>POST / PAGE</span><strong>Konten utama</strong><p>Area penulisan utama tetap penuh dan tidak dapat digantikan widget. Konten Post dan Page dapat memakai editor hingga batas utama 5.000 kata, HTML, media, dan struktur tema aktif.</p><em>AREA TERKUNCI · BUKAN SLOT WIDGET</em></div>{areaButton("after-content")}</div>
          <div className="tn-layout-rail-v212 right" aria-label="Empat widget kanan postingan">{right.map(areaButton)}</div>
        </div>
        <div className="tn-layout-footer-v212">{areaButton("footer-left")}{areaButton("footer-right")}{areaButton("footer-wide")}</div>
      </div>
    </div>
    <aside className="tn-layout-side"><small>WIDGET TERPILIH</small><h3>{enabled.length} widget aktif</h3><p>Centang menunjukkan widget yang benar-benar ikut diterbitkan. Konten utama tidak termasuk hitungan widget.</p><div className="tn-layout-widget-list">{enabled.map((entry) => <span key={entry.id}><Check/><b>{entry.title || getWidget(entry.id)?.name || entry.id}</b><em>{labelMap.get(entry.area) || entry.area}</em></span>)}{!enabled.length && <span><Blocks/><b>Belum ada widget aktif</b></span>}</div><button type="button" onClick={() => onOpenWidgets("sidebar-right")}><Blocks/> Buka semua {WIDGET_COUNT} widget</button></aside>
  </section>;
}`;

  source = replaceBetween(source, "function LayoutMap(", "export default function ThemeStudio", layoutMap, "layout-map");
  await write(path, source);
}

async function patchAnalytics() {
  const path = "src/studio-analytics-v41.js";
  let source = await read(path);
  if (!source.includes("function lineSvgV212")) {
    const smooth = `function lineSvgV212(series) {
  const width = 900, height = 330, left = 48, top = 20, right = 20, bottom = 34;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = Math.max(1, ...series.map((item) => Number(item.views || 0)));
  const points = series.map((item, index) => ({
    x:left + (series.length <= 1 ? chartWidth / 2 : index / (series.length - 1) * chartWidth),
    y:top + chartHeight - Number(item.views || 0) / maximum * chartHeight,
    value:Number(item.views || 0),
    day:item.day || "",
  }));
  const pathFor = (items) => {
    if (!items.length) return "";
    if (items.length === 1) return \`M \${items[0].x} \${items[0].y}\`;
    let path = \`M \${items[0].x.toFixed(1)} \${items[0].y.toFixed(1)}\`;
    for (let index = 0; index < items.length - 1; index += 1) {
      const current = items[index], next = items[index + 1];
      const previous = items[index - 1] || current;
      const after = items[index + 2] || next;
      const cp1x = current.x + (next.x - previous.x) / 6;
      const cp1y = current.y + (next.y - previous.y) / 6;
      const cp2x = next.x - (after.x - current.x) / 6;
      const cp2y = next.y - (after.y - current.y) / 6;
      path += \` C \${cp1x.toFixed(1)} \${cp1y.toFixed(1)}, \${cp2x.toFixed(1)} \${cp2y.toFixed(1)}, \${next.x.toFixed(1)} \${next.y.toFixed(1)}\`;
    }
    return path;
  };
  const linePath = pathFor(points);
  const baseY = top + chartHeight;
  const areaPath = points.length ? \`\${linePath} L \${points.at(-1).x.toFixed(1)} \${baseY} L \${points[0].x.toFixed(1)} \${baseY} Z\` : "";
  const grid = [0,.25,.5,.75,1].map((ratio) => {
    const y = top + chartHeight * ratio;
    const value = Math.round(maximum * (1-ratio));
    return \`<line x1="\${left}" y1="\${y}" x2="\${left+chartWidth}" y2="\${y}"/><text x="\${left-9}" y="\${y+4}" text-anchor="end">\${formatNumber(value)}</text>\`;
  }).join("");
  const markers = points.filter((_, index) => series.length <= 14 || index % Math.max(1, Math.floor(series.length / 10)) === 0 || index === points.length - 1).map((point) => \`<circle class="point" cx="\${point.x.toFixed(1)}" cy="\${point.y.toFixed(1)}" r="4"><title>\${escapeHtml(point.day)} · \${formatNumber(point.value)} kunjungan</title></circle>\`).join("");
  return \`<svg class="op41-line op41-line-v212" viewBox="0 0 \${width} \${height}" role="img" aria-label="Grafik kunjungan halus \${series.length} hari"><defs><linearGradient id="op41AreaV212" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2d6edf" stop-opacity=".28"/><stop offset="100%" stop-color="#2d6edf" stop-opacity=".02"/></linearGradient></defs><g class="grid">\${grid}</g>\${areaPath ? \`<path class="area" d="\${areaPath}"/>\` : ""}\${linePath ? \`<path class="line" d="\${linePath}"/>\` : ""}\${markers}</svg>\`;
}`;
    source = replaceRequired(source, "function donutBackground(items) {", `${smooth}\n\nfunction donutBackground(items) {`, "analytics-smooth-chart");
  }
  source = source.replace("${lineSvg(data.series || [])}", "${lineSvgV212(data.series || [])}");
  if (!source.includes("v212-details")) {
    const anchor = '    <article class="op41-card"><header><div><small class="op41-kicker">POSTS & PAGES</small><h2>Performa konten</h2></div></header>';
    const details = '    <div class="op41-chart-grid equal v212-details"><article class="op41-card"><header><div><small class="op41-kicker">BROWSER</small><h2>Browser pengunjung</h2></div></header><div class="op41-bars">${bars(data.browsers || [])}</div></article><article class="op41-card"><header><div><small class="op41-kicker">MESIN PENCARI / BOT</small><h2>Bot teridentifikasi</h2></div></header><div class="op41-bars">${bars(data.searchEngines || data.bots || [])}</div></article><article class="op41-card"><header><div><small class="op41-kicker">HALAMAN MASUK</small><h2>Landing teratas</h2></div></header><div class="op41-bars">${bars(data.entryPages || [])}</div></article></div>\n';
    source = replaceRequired(source, anchor, `${details}${anchor}`, "analytics-detail-cards");
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V212")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_PRODUCTION_RELEASE_V212 = "${RELEASE}";\nconst STUDIO_PRODUCTION_COMPAT_VERSION_V211 = "ngeblogging-app-v211-mobile-theme-nara-domain-20260802";\nconst STUDIO_PRODUCTION_COMPAT_CACHE_V211 = "mobile-theme-nara-domain-cache-v211";\n`);
  }
  for (const eventName of ["NGE_BLOGGING_UPDATE_AVAILABLE_V211", "NGE_BLOGGING_UPDATE_AVAILABLE_V210"]) source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V212");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v212 announces the new shell without forced navigation or session destruction.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V212_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, theme, analytics, runtime, css, sw, widgets, nara, publicSite, release] = await Promise.all([
    read("src/Studio.jsx"), read("src/ThemeStudio.jsx"), read("src/studio-analytics-v41.js"), read("src/studio-production-v212.js"), read("src/studio-production-v212.css"), read("public/sw.js"), read("src/widget-system.js"), read("src/NaraAssistant.jsx"), read("src/PublicSiteNext.jsx"), read("public/release-v212.json"),
  ]);
  const checks = [
    [entry, "studio-production-v212.js", "Studio v212 import"],
    [theme, "tn-layout-content-main-v212", "locked central content"],
    [theme, '"sidebar-left-4"', "fourth left slot"],
    [theme, '"sidebar-right-4"', "fourth right slot"],
    [theme, "tn-code-workspace-v212", "code split workspace"],
    [theme, "Tukar panel", "code/preview switch"],
    [analytics, "lineSvgV212", "smooth analytics chart"],
    [analytics, "v212-details", "analytics detail cards"],
    [runtime, RELEASE, "v212 runtime"],
    [runtime, "camera-photo-file", "native Nara menu"],
    [css, ".tn-layout-content-main-v212", "layout CSS"],
    [css, ".tn-code-workspace-v212", "code editor CSS"],
    [css, "#nara-attachment-menu-v211", "Nara native attachment menu CSS"],
    [css, 'data-studio-v212-device="handheld"', "physical handheld CSS"],
    [widgets, 'id: "custom-html"', "custom HTML/JavaScript widget"],
    [widgets, 'id: "sidebar-left-4"', "real fourth left area"],
    [widgets, 'id: "sidebar-right-4"', "real fourth right area"],
    [nara, 'aria-controls="nara-attachment-menu-v211"', "Nara native plus trigger retained"],
    [publicSite, "PUBLIC_SITE_SINGLE_RENDER_V209", "single initial public render"],
    [sw, VERSION, "v212 service worker"],
    [sw, CACHE, "v212 cache"],
    [sw, RELEASE, "v212 release marker"],
    [release, RELEASE, "v212 release metadata"],
  ];
  for (const [source, marker, label] of checks) if (!source.includes(marker)) throw new Error(`V212_VERIFY_FAILED:${label}:${marker}`);
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/.test(runtime)) throw new Error("V212_DESTRUCTIVE_STORAGE_ACTION");
  if (/signOut\s*\(/.test(runtime)) throw new Error("V212_RUNTIME_LOGOUT_ACTION");
}

await patchStudioEntry();
await patchThemeStudio();
await patchAnalytics();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
