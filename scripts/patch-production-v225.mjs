import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v225-green-layout-source-20260803";
const VERSION = "ngeblogging-app-v225-green-layout-source-20260803";
const CACHE = "green-layout-source-cache-v225";

const GREEN_LABELS = {
  "top-left-1": "Header kiri · kotak 1",
  "top-right-1": "Header kanan · kotak 1",
  "top-left-2": "Header kiri · kotak 2",
  "top-right-2": "Header kanan · kotak 2",
  "top-left-3": "Kotak panjang di bawah header",
  "top-right-3": "Navigasi / area atas",
  "before-content": "Kotak di atas postingan",
  "sidebar-left-1": "Sidebar kiri · kotak 1",
  "sidebar-left-2": "Sidebar kiri · kotak 2",
  "sidebar-left-3": "Sidebar kiri · kotak 3",
  "sidebar-left-4": "Sidebar kiri · kotak 4",
  "sidebar-right-1": "Sidebar kanan · kotak 1",
  "sidebar-right-2": "Sidebar kanan · kotak 2",
  "sidebar-right-3": "Sidebar kanan · kotak 3",
  "sidebar-right-4": "Sidebar kanan · kotak 4",
  "after-content": "Kotak panjang di bawah postingan",
  "bottom-left-1": "Footer kiri · kotak 1",
  "bottom-right-1": "Footer kanan · kotak 1",
  "bottom-left-2": "Footer kiri · kotak 2",
  "bottom-right-2": "Footer kanan · kotak 2",
  "bottom-left-3": "Kotak footer panjang",
  "bottom-right-3": "Copyright / identitas situs",
};

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`V225_RANGE_MISSING:${label}`);
  return `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
}

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V225_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchWidgetAreaLabels() {
  const path = "src/widget-system.js";
  let source = await read(path);
  for (const [id, label] of Object.entries(GREEN_LABELS)) {
    const pattern = new RegExp(`(id: "${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}", label: ")[^"]+("[,}])`);
    if (pattern.test(source)) source = source.replace(pattern, `$1${label}$2`);
  }
  source += source.includes("green-layout-source-v225") ? "" : `\n/* green-layout-source-v225: ${Object.keys(GREEN_LABELS).length} semantic widget slots drive Theme Studio and published theme placement. */\n`;
  await write(path, source);
}

async function patchThemeStudio() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  if (!source.includes("LAYOUT_AREAS")) throw new Error("V225_LAYOUT_AREAS_IMPORT_MISSING");

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
  return <div className="tn-widget-studio" data-v209-preferred-area={preferredArea} data-v225-widget-studio="green-area-aware">
    <div className="tn-widget-summary"><Blocks/><div><b>{activeMap.size} widget aktif</b><p>Area dipilih: {preferredLabel}. Aktifkan widget, pilih area, ubah judul, urutan, atau HTML/JavaScript kustom.</p></div><button onClick={() => onChange(createDefaultWidgetState())}>Gunakan default</button></div>
    <div className="tn-widget-grid">{orderedWidgets.map((widget) => {
      const active = activeMap.get(widget.id);
      const activeIndex = normalized.findIndex((entry) => entry.id === widget.id);
      return <article key={widget.id} className={active ? "active" : ""} data-widget-id={widget.id}>
        <button className="tn-widget-toggle" onClick={() => toggle(widget.id)}><span>{widget.icon}</span><div><small>{widget.category}</small><b>{widget.name}</b><p>{widget.description}</p></div><i>{active ? <Check/> : "+"}</i></button>
        {active && <div className="tn-widget-settings tn-widget-settings-v209"><label>Area<select value={active.area} onChange={(event) => patch(widget.id,{area:event.target.value})}>{LAYOUT_AREAS.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label><label>Judul<input value={active.title} onChange={(event) => patch(widget.id,{title:event.target.value})}/></label><div className="tn-widget-order-v170"><button type="button" disabled={activeIndex <= 0} onClick={() => move(widget.id,-1)} aria-label={"Naikkan " + widget.name}>↑</button><button type="button" disabled={activeIndex < 0 || activeIndex >= normalized.length - 1} onClick={() => move(widget.id,1)} aria-label={"Turunkan " + widget.name}>↓</button></div>{widget.id === "custom-html" && <div className="tn-widget-custom-code-v209"><label>HTML<textarea spellCheck="false" value={active.settings?.html || ""} onChange={(event) => patchSettings(widget.id,{html:event.target.value})} placeholder="<section>Widget kustom Anda</section>"/></label><label>JavaScript<textarea spellCheck="false" value={active.settings?.javascript || ""} onChange={(event) => patchSettings(widget.id,{javascript:event.target.value})} placeholder="// JavaScript sandbox"/></label><small>HTML dan JavaScript berjalan di iframe sandbox terisolasi.</small></div>}</div>}
      </article>;
    })}</div>
  </div>;
}`;

  const layoutMap = `function LayoutMap({ widgets, onOpenWidgets }) {
  const enabled = normalizeWidgetState(widgets).filter((entry) => entry.enabled !== false);
  const slots = LAYOUT_AREAS.map((area) => ({ ...area, entries: enabled.filter((entry) => entry.area === area.id) }));
  const openArea = (areaId) => onOpenWidgets(areaId);
  return <section id="ngeblogging-layout-map" className="tn-layout-studio" aria-label="Peta tata letak situs" data-v225-layout-source="green-reference">
    <div>
      <header className="tn-layout-studio-header"><small>PETA TATA LETAK SITUS</small><button type="button" onClick={() => openArea("sidebar-right-1")}><Blocks/> Atur widget</button></header>
      <div className="tn-layout-canvas-v170" data-v225-green-map="four-left-four-right">{slots.map((area) => <button type="button" key={area.id} className={"tn-layout-slot-v170 " + area.id} data-layout-area={area.id} onClick={() => openArea(area.id)} title={area.entries.map((entry) => entry.title).join(", ") || area.label + " kosong"}><span>{area.entries.length}</span><small>{area.label}</small><b>{area.entries.length ? area.entries.map((entry) => entry.title).join(" · ") : "Siap diisi"}</b></button>)}<button type="button" className="tn-layout-slot-v170 content-main" data-layout-area="content-main" onClick={() => openArea("before-content")} title="Post / Page — atur widget di atas postingan"><span>POST / PAGE</span><small>Kotak postingan</small><b>Konten utama situs</b></button></div>
    </div>
    <aside className="tn-layout-side" data-v225-widget-list="below-map"><small>WIDGET TERPILIH</small><h3>{enabled.length} widget aktif</h3><p>Centang menunjukkan widget yang benar-benar ikut diterbitkan bersama tema aktif.</p><div className="tn-layout-widget-list">{enabled.map((entry) => <span key={entry.id}><Check/><b>{entry.title || getWidget(entry.id)?.name || entry.id}</b><em>{LAYOUT_AREAS.find((area) => area.id === entry.area)?.label || entry.area}</em></span>)}{!enabled.length && <span><Blocks/><b>Belum ada widget aktif</b></span>}</div><button type="button" onClick={() => openArea("sidebar-right-1")}><Blocks/> Buka semua {WIDGET_COUNT} widget</button></aside>
  </section>;
}`;

  source = replaceBetween(source, "function WidgetStudio(", "function LayoutMap(", widgetStudio, "widget-studio");
  source = replaceBetween(source, "function LayoutMap(", "export default function ThemeStudio", layoutMap, "layout-map");

  if (!source.includes('const [widgetArea, setWidgetArea] = useState("sidebar-right-1");')) {
    const anchor = '  const [modal, setModal] = useState(null);';
    if (!source.includes(anchor)) throw new Error("V225_WIDGET_AREA_STATE_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n  const [widgetArea, setWidgetArea] = useState("sidebar-right-1");`);
  }
  source = source.replace(/<LayoutMap widgets=\{themeState\.widgets\} onOpenWidgets=\{[^>]+\}\/>/, '<LayoutMap widgets={themeState.widgets} onOpenWidgets={(areaId = "sidebar-right-1") => { setWidgetArea(areaId); setModal("widgets"); }}/>' );
  source = source.replace(/<WidgetStudio value=\{widgetDraft\} onChange=\{setWidgetDraft\}(?: preferredArea=\{widgetArea\})?\/>/, '<WidgetStudio value={widgetDraft} onChange={setWidgetDraft} preferredArea={widgetArea}/>' );
  if (!source.includes('preferredArea={widgetArea}')) throw new Error("V225_WIDGET_AREA_WIRING_MISSING");
  if (source.includes("Header, area atas, empat widget kiri, konten utama")) throw new Error("V225_LONG_LAYOUT_COPY_REMAINS");
  await write(path, source);
}

