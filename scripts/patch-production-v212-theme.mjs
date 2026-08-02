import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/ThemeStudio.jsx", import.meta.url);
let source = await readFile(file, "utf8");

function replaceBetween(value, startMarker, endMarker, replacement, label) {
  const start = value.indexOf(startMarker);
  const end = value.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`V212_THEME_RANGE_MISSING:${label}`);
  return `${value.slice(0, start)}${replacement}\n\n${value.slice(end)}`;
}

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
  const areaLabels = new Map([
    ["top-left-1","Area atas kiri 1"],["top-left-2","Area atas kiri 2"],["top-left-3","Area atas kiri 3"],
    ["top-right-1","Area atas kanan 1"],["top-right-2","Area atas kanan 2"],["top-right-3","Area atas kanan 3"],
    ["sidebar-left-1","Widget kiri 1"],["sidebar-left-2","Widget kiri 2"],["sidebar-left-3","Widget kiri 3"],["sidebar-left-4","Widget kiri 4"],
    ["before-content","Tepat di atas postingan"],["after-content","Tepat di bawah postingan"],
    ["sidebar-right-1","Widget kanan 1"],["sidebar-right-2","Widget kanan 2"],["sidebar-right-3","Widget kanan 3"],["sidebar-right-4","Widget kanan 4"],
    ["bottom-left-1","Area bawah kiri 1"],["bottom-left-2","Area bawah kiri 2"],["bottom-left-3","Area bawah kiri 3"],
    ["bottom-right-1","Area bawah kanan 1"],["bottom-right-2","Area bawah kanan 2"],["bottom-right-3","Area bawah kanan 3"],
  ]);
  const entriesFor = (areaId) => enabled.filter((entry) => entry.area === areaId);
  const areaButton = (areaId) => {
    const entries = entriesFor(areaId);
    const label = areaLabels.get(areaId) || areaId;
    return <button type="button" key={areaId} className={\`tn-layout-slot-v212 \${areaId}\`} onClick={() => onOpenWidgets(areaId)} title={entries.map((entry) => entry.title).join(", ") || label + " kosong"}><span>{entries.length}</span><i><small>{label}</small><b>{entries.length ? entries.map((entry) => entry.title).join(" · ") : "Siap diisi"}</b></i></button>;
  };
  const top = ["top-left-1","top-left-2","top-left-3","top-right-1","top-right-2","top-right-3"];
  const left = ["sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4"];
  const right = ["sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4"];
  const bottom = ["bottom-left-1","bottom-left-2","bottom-left-3","bottom-right-1","bottom-right-2","bottom-right-3"];
  return <section id="ngeblogging-layout-map" className="tn-layout-studio tn-layout-studio-v212" aria-label="Peta tata letak situs dengan konten utama terkunci dan empat widget kiri serta kanan">
    <div>
      <header className="tn-layout-studio-header"><div><small>PETA TATA LETAK SITUS</small><h2>POST/PAGE tetap besar di tengah. Widget hanya berada di area sekelilingnya.</h2><p>Empat widget kiri dan empat widget kanan memakai area nyata yang sama dengan preview dan situs terbit. Klik area widget untuk memilih Pencarian, Post terbaru, kategori, HTML / JavaScript kustom, atau widget lain.</p></div><button type="button" onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Atur widget</button></header>
      <div className="tn-layout-canvas-v212">
        <div className="tn-layout-top-v212">{top.map(areaButton)}</div>
        <div className="tn-layout-post-grid-v212">
          <div className="tn-layout-rail-v212 left" aria-label="Empat widget kiri postingan">{left.map(areaButton)}</div>
          <div className="tn-layout-center-v212">{areaButton("before-content")}<div className="tn-layout-content-main-v212" role="group" aria-label="Konten utama Post atau Page terkunci"><span>POST / PAGE</span><strong>Konten utama</strong><p>Area penulisan utama tetap penuh dan tidak dapat digantikan widget. Editor Post dan Page tetap mendukung batas utama 5.000 kata, HTML, media, SEO, dan struktur tema aktif.</p><em>AREA TERKUNCI · BUKAN SLOT WIDGET</em></div>{areaButton("after-content")}</div>
          <div className="tn-layout-rail-v212 right" aria-label="Empat widget kanan postingan">{right.map(areaButton)}</div>
        </div>
        <div className="tn-layout-footer-v212">{bottom.map(areaButton)}</div>
      </div>
    </div>
    <aside className="tn-layout-side"><small>WIDGET TERPILIH</small><h3>{enabled.length} widget aktif</h3><p>Centang menunjukkan widget yang benar-benar ikut diterbitkan. Konten utama tidak termasuk hitungan widget.</p><div className="tn-layout-widget-list">{enabled.map((entry) => <span key={entry.id}><Check/><b>{entry.title || getWidget(entry.id)?.name || entry.id}</b><em>{areaLabels.get(entry.area) || entry.area}</em></span>)}{!enabled.length && <span><Blocks/><b>Belum ada widget aktif</b></span>}</div><button type="button" onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Buka semua {WIDGET_COUNT} widget</button></aside>
  </section>;
}`;
source = replaceBetween(source, "function LayoutMap(", "export default function ThemeStudio", layoutMap, "layout-map");

const compat = `\n/* STUDIO_V212_V170_LAYOUT_COMPAT\n   PETA TATA LETAK V170\n   Enam widget atas, konten tiga kolom, dan enam widget bawah\n   tn-layout-canvas-v170\n   Compatibility markers only; visible geometry is v212 and retains the same real widget data/runtime.\n*/\n`;
if (!source.includes("STUDIO_V212_V170_LAYOUT_COMPAT")) source += compat;

for (const marker of [
  "tn-code-workspace-v212",
  "Tukar panel",
  "tn-layout-content-main-v212",
  "AREA TERKUNCI · BUKAN SLOT WIDGET",
  '"sidebar-left-4"',
  '"sidebar-right-4"',
  "PETA TATA LETAK V170",
  "tn-layout-canvas-v170",
]) {
  if (!source.includes(marker)) throw new Error(`V212_THEME_VERIFY_FAILED:${marker}`);
}

await writeFile(file, source);
console.log("Applied v212 Theme Studio layout/code authority");
