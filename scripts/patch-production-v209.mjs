import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v209-20260802";
const VERSION = "ngeblogging-app-v209-theme-domain-nara-20260802";
const CACHE = "theme-domain-nara-cache-v209";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V209_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`V209_RANGE_MISSING:${label}`);
  return `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v209.js";')) {
    source = replaceRequired(source, 'import "./studio-production-v208.js";', 'import "./studio-production-v208.js";\nimport "./studio-production-v209.js";', "studio-entry");
    await write(path, source);
  }
}

async function patchWidgetSystem() {
  const path = "src/widget-system.js";
  let source = await read(path);
  if (!source.includes('id: "sidebar-right-4"')) {
    source = replaceRequired(
      source,
      '  { id: "sidebar-right-3", label: "Sidebar kanan 3", group: "content" },\n  { id: "after-content", label: "Tepat di bawah postingan", group: "content" },',
      '  { id: "sidebar-right-3", label: "Sidebar kanan 3", group: "content" },\n  { id: "sidebar-right-4", label: "Sidebar kanan 4", group: "content" },\n  { id: "after-content", label: "Tepat di bawah postingan", group: "content" },',
      "sidebar-right-4",
    );
  }
  if (!source.includes("studio-v209-custom-html-last")) {
    source += '\n/* studio-v209-custom-html-last: HTML / JavaScript tetap pilihan terakhir dan berjalan dalam iframe sandbox. */\n';
  }
  await write(path, source);
}

async function patchLayoutRuntime() {
  const path = "src/theme-layout-runtime-v170.js";
  let source = await read(path);
  if (!source.includes('"sidebar-right-4"')) {
    source = replaceRequired(
      source,
      'const RIGHT_AREAS = ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3"];',
      'const RIGHT_AREAS = ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"];',
      "runtime-right4",
    );
    source = source.replaceAll("Tiga area widget kanan postingan", "Empat area widget kanan postingan");
  }
  if (source.includes("Tiga area widget kiri postingan")) source = source.replaceAll("Tiga area widget kiri postingan", "Empat area widget kiri postingan");
  await write(path, source);
}

async function patchThemeStudio() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);

  const widgetStudio = `function WidgetStudio({ value, onChange, preferredArea = "sidebar-right-1" }) {
  const normalized = normalizeWidgetState(value);
  const activeMap = new Map(normalized.map((entry) => [entry.id, entry]));
  const orderedWidgets = [...BUILT_IN_WIDGETS].sort((a,b) => Number(a.id === "custom-html") - Number(b.id === "custom-html"));
  const toggle = (widgetId) => {
    const existing = activeMap.get(widgetId);
    if (existing) onChange(value.filter((entry) => entry.id !== widgetId));
    else onChange([...value, { id: widgetId, enabled: true, area: preferredArea, order: value.length, title: getWidget(widgetId)?.name || widgetId, settings: {} }]);
  };
  const patch = (widgetId, changes) => onChange(value.map((entry) => entry.id === widgetId ? { ...entry, ...changes } : entry));
  const patchSettings = (widgetId, changes) => onChange(value.map((entry) => entry.id === widgetId ? { ...entry, settings: { ...(entry.settings || {}), ...changes } } : entry));
  const move = (widgetId, direction) => {
    const ordered = [...normalized];
    const index = ordered.findIndex((entry) => entry.id === widgetId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    onChange(ordered.map((entry, order) => ({ ...entry, order })));
  };
  const preferredLabel = LAYOUT_AREAS.find((area) => area.id === preferredArea)?.label || preferredArea;
  return <div className="tn-widget-studio" data-v209-preferred-area={preferredArea}>
    <div className="tn-widget-summary"><Blocks/><div><b>{activeMap.size} widget aktif</b><p>Area dipilih: {preferredLabel}. Pilih widget, judul, area, urutan, atau HTML/JavaScript kustom.</p></div><button onClick={() => onChange(createDefaultWidgetState())}>Gunakan default</button></div>
    <div className="tn-widget-grid">{orderedWidgets.map((widget) => {
      const active = activeMap.get(widget.id);
      const activeIndex = normalized.findIndex((entry) => entry.id === widget.id);
      return <article key={widget.id} className={active ? "active" : ""} data-widget-id={widget.id}>
        <button className="tn-widget-toggle" onClick={() => toggle(widget.id)}><span>{widget.icon}</span><div><small>{widget.category}</small><b>{widget.name}</b><p>{widget.description}</p></div><i>{active ? <Check/> : "+"}</i></button>
        {active && <div className="tn-widget-settings tn-widget-settings-v209"><label>Area<select value={active.area} onChange={(event) => patch(widget.id,{area:event.target.value})}>{LAYOUT_AREAS.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label><label>Judul<input value={active.title} onChange={(event) => patch(widget.id,{title:event.target.value})}/></label><div className="tn-widget-order-v170"><button type="button" disabled={activeIndex <= 0} onClick={() => move(widget.id,-1)} aria-label={"Naikkan " + widget.name}>↑</button><button type="button" disabled={activeIndex < 0 || activeIndex >= normalized.length - 1} onClick={() => move(widget.id,1)} aria-label={"Turunkan " + widget.name}>↓</button></div>{widget.id === "custom-html" && <div className="tn-widget-custom-code-v209"><label>HTML<textarea spellCheck="false" value={active.settings?.html || ""} onChange={(event) => patchSettings(widget.id,{html:event.target.value})} placeholder="<section>Widget kustom Anda</section>"/></label><label>JavaScript<textarea spellCheck="false" value={active.settings?.javascript || ""} onChange={(event) => patchSettings(widget.id,{javascript:event.target.value})} placeholder="// JavaScript sandbox"/></label><small>HTML dan JavaScript dijalankan di iframe sandbox terisolasi.</small></div>}</div>}
      </article>;
    })}</div>
  </div>;
}`;

  const layoutMap = `function LayoutMap({ widgets, onOpenWidgets }) {
  const enabled = normalizeWidgetState(widgets).filter((entry) => entry.enabled !== false);
  const slots = LAYOUT_AREAS.map((area) => ({ ...area, entries: enabled.filter((entry) => entry.area === area.id) }));
  return <section id="ngeblogging-layout-map" className="tn-layout-studio" aria-label="Peta tata letak situs dengan empat widget kiri dan empat widget kanan">
    <div>
      <header className="tn-layout-studio-header"><div><small>PETA TATA LETAK SITUS</small><h2>Header, area atas, empat widget kiri, konten utama, empat widget kanan, area bawah, dan footer.</h2><p>Tekan kotak untuk membuka pilihan widget langsung pada area itu. Struktur yang sama dipakai aplikasi, handphone, mobile, perangkat kecil, tablet, laptop, desktop, dan komputer.</p></div><button onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Atur widget</button></header>
      <div className="tn-layout-canvas-v170">{slots.map((area) => <button key={area.id} className={"tn-layout-slot-v170 " + area.id} onClick={() => onOpenWidgets(area.id)} title={area.entries.map((entry) => entry.title).join(", ") || area.label + " kosong"}><span>{area.entries.length}</span><small>{area.label}</small><b>{area.entries.length ? area.entries.map((entry) => entry.title).join(" · ") : "Siap diisi"}</b></button>)}<button className="tn-layout-slot-v170 content-main" onClick={() => onOpenWidgets("before-content")}><span>POST</span><small>Konten utama</small><b>Post atau Page responsif</b></button></div>
    </div>
    <aside className="tn-layout-side"><small>WIDGET TERPILIH</small><h3>{enabled.length} widget aktif</h3><p>Centang menunjukkan widget yang benar-benar ikut diterbitkan bersama tema aktif.</p><div className="tn-layout-widget-list">{enabled.map((entry) => <span key={entry.id}><Check/><b>{entry.title || getWidget(entry.id)?.name || entry.id}</b><em>{LAYOUT_AREAS.find((area) => area.id === entry.area)?.label || entry.area}</em></span>)}{!enabled.length && <span><Blocks/><b>Belum ada widget aktif</b></span>}</div><button onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Buka semua {WIDGET_COUNT} widget</button></aside>
  </section>;
}`;

  source = replaceBetween(source, "function WidgetStudio(", "function LayoutMap(", widgetStudio, "widget-studio");
  source = replaceBetween(source, "function LayoutMap(", "export default function ThemeStudio", layoutMap, "layout-map");

  if (!source.includes('const [widgetArea, setWidgetArea] = useState("sidebar-right-1");')) {
    source = replaceRequired(
      source,
      '  const [modal, setModal] = useState(null);',
      '  const [modal, setModal] = useState(null);\n  const [widgetArea, setWidgetArea] = useState("sidebar-right-1");',
      "widget-area-state",
    );
  }

  source = source.replace(
    /<LayoutMap widgets=\{themeState\.widgets\} onOpenWidgets=\{\(\) => setModal\("widgets"\)\}\/?>/,
    '<LayoutMap widgets={themeState.widgets} onOpenWidgets={(areaId = "sidebar-right-1") => { setWidgetArea(areaId); setModal("widgets"); }}/>',
  );
  source = source.replace(
    '<WidgetStudio value={widgetDraft} onChange={setWidgetDraft}/>',
    '<WidgetStudio value={widgetDraft} onChange={setWidgetDraft} preferredArea={widgetArea}/>',
  );

  // Keep the existing real CodeEditor handler; v209 runtime renames its visible
  // action to Edit Kode and adds the layout action without deleting Widget Studio.
  source = source.replaceAll('<Code2/> Edit HTML</button>', '<Code2/> Edit Kode</button>');
  if (!source.includes("Tema Custom")) {
    source = source.replace(
      '<button onClick={() => fileInput.current?.click()}><Upload/> Upload tema</button>',
      '<button onClick={() => fileInput.current?.click()}><Upload/> Upload tema</button><button onClick={() => setModal("code")}><FileCode2/> Tema Custom</button>',
    );
  }

  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "studio-v209";');
  if (!source.includes("STUDIO_V209_RELEASE")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_V209_RELEASE = "${RELEASE}";\n`);
  }
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V209_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [studio, runtime, css, widgets, layoutRuntime, themeStudio, sw] = await Promise.all([
    read("src/Studio.jsx"), read("src/studio-production-v209.js"), read("src/studio-production-v209.css"),
    read("src/widget-system.js"), read("src/theme-layout-runtime-v170.js"), read("src/ThemeStudio.jsx"), read("public/sw.js"),
  ]);
  const requirements = [
    [studio, 'studio-production-v209.js', "Studio v209 import"],
    [runtime, 'exactly-four', "four Theme actions"],
    [runtime, 'ngeblogging-v208-resume-once', "no second Studio reload gate"],
    [css, '.sidebar-left-4', "fourth left layout slot"],
    [css, '.sidebar-right-4', "fourth right layout slot"],
    [css, 'data-v209-attachment-menu="camera-photo-file"', "Nara attachment menu"],
    [widgets, 'id: "sidebar-right-4"', "real fourth right area"],
    [widgets, 'studio-v209-custom-html-last', "custom code widget"],
    [layoutRuntime, '"sidebar-right-4"', "public layout right4"],
    [themeStudio, 'preferredArea={widgetArea}', "area-aware Widget Studio"],
    [themeStudio, 'tn-widget-custom-code-v209', "custom HTML JavaScript editors"],
    [themeStudio, 'Tema Custom', "custom theme entry"],
    [themeStudio, 'Editor HTML, CSS, dan JavaScript', "code editor retained"],
    [sw, RELEASE, "v209 SW marker"],
    [sw, VERSION, "v209 SW version"],
    [sw, CACHE, "v209 SW cache"],
  ];
  for (const [source, marker, label] of requirements) {
    if (!source.includes(marker)) throw new Error(`V209_VERIFY_FAILED:${label}:${marker}`);
  }
}

await patchStudioEntry();
await patchWidgetSystem();
await patchLayoutRuntime();
await patchThemeStudio();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