async function patchV221Labels() {
  const path = "src/studio-production-v221.js";
  let source = await read(path);
  for (const [id, label] of Object.entries(GREEN_LABELS)) {
    const pattern = new RegExp(`("${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}": ")[^"]+(")`);
    if (pattern.test(source)) source = source.replace(pattern, `$1${label}$2`);
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "green-layout-source-v225";');
  source = insertAfterVersion(source, `const STUDIO_PRODUCTION_RELEASE_V225 = "${RELEASE}";`);
  source = insertAfterVersion(source, 'const DATA_REAUTH_COMPAT_VERSION_V224 = "ngeblogging-app-v224-data-reauth-20260803";');
  source = insertAfterVersion(source, 'const DATA_REAUTH_COMPAT_CACHE_V224 = "data-reauth-cache-v224";');
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V224", "NGE_BLOGGING_UPDATE_AVAILABLE_V225");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V225_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [studio, widgets, v221, worker] = await Promise.all([
    read("src/ThemeStudio.jsx"), read("src/widget-system.js"), read("src/studio-production-v221.js"), read("public/sw.js"),
  ]);
  for (const marker of [
    'data-v225-layout-source="green-reference"',
    'data-v225-green-map="four-left-four-right"',
    'preferredArea={widgetArea}',
    'tn-widget-custom-code-v209',
    'PETA TATA LETAK SITUS',
    'Kotak postingan',
    'Buka semua {WIDGET_COUNT} widget',
  ]) if (!studio.includes(marker)) throw new Error(`V225_THEME_STUDIO_MISSING:${marker}`);
  for (const [id, label] of Object.entries(GREEN_LABELS)) {
    if (!widgets.includes(`id: "${id}"`) || !widgets.includes(label)) throw new Error(`V225_WIDGET_AREA_MISSING:${id}:${label}`);
    if (!v221.includes(`"${id}": "${label}"`)) throw new Error(`V225_RUNTIME_LABEL_MISSING:${id}`);
  }
  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100) throw new Error("V225_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V225_WIDGET_COUNT_REGRESSION");
  for (const marker of [VERSION, CACHE, RELEASE, "ngeblogging-app-v224-data-reauth-20260803"]) if (!worker.includes(marker)) throw new Error(`V225_SW_MISSING:${marker}`);
}

await patchWidgetAreaLabels();
await patchThemeStudio();
await patchV221Labels();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
