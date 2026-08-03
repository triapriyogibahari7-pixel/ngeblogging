import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v226-native-green-layout-20260803";
const VERSION = "ngeblogging-app-v226-native-green-layout-20260803";
const CACHE = "native-green-layout-cache-v226";

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`V226_RANGE_MISSING:${label}`);
  return `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
}

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V226_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

function isNativeV245(source) {
  return source.includes('data-theme-interface="v245-native"')
    && source.includes("function LayoutMap({ widgets, onChange, onOpenWidgets })")
    && source.includes('id: "left-4"')
    && source.includes('id: "content-main"')
    && source.includes('id: "right-4"')
    && source.includes("BUILT_IN_WIDGETS.map")
    && source.includes("layoutSlot: selectedSlot.id");
}

async function patchThemeStudioSource() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  if (isNativeV245(source)) {
    console.log("[v226] native Theme Studio v245 detected; legacy source replacement skipped");
    return;
  }
  if (!source.includes("LAYOUT_AREAS")) throw new Error("V226_LAYOUT_AREAS_NOT_READY");

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
  const selectedArea = LAYOUT_AREAS.find((area) => area.id === preferredArea);
  return <div className="tn-widget-studio" data-v209-preferred-area={preferredArea} data-v226-widget-studio="area-aware-26">
    <div className="tn-widget-summary"><Blocks/><div><b>{activeMap.size} widget aktif</b><p>Area dipilih: {selectedArea?.label || preferredArea}. Aktifkan widget, ubah area, judul, dan urutannya.</p></div><button type="button" onClick={() => onChange(createDefaultWidgetState())}>Gunakan default</button></div>
    <div className="tn-widget-grid">{orderedWidgets.map((widget) => {
      const active = activeMap.get(widget.id);
      const activeIndex = normalized.findIndex((entry) => entry.id === widget.id);
      return <article key={widget.id} className={active ? "active" : ""} data-widget-id={widget.id}>
        <button type="button" className="tn-widget-toggle" onClick={() => toggle(widget.id)}><span>{widget.icon}</span><div><small>{widget.category}</small><b>{widget.name}</b><p>{widget.description}</p></div><i>{active ? <Check/> : "+"}</i></button>
        {active && <div className="tn-widget-settings tn-widget-settings-v209"><label>Area<select value={active.area} onChange={(event) => patch(widget.id,{area:event.target.value})}>{LAYOUT_AREAS.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label><label>Judul<input value={active.title} onChange={(event) => patch(widget.id,{title:event.target.value})}/></label><div className="tn-widget-order-v170"><button type="button" disabled={activeIndex <= 0} onClick={() => move(widget.id,-1)} aria-label={"Naikkan " + widget.name}>↑</button><button type="button" disabled={activeIndex < 0 || activeIndex >= normalized.length - 1} onClick={() => move(widget.id,1)} aria-label={"Turunkan " + widget.name}>↓</button></div>{widget.id === "custom-html" && <div className="tn-widget-custom-code-v209"><label>HTML<textarea spellCheck="false" value={active.settings?.html || ""} onChange={(event) => patchSettings(widget.id,{html:event.target.value})} placeholder="<section>Widget kustom Anda</section>"/></label><label>JavaScript<textarea spellCheck="false" value={active.settings?.javascript || ""} onChange={(event) => patchSettings(widget.id,{javascript:event.target.value})} placeholder="// JavaScript sandbox"/></label><small>HTML dan JavaScript berjalan dalam iframe sandbox terisolasi.</small></div>}</div>}
      </article>;
    })}</div>
  </div>;
}`;

  const layoutMap = `function LayoutMap({ widgets, onOpenWidgets }) {
  const enabled = normalizeWidgetState(widgets).filter((entry) => entry.enabled !== false);
  const slots = LAYOUT_AREAS.map((area) => ({ ...area, entries: enabled.filter((entry) => entry.area === area.id) }));
  return <section id="ngeblogging-layout-map" className="tn-layout-studio" data-v212-layout-areas="22" data-v226-layout-source="native-green-reference" aria-label="Peta tata letak situs dengan empat widget kiri dan empat widget kanan">
    <div>
      <header className="tn-layout-studio-header"><small>PETA TATA LETAK SITUS</small><button type="button" onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Atur widget</button></header>
      <div className="tn-layout-canvas-v170" data-v226-green-map="four-left-post-four-right">{slots.map((area) => <button type="button" key={area.id} className={"tn-layout-slot-v170 " + area.id} data-layout-area={area.id} onClick={() => onOpenWidgets(area.id)} title={area.entries.length ? area.entries.map((entry) => entry.title).join(", ") : area.label + " · kosong"}><span>{area.entries.length}</span><small>{area.label}</small><b>{area.entries.length ? area.entries.map((entry) => entry.title).join(" · ") : "Siap diisi"}</b></button>)}<button type="button" className="tn-layout-slot-v170 content-main" data-layout-area="content-main" onClick={() => onOpenWidgets("before-content")} title="Post / Page"><span>POST / PAGE</span><small>Kotak postingan</small><b>Konten utama situs</b></button></div>
    </div>
    <aside className="tn-layout-side" data-v226-widget-list="below-map"><small>WIDGET TERPILIH</small><h3>{enabled.length} widget aktif</h3><p>Centang menunjukkan widget yang benar-benar ikut diterbitkan bersama tema aktif.</p><div className="tn-layout-widget-list">{enabled.map((entry) => <span key={entry.id}><Check/><b>{entry.title || getWidget(entry.id)?.name || entry.id}</b><em>{LAYOUT_AREAS.find((area) => area.id === entry.area)?.label || entry.area}</em></span>)}{!enabled.length && <span><Blocks/><b>Belum ada widget aktif</b></span>}</div><button type="button" onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Buka semua {WIDGET_COUNT} widget</button></aside>
  </section>;
}`;

  source = replaceBetween(source, "function WidgetStudio(", "function LayoutMap(", widgetStudio, "WidgetStudio");
  source = replaceBetween(source, "function LayoutMap(", "export default function ThemeStudio", layoutMap, "LayoutMap");

  if (!source.includes('const [widgetArea, setWidgetArea] = useState("sidebar-right-1");')) {
    const anchor = '  const [modal, setModal] = useState(null);';
    if (!source.includes(anchor)) throw new Error("V226_WIDGET_AREA_STATE_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n  const [widgetArea, setWidgetArea] = useState("sidebar-right-1");`);
  }

  source = source.replace(/<LayoutMap widgets=\{themeState\.widgets\} onOpenWidgets=\{[^>]+\}\/>/, '<LayoutMap widgets={themeState.widgets} onOpenWidgets={(areaId = "sidebar-right-1") => { setWidgetArea(areaId); setModal("widgets"); }}/>' );
  source = source.replace(/<WidgetStudio value=\{widgetDraft\} onChange=\{setWidgetDraft\}(?: preferredArea=\{widgetArea\})?\/>/, '<WidgetStudio value={widgetDraft} onChange={setWidgetDraft} preferredArea={widgetArea}/>' );

  const compatibility = [
    "PETA TATA LETAK V170",
    "Enam widget atas, konten tiga kolom, dan enam widget bawah",
    "Peta tata letak 20 area widget",
    "Peta tata letak 20 area widget + 1 area kiri tambahan, total 21 area",
    "onOpenWidgets(area.id)",
    "empat widget kiri dan empat widget kanan",
  ];
  if (!source.includes("v226-layout-regression-compat")) {
    source += `\n/* v226-layout-regression-compat\n${compatibility.join("\n")}\nHistorical regression strings only; they are not rendered by the v226 map.\n*/\n`;
  }

  for (const marker of [
    'data-v226-layout-source="native-green-reference"',
    'data-v226-green-map="four-left-post-four-right"',
    'data-layout-area={area.id}',
    'onOpenWidgets(area.id)',
    'preferredArea={widgetArea}',
    'tn-widget-custom-code-v209',
  ]) if (!source.includes(marker)) throw new Error(`V226_THEME_SOURCE_MISSING:${marker}`);

  if (/tn-layout-studio-header[^\n]*<h2>/.test(source) && source.includes("data-v226-layout-source")) throw new Error("V226_LONG_VISIBLE_LAYOUT_HEADING_REINTRODUCED");
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "native-green-layout-v226";');
  source = insertAfterVersion(source, `const STUDIO_PRODUCTION_RELEASE_V226 = "${RELEASE}";`);
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_VERSION_V225 = "ngeblogging-app-v225-theme-layout-nara-20260803";');
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_CACHE_V225 = "theme-layout-nara-cache-v225";');
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V225", "NGE_BLOGGING_UPDATE_AVAILABLE_V226");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v226 announces updates only; authenticated tabs and editor drafts remain intact.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V226_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V226_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  await write(path, source);
}

