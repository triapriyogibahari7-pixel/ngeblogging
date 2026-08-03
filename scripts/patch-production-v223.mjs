import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v223-20260803";
const VERSION = "ngeblogging-app-v223-deterministic-theme-nara-20260803";
const CACHE = "deterministic-theme-nara-cache-v223";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V223_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`V223_RANGE_MISSING:${label}`);
  return `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const line = 'import "./studio-production-v223.js";';
  if (!source.includes(line)) {
    const anchors = [
      'import "./studio-production-v222-code-tabs.js";',
      'import "./studio-production-v222.js";',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("V223_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
    await write(path, source);
  }
}

async function patchLegacyThemeActionConflict() {
  const path = "src/studio-production-v209.js";
  let source = await read(path);
  if (source.includes("expanded-html-css-javascript-v223")) return;

  source = replaceRequired(
    source,
    '  const canonical = new Set([customize, layout, code, site].filter(Boolean));',
    '  const explicitCode = buttons.filter((node) => node.matches?.("[data-v222-code-tab]"));\n  const canonical = new Set([customize, layout, code, site, ...explicitCode].filter(Boolean));',
    "v209-canonical-set",
  );

  source = replaceRequired(
    source,
    '  canonicalButton(code, "Edit Kode", "code");\n  canonicalButton(site, "Lihat situs", "site");\n  hero.dataset.v209Actions = "exactly-four";',
    '  if (explicitCode.length) {\n    explicitCode.forEach((button) => {\n      const kind = button.dataset.v222CodeTab || "code";\n      const label = kind === "html" ? "Edit HTML" : kind === "css" ? "Edit CSS" : kind === "javascript" ? "Edit JavaScript" : "Edit Kode";\n      canonicalButton(button, label, `code-${kind}`);\n      button.dataset.v222CodeTab = kind;\n      button.dataset.v223ExpandedCodeAction = "true";\n    });\n  } else {\n    canonicalButton(code, "Edit Kode", "code");\n  }\n  canonicalButton(site, "Lihat situs", "site");\n  hero.dataset.v209Actions = explicitCode.length ? "expanded-html-css-javascript-v223" : "exactly-four";',
    "v209-code-actions",
  );

  await write(path, source);
}

async function patchThemeStudio() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);

  source = source.replace(
    '<header className="tn-layout-studio-header"><div><small>PETA TATA LETAK SITUS</small><h2>Header, area atas, empat widget kiri, konten utama, empat widget kanan, area bawah, dan footer.</h2><p>Tekan kotak untuk membuka pilihan widget langsung pada area itu. Struktur yang sama dipakai aplikasi, handphone, mobile, perangkat kecil, tablet, laptop, desktop, dan komputer.</p></div><button onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Atur widget</button></header>',
    '<header className="tn-layout-studio-header"><div><small>PETA TATA LETAK SITUS</small></div><button onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Atur widget</button></header>',
  );

  if (!source.includes("tn-code-editor-grid-v223")) {
    const reactCodeEditor = `const MAX_THEME_CODE_LINES_V223 = 10000;

