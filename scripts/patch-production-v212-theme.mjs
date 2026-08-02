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
for (const marker of ["tn-code-workspace-v212", "Tukar panel", "PREVIEW LANGSUNG", 'id:"html"', 'id:"css"', 'id:"javascript"']) {
  if (!source.includes(marker)) throw new Error(`V212_CODE_VERIFY_FAILED:${marker}`);
}
await writeFile(file, source);
console.log("Applied v212 Theme code-editor isolation");