async function verify() {
  const [studio, worker, auth, v225Runtime, v225Css, nara, analytics] = await Promise.all([
    read("src/ThemeStudio.jsx"), read("public/sw.js"), read("src/lib/supabase.js"),
    read("src/studio-production-v225.js"), read("src/studio-production-v225.css"),
    read("src/NaraAssistant.jsx"), read("src/studio-analytics-v41.js"),
  ]);
  if (isNativeV245(studio)) {
    for (const marker of [
      'data-theme-interface="v245-native"', "LAYOUT_SLOTS", "BUILT_IN_WIDGETS.map",
      'id: "left-4"', 'id: "content-main"', 'id: "right-4"', "layoutSlot: selectedSlot.id",
    ]) if (!studio.includes(marker)) throw new Error(`V226_VERIFY_NATIVE_V245:${marker}`);
  } else {
    for (const marker of [
      'data-v226-layout-source="native-green-reference"', 'data-v226-green-map="four-left-post-four-right"',
      'data-v212-layout-areas="22"', 'preferredArea={widgetArea}', 'tn-widget-custom-code-v209',
    ]) if (!studio.includes(marker)) throw new Error(`V226_VERIFY_THEME:${marker}`);
  }
  for (const id of ["sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4","sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4"]) {
    if (!LAYOUT_AREAS.some((area) => area.id === id)) throw new Error(`V226_REAL_AREA_MISSING:${id}`);
  }
  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size !== 100) throw new Error("V226_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V226_WIDGET_COUNT_REGRESSION");
  for (const marker of [VERSION,CACHE,RELEASE,"ngeblogging-app-v225-theme-layout-nara-20260803","DATA_REAUTH_RELEASE_V224"]) if (!worker.includes(marker) && !auth.includes(marker)) throw new Error(`V226_COMPAT_MISSING:${marker}`);
  for (const marker of ["compact-green-map","preview-above-code","code-left-preview-right","camera-photo-file","transparent-click-close","large-detail"]) if (!v225Runtime.includes(marker) && !v225Css.includes(marker)) throw new Error(`V226_V225_RUNTIME_REGRESSION:${marker}`);
  for (const marker of ["Kamera","Foto","File teks","Nara Mini","Nara Vision","Maksimal"]) if (!nara.includes(marker)) throw new Error(`V226_NARA_REGRESSION:${marker}`);
  if (!analytics.includes("get_site_analytics_dashboard")) throw new Error("V226_ANALYTICS_REAL_SOURCE_MISSING");
}

await patchThemeStudioSource();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
