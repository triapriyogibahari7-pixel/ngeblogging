import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);
const RELEASE = "theme-layout-v210-20260802";

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch v210 gagal: ${label} tidak ditemukan.`);
  return source.replace(search, replacement);
}

function patchWidgetSystem() {
  const file = "src/widget-system.js";
  let source = read(file);
  if (source.includes(`WIDGET_LAYOUT_V210 = "${RELEASE}"`)) return;
  if (!source.includes('WIDGET_LAYOUT_AUTHORITY = "theme-layout-v170-20260730"')) {
    throw new Error("Patch v210 harus dijalankan setelah theme layout v170.");
  }
  source = replaceOnce(
    source,
    'export const WIDGET_LAYOUT_AUTHORITY = "theme-layout-v170-20260730";',
    'export const WIDGET_LAYOUT_AUTHORITY = "theme-layout-v170-20260730";\nexport const WIDGET_LAYOUT_V210 = "theme-layout-v210-20260802";',
    "authority widget",
  );
  source = replaceOnce(
    source,
    '  { id: "sidebar-left-3", label: "Sidebar kiri 3", group: "content" },',
    '  { id: "sidebar-left-3", label: "Sidebar kiri 3", group: "content" },\n  { id: "sidebar-left-4", label: "Sidebar kiri 4", group: "content" },',
    "sidebar kiri keempat",
  );
  source = replaceOnce(
    source,
    '  { id: "sidebar-right-3", label: "Sidebar kanan 3", group: "content" },',
    '  { id: "sidebar-right-3", label: "Sidebar kanan 3", group: "content" },\n  { id: "sidebar-right-4", label: "Sidebar kanan 4", group: "content" },',
    "sidebar kanan keempat",
  );
  write(file, source);
}

function patchThemeStudio() {
  const file = "src/ThemeStudio.jsx";
  let source = read(file);
  if (source.includes(`data-theme-layout-v210="${RELEASE}"`)) return;
  if (!source.includes("tn-layout-canvas-v170")) throw new Error("ThemeStudio v170 belum terpasang.");

  source = replaceOnce(
    source,
    "function WidgetStudio({ value, onChange }) {",
    'function WidgetStudio({ value, onChange, initialArea = "sidebar-right-1" }) {',
    "signature WidgetStudio",
  );
  source = replaceOnce(
    source,
    'else onChange([...value, { id: widgetId, enabled: true, area: "sidebar-right-1", order: value.length, title: getWidget(widgetId)?.name || widgetId, settings: {} }]);',
    'else onChange([...value, { id: widgetId, enabled: true, area: LAYOUT_AREAS.some((area) => area.id === initialArea) ? initialArea : "sidebar-right-1", order: value.length, title: getWidget(widgetId)?.name || widgetId, settings: {} }]);',
    "area awal widget",
  );
  source = replaceOnce(
    source,
    '<label>Judul<input value={active.title} onChange={(event) => patch(widget.id,{title:event.target.value})}/></label><div className="tn-widget-order-v170">',
    '<label>Judul<input value={active.title} onChange={(event) => patch(widget.id,{title:event.target.value})}/></label>{widget.id === "custom-html" && <div className="tn-widget-code-v210"><label>HTML<textarea value={active.settings?.html || ""} onChange={(event) => patch(widget.id,{settings:{...active.settings,html:event.target.value}})} placeholder="<section>Widget kustom</section>" spellCheck="false"/></label><label>JavaScript<textarea value={active.settings?.javascript || ""} onChange={(event) => patch(widget.id,{settings:{...active.settings,javascript:event.target.value}})} placeholder="// JavaScript sandbox" spellCheck="false"/></label><small>HTML dan JavaScript dijalankan di iframe sandbox terisolasi. Kode tersimpan bersama tema.</small></div>}<div className="tn-widget-order-v170">',
    "editor custom HTML JavaScript",
  );
  source = source.replaceAll("onClick={onOpenWidgets} title={area.entries", "onClick={() => onOpenWidgets(area.id)} title={area.entries");
  source = source.replace(
    '<button className="tn-layout-slot-v170 content-main" onClick={onOpenWidgets}>',
    '<button className="tn-layout-slot-v170 content-main" onClick={() => onOpenWidgets("before-content")}>',
  );
  source = source.replace(
    "Enam widget atas, konten tiga kolom, dan enam widget bawah.",
    "Enam widget atas, empat widget kiri, konten utama, empat widget kanan, dan enam widget bawah.",
  );
  source = replaceOnce(
    source,
    '  const [modal, setModal] = useState(null);',
    '  const [modal, setModal] = useState(null);\n  const [widgetAreaV210, setWidgetAreaV210] = useState("sidebar-right-1");',
    "state area widget",
  );
  source = replaceOnce(
    source,
    '<LayoutMap widgets={themeState.widgets} onOpenWidgets={() => setModal("widgets")}/> ',
    '<LayoutMap widgets={themeState.widgets} onOpenWidgets={(area) => { setWidgetAreaV210(area || "sidebar-right-1"); setModal("widgets"); }}/> ',
    "pembuka layout map",
  );
  source = replaceOnce(
    source,
    '<WidgetStudio value={widgetDraft} onChange={setWidgetDraft}/>',
    '<WidgetStudio value={widgetDraft} onChange={setWidgetDraft} initialArea={widgetAreaV210}/>',
    "area WidgetStudio",
  );
  source = replaceOnce(
    source,
    '<div className="tn-studio" data-theme-interface="v149" data-theme-layout-authority="theme-layout-v170-20260730">',
    `<div className="tn-studio" data-theme-interface="v149" data-theme-layout-authority="theme-layout-v170-20260730" data-theme-layout-v210="${RELEASE}">`,
    "marker ThemeStudio",
  );
  write(file, source);
}

patchWidgetSystem();
patchThemeStudio();
console.log(`Applied ${RELEASE}`);