function formatThemeHtmlV223(source) {
  const input = String(source || "").trim();
  if (!input) return input;
  const tokens = input.replace(/>\\s*</g, "><").replace(/></g, ">\\n<").split("\\n");
  let depth = 0;
  const voidTag = /^<(?:!doctype|area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\\b/i;
  return tokens.map((raw) => {
    const token = raw.trim();
    if (!token) return "";
    if (/^<\\//.test(token)) depth = Math.max(0, depth - 1);
    const line = "  ".repeat(depth) + token;
    if (/^<[^!/][^>]*>/.test(token) && !/^<.*<\\//.test(token) && !/\\/>$/.test(token) && !voidTag.test(token)) depth += 1;
    return line;
  }).filter(Boolean).join("\\n");
}

function formatThemeBracedV223(source) {
  const input = String(source || "").trim();
  if (!input) return input;
  let output = "", indent = 0, quote = "", escaped = false, lineComment = false, blockComment = false;
  const newline = () => {
    output = output.replace(/[ \\t]+$/g, "");
    if (!output.endsWith("\\n")) output += "\\n";
    output += "  ".repeat(Math.max(0, indent));
  };
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index], next = input[index + 1] || "";
    if (lineComment) { output += char; if (char === "\\n") { lineComment = false; output += "  ".repeat(indent); } continue; }
    if (blockComment) { output += char; if (char === "*" && next === "/") { output += next; index += 1; blockComment = false; } continue; }
    if (quote) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (["\\\"", "'", "\u0060"].includes(char)) { quote = char; output += char; continue; }
    if (char === "/" && next === "/") { lineComment = true; output += "//"; index += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; output += "/*"; index += 1; continue; }
    if (char === "{") { output += "{"; indent += 1; newline(); continue; }
    if (char === "}") { indent = Math.max(0, indent - 1); output = output.replace(/[ \\t]+$/g, ""); if (!output.endsWith("\\n")) newline(); output += "}"; if (next && ![";", ",", ")"].includes(next)) newline(); continue; }
    if (char === ";") { output += ";"; newline(); continue; }
    if (char === "\\n" || char === "\\r") { if (!output.endsWith("\\n")) newline(); continue; }
    output += char;
  }
  return output.trim();
}

function formatThemeSourceV223(kind, source) {
  return kind === "html" ? formatThemeHtmlV223(source) : formatThemeBracedV223(source);
}

function CodeEditor({ value, onChange, config, widgets, theme, device, onDeviceChange }) {
  const [tab, setTab] = useState("html");
  const gutterRef = useRef(null);
  const formattedOnce = useRef(new Set());
  const tabs = [{ id:"html",label:"HTML",icon:FileCode2 },{ id:"css",label:"CSS",icon:Palette },{ id:"javascript",label:"JavaScript",icon:Code2 }];
  const selectedDevice = deviceInfo(device);
  const source = String(value[tab] || "");
  const lineCount = Math.max(1, source.split("\\n").length);
  const shownLines = Math.min(MAX_THEME_CODE_LINES_V223, lineCount);
  const lineNumbers = useMemo(() => Array.from({ length: shownLines }, (_, index) => String(index + 1)).join("\\n"), [shownLines]);

  useEffect(() => {
    const raw = String(value[tab] || "");
    const rawLines = raw.split("\\n").length;
    const signature = tab + ":" + raw.length + ":" + raw.slice(0, 48);
    if (formattedOnce.current.has(signature) || raw.length <= 80 || rawLines > 4) return;
    formattedOnce.current.add(signature);
    const pretty = formatThemeSourceV223(tab, raw);
    if (pretty && pretty !== raw && pretty.split("\\n").length > rawLines) onChange({ ...value, [tab]: pretty });
  }, [tab]);

  const formatCurrent = () => {
    const pretty = formatThemeSourceV223(tab, source);
    if (pretty && pretty !== source) onChange({ ...value, [tab]: pretty });
  };

  return <div className="tn-code-workspace" data-v223-react-code-editor="true">
    <section className="tn-code-pane" data-v223-react-code-pane={tab}>
      <nav>{tabs.map(({id,label,icon:Icon}) => <button type="button" key={id} className={tab===id?"active":""} onClick={() => setTab(id)}><Icon/>{label}</button>)}</nav>
      <div className="tn-code-status"><span><ShieldCheck/> Sandbox aktif</span><span className="v223-code-metrics">{lineCount.toLocaleString("id-ID")} baris · {source.length.toLocaleString("id-ID")} karakter{lineCount > MAX_THEME_CODE_LINES_V223 ? " · kurangi " + (lineCount - MAX_THEME_CODE_LINES_V223).toLocaleString("id-ID") + " baris" : ""}</span><button type="button" className="v223-format-code" onClick={formatCurrent}>Rapikan kode</button></div>
      <div className="tn-code-editor-grid-v223">
        <pre ref={gutterRef} className="tn-code-line-gutter-v223" aria-hidden="true">{lineNumbers}</pre>
        <textarea aria-label={"Editor " + tab} value={source} onChange={(event) => onChange({ ...value, [tab]: event.target.value })} onScroll={(event) => { if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop; }} onKeyDown={(event) => { if (event.key !== "Tab") return; event.preventDefault(); const target = event.currentTarget; const start = target.selectionStart; const end = target.selectionEnd; const next = source.slice(0,start) + "  " + source.slice(end); onChange({ ...value, [tab]: next }); requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = start + 2; }); }} wrap="off" spellCheck="false" autoCapitalize="off" autoCorrect="off" />
      </div>
    </section>
    <section className="tn-code-preview-pane">
      <header><div><small>PREVIEW LANGSUNG</small><b>{selectedDevice.label} · {selectedDevice.width}px</b></div><DeviceSwitch value={device} onChange={onDeviceChange}/></header>
      <ThemeFrame theme={theme} code={value} config={config} widgets={widgets} device={device} title={"Pratinjau kode tema mode " + selectedDevice.label}/>
    </section>
  </div>;
}`;
    source = replaceBetween(source, "function CodeEditor(", "function WidgetStudio(", reactCodeEditor, "react-code-editor");
  }

  if (!source.includes("PETA TATA LETAK SITUS")) throw new Error("V223_THEME_MAP_MISSING");
  if (!source.includes("tn-code-editor-grid-v223") || !source.includes("tn-code-line-gutter-v223")) throw new Error("V223_REACT_CODE_EDITOR_MISSING");
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "studio-v223";');
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V223")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_PRODUCTION_RELEASE_V223 = "${RELEASE}";\n`);
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V222", "NGE_BLOGGING_UPDATE_AVAILABLE_V223");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V223_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V223_SESSION_DESTRUCTIVE_ACTION_FOUND");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, v209, themeStudio, widgets, themeCatalog, nara, auth, sw, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v223.js"),
    read("src/studio-production-v223.css"),
    read("src/studio-production-v209.js"),
    read("src/ThemeStudio.jsx"),
    read("src/widget-system.js"),
    read("src/theme-catalog.js"),
    read("src/NaraAssistant.jsx"),
    read("src/lib/supabase.js"),
    read("public/sw.js"),
    read("public/release-v223.json"),
  ]);

  const checks = [
    [entry, "studio-production-v223.js", "Studio v223 entry"],
    [runtime, RELEASE, "runtime release"],
    [runtime, "syntheticDesktopOnPhone", "desktop-site phone lock"],
    [runtime, "green-reference-deterministic", "green layout"],
    [runtime, "compact-four-left-four-right", "small layout topology"],
    [runtime, "camera-photo-file", "Nara plus menu"],
    [css, "code-left-preview-right", "large code split"],
    [css, "preview-above-code", "small code stack"],
    [css, "tn-code-line-gutter-v223", "actual code gutter contract"],
    [css, "nara-composer-tools", "compact Nara tools"],
    [v209, "expanded-html-css-javascript-v223", "legacy Theme action conflict removed"],
    [themeStudio, 'data-v222-code-tab="html"', "HTML action"],
    [themeStudio, 'data-v222-code-tab="css"', "CSS action"],
    [themeStudio, 'data-v222-code-tab="javascript"', "JavaScript action"],
    [themeStudio, "tn-code-editor-grid-v223", "React-owned code editor"],
    [themeStudio, "tn-code-line-gutter-v223", "React-owned actual line gutter"],
    [themeStudio, "formatThemeSourceV223", "code formatter"],
    [themeStudio, "preferredArea={widgetArea}", "layout click opens preferred widget area"],
    [themeStudio, "tn-widget-custom-code-v209", "custom HTML JavaScript widget"],
    [themeStudio, "Tema Custom", "custom theme"],
    [widgets, 'id: "sidebar-left-4"', "fourth left widget area"],
    [widgets, 'id: "sidebar-right-4"', "fourth right widget area"],
    [themeCatalog, "FAMILIES.flatMap", "real theme generation"],
    [themeCatalog, "COMPOSITIONS.map", "real theme composition generation"],
    [themeCatalog, "export const THEME_COUNT=BUILT_IN_THEMES.length", "theme count authority"],
    [nara, "Kamera", "Nara Camera"],
    [nara, "Foto", "Nara Photo"],
    [nara, "File teks", "Nara File"],
    [nara, "Nara Mini", "Nara models"],
    [nara, "Instan", "Nara intelligence"],
    [auth, "persistSession: true", "persist session"],
    [auth, "autoRefreshToken: true", "refresh session"],
    [sw, RELEASE, "service worker release"],
    [sw, VERSION, "service worker version"],
    [sw, CACHE, "service worker cache"],
    [release, RELEASE, "release artifact"],
  ];
  for (const [sourceText, marker, label] of checks) {
    if (!sourceText.includes(marker)) throw new Error(`V223_VERIFY_FAILED:${label}:${marker}`);
  }

  const familyCount = (themeCatalog.match(/\{ id:/g) || []).length;
  const compositionCount = (themeCatalog.match(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g) || []).length;
  if (familyCount < 20 || compositionCount < 5) throw new Error("V223_100_THEME_GENERATION_INCOMPLETE");
  if (familyCount * compositionCount < 100) throw new Error("V223_REAL_THEME_COUNT_BELOW_100");
  if (/900\s*(juta|miliar|million|billion)/i.test(release)) throw new Error("V223_UNSUPPORTED_CAPACITY_CLAIM");
}

await patchStudioEntry();
await patchLegacyThemeActionConflict();
await patchThemeStudio();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
