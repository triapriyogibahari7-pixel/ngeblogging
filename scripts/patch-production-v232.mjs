import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v232-react-sidebar-theme-nara-auth-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v232-react-sidebar-theme-nara-auth-20260803";
const ACTIVE_CACHE = "react-sidebar-theme-nara-auth-cache-v232";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V232_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const line = 'import "./studio-production-v232.js";';
  if (!source.includes(line)) {
    const anchor = 'import "./studio-production-v231.js";';
    if (!source.includes(anchor)) throw new Error("V232_STUDIO_ENTRY_V231_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
  }
  await write(path, source);
}

async function patchStudioFastGate() {
  const path = "src/StudioFastGate.jsx";
  let source = await read(path);
  if (!source.includes('"ngeblogging-active-site-snapshot-v232"')) {
    const anchor = "const SNAPSHOT_KEYS = [\n";
    if (!source.includes(anchor)) throw new Error("V232_FAST_GATE_SNAPSHOT_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}  "ngeblogging-active-site-snapshot-v232",\n  "ngeblogging-active-site-snapshot-v231",\n  "ngeblogging-active-site-snapshot-v230",\n`);
  }
  await write(path, source);
}

async function patchStudioNext() {
  const path = "src/StudioNext.jsx";
  let source = await read(path);

  source = source.replace(
    '  const [sidebar, setSidebar] = useState(true);',
    '  const [sidebar, setSidebar] = useState(() => { try { return localStorage.getItem("ngeblogging-studio-sidebar-open-v232") !== "false"; } catch { return true; } });',
  );

  if (!source.includes("sidebar-open-v232-persist")) {
    const anchor = '  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 3200); return () => clearTimeout(timer); }, [toast]);\n';
    if (!source.includes(anchor)) throw new Error("V232_STUDIO_NEXT_EFFECT_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}  useEffect(() => {\n    if (deviceMode !== "large") return;\n    try { localStorage.setItem("ngeblogging-studio-sidebar-open-v232", String(sidebar)); } catch { /* storage may be restricted */ }\n    document.documentElement.dataset.sidebarOpenV232Persist = String(sidebar);\n  }, [deviceMode, sidebar]);\n`);
  }

  const oldChoose = '  const chooseView = (next) => { setView(next); setMobileSidebar(false); if (["posts", "pages"].includes(next)) setQuery(""); };';
  const newChoose = '  const chooseView = (next) => { setView(next); setMobileSidebar(false); if (currentStudioDeviceMode() === "large") setSidebar(false); if (["posts", "pages"].includes(next)) setQuery(""); };';
  if (source.includes(oldChoose)) source = source.replace(oldChoose, newChoose);

  const oldLogo = '      <div className="sn-logo"><span className="sn-logo-mark" aria-label="n."><strong>n</strong><i>.</i></span><b>Ngeblogging</b><button className="sn-side-close" onClick={() => setMobileSidebar(false)} aria-label="Tutup menu"><X/></button></div>';
  const newLogo = '      <div className="sn-logo"><button type="button" className="sn-logo-mark" onClick={toggleSidebar} aria-label={deviceMode === "small" ? (mobileSidebar ? "Tutup menu Studio" : "Buka menu Studio") : (sidebar ? "Ciutkan menu Studio" : "Perluas menu Studio")} aria-expanded={deviceMode === "small" ? mobileSidebar : sidebar}><strong>n</strong><i>.</i></button><b>Ngeblogging</b></div>';
  if (source.includes(oldLogo)) source = source.replace(oldLogo, newLogo);

  await write(path, source);
}

async function patchNara() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);
  const oldClose = `  const closeNara = () => {\n    stopSpeech();\n    setOpen(false);\n  };`;
  const newClose = `  const closeNara = () => {\n    stopSpeech();\n    try { recognition.current?.stop?.(); } catch { /* microphone may already be stopped */ }\n    setListening(false);\n    setAttachmentMenu(false);\n    setOpen(false);\n  };`;
  if (source.includes(oldClose)) source = source.replace(oldClose, newClose);
  source = source.replace(
    '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">',
    '<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} aria-label="Nara AI Assistant">',
  );
  source = source.replace(
    '          <button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />',
    '          {size === "full" && <button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />}',
  );
  await write(path, source);
}

async function patchWidgetAreas() {
  const path = "src/widget-system.js";
  let source = await read(path);
  const areaStart = source.indexOf("export const LAYOUT_AREAS = [");
  const areaEnd = source.indexOf("];\n\nconst LEGACY_AREAS", areaStart);
  if (areaStart < 0 || areaEnd < 0) throw new Error("V232_WIDGET_LAYOUT_AREAS_ANCHOR_MISSING");
  const areas = `export const LAYOUT_AREAS = [\n  { id: "header-left-1", label: "Header kiri 1", group: "header" },\n  { id: "header-right-1", label: "Header kanan 1", group: "header" },\n  { id: "below-header", label: "Di bawah header", group: "header" },\n  { id: "header-left-2", label: "Header kiri 2", group: "header" },\n  { id: "header-right-2", label: "Header kanan 2", group: "header" },\n  { id: "top-wide", label: "Area atas panjang", group: "header" },\n  { id: "before-content", label: "Di atas postingan", group: "content" },\n  { id: "sidebar-left-1", label: "Sidebar kiri 1", group: "content" },\n  { id: "sidebar-left-2", label: "Sidebar kiri 2", group: "content" },\n  { id: "sidebar-left-3", label: "Sidebar kiri 3", group: "content" },\n  { id: "sidebar-left-4", label: "Sidebar kiri 4", group: "content" },\n  { id: "sidebar-right-1", label: "Sidebar kanan 1", group: "content" },\n  { id: "sidebar-right-2", label: "Sidebar kanan 2", group: "content" },\n  { id: "sidebar-right-3", label: "Sidebar kanan 3", group: "content" },\n  { id: "sidebar-right-4", label: "Sidebar kanan 4", group: "content" },\n  { id: "after-content", label: "Di bawah postingan", group: "content" },\n  { id: "footer-left-1", label: "Footer kiri 1", group: "footer" },\n  { id: "footer-right-1", label: "Footer kanan 1", group: "footer" },\n  { id: "footer-left-2", label: "Footer kiri 2", group: "footer" },\n  { id: "footer-right-2", label: "Footer kanan 2", group: "footer" },\n  { id: "footer-wide", label: "Footer panjang", group: "footer" },\n  { id: "copyright", label: "Copyright", group: "footer" },\n  // Compatibility areas remain valid for existing saved themes.\n  { id: "header-left", label: "Header kiri (lama)", group: "header" },\n  { id: "header-right", label: "Header kanan (lama)", group: "header" },\n  { id: "sidebar-left", label: "Sidebar kiri (lama)", group: "content" },\n  { id: "sidebar-right", label: "Sidebar kanan (lama)", group: "content" },\n  { id: "footer-left", label: "Footer kiri (lama)", group: "footer" },\n  { id: "footer-right", label: "Footer kanan (lama)", group: "footer" },\n];`;
  source = source.slice(0, areaStart) + areas + source.slice(areaEnd + 2);
  source = source.replace(
    'const defaults = ["sidebar-right", "sidebar-right", "sidebar-right", "footer-left"];',
    'const defaults = ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "footer-left-1"];',
  );
  source = source.replace(
    'const area = VALID_AREAS.has(entry?.area) ? entry.area : "sidebar-right";',
    'const area = VALID_AREAS.has(entry?.area) ? entry.area : "sidebar-right-1";',
  );
  source = source.replace(
    'sidebar: new Set(["sidebar", "sidebar-left", "sidebar-right"]),',
    'sidebar: new Set(["sidebar", "sidebar-left", "sidebar-right", "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]),',
  );
  source = source.replace(
    '"after-content": new Set(["header-left", "header-right", "below-header", "before-content", "after-content"]),',
    '"after-content": new Set(["header-left", "header-right", "header-left-1", "header-right-1", "header-left-2", "header-right-2", "below-header", "top-wide", "before-content", "after-content"]),',
  );
  source = source.replace(
    'footer: new Set(["footer", "footer-left", "footer-right", "footer-wide"]),',
    'footer: new Set(["footer", "footer-left", "footer-right", "footer-left-1", "footer-right-1", "footer-left-2", "footer-right-2", "footer-wide", "copyright"]),',
  );
  await write(path, source);
}

async function patchThemeStudio() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  source = source.replace(
    'import { BUILT_IN_WIDGETS, createDefaultWidgetState, getWidget, normalizeWidgetState, WIDGET_COUNT } from "./widget-system";',
    'import { BUILT_IN_WIDGETS, LAYOUT_AREAS, createDefaultWidgetState, getWidget, normalizeWidgetState, WIDGET_COUNT } from "./widget-system";',
  );
  source = source.replace(
    'else onChange([...value, { id: widgetId, enabled: true, area: "sidebar", order: value.length, title: getWidget(widgetId)?.name || widgetId, settings: {} }]);',
    'else onChange([...value, { id: widgetId, enabled: true, area: "sidebar-right-1", order: value.length, title: getWidget(widgetId)?.name || widgetId, settings: {} }]);',
  );
  source = source.replace(
    '<option value="sidebar">Sidebar</option><option value="after-content">Setelah konten</option><option value="footer">Footer</option>',
    '{LAYOUT_AREAS.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}',
  );

  const oldHeroCode = '<button onClick={() => setModal("code")}><Code2/> Edit HTML</button>';
  const newHeroCode = '<button data-v222-code-tab="html" onClick={() => setModal("code")}><FileCode2/> Edit HTML</button><button data-v222-code-tab="css" onClick={() => setModal("code")}><Palette/> Edit CSS</button><button data-v222-code-tab="javascript" onClick={() => setModal("code")}><Code2/> Edit JavaScript</button>';
  source = source.replace(oldHeroCode, newHeroCode);
  source = source.replace(oldHeroCode, newHeroCode);

  const start = source.indexOf("function LayoutMap({ widgets, onOpenWidgets }) {");
  const end = source.indexOf("\n\nexport default function ThemeStudio", start);
  if (start < 0 || end < 0) throw new Error("V232_THEME_LAYOUT_MAP_ANCHOR_MISSING");
  const layoutMap = `function LayoutMap({ widgets, onOpenWidgets }) {\n  const enabled = normalizeWidgetState(widgets).filter((entry) => entry.enabled !== false);\n  const count = (area) => enabled.filter((entry) => entry.area === area).length;\n  const slots = [\n    ["header-left-1","Header kiri · 1"],["header-right-1","Header kanan · 1"],["below-header","Di bawah header"],\n    ["header-left-2","Header kiri · 2"],["header-right-2","Header kanan · 2"],["top-wide","Area atas"],\n    ["before-content","Di atas postingan"],\n    ["sidebar-left-1","Kiri · 1"],["sidebar-left-2","Kiri · 2"],["sidebar-left-3","Kiri · 3"],["sidebar-left-4","Kiri · 4"],\n    ["sidebar-right-1","Kanan · 1"],["sidebar-right-2","Kanan · 2"],["sidebar-right-3","Kanan · 3"],["sidebar-right-4","Kanan · 4"],\n    ["after-content","Di bawah postingan"],\n    ["footer-left-1","Footer kiri · 1"],["footer-right-1","Footer kanan · 1"],["footer-left-2","Footer kiri · 2"],["footer-right-2","Footer kanan · 2"],\n    ["footer-wide","Footer panjang"],["copyright","Copyright"],\n  ];\n  return <section id="ngeblogging-layout-map" className="tn-layout-studio" data-v232-native-map="interactive-4-left-4-right" aria-label="Peta tata letak dan widget">\n    <div>\n      <header className="tn-layout-studio-header"><div><small>PETA TATA LETAK</small></div><button onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Atur widget</button></header>\n      <div className="tn-layout-canvas-v170" data-layout-map="green-reference">\n        {slots.map(([area,label]) => <button key={area} className={\`tn-layout-slot-v170 \\${area}\`} onClick={() => onOpenWidgets(area)} aria-label={\`\\${label}. \\${count(area)} widget aktif. Klik untuk mengatur.\`}><span>{count(area)}</span><small>{label}</small><b>{count(area) ? \`\\${count(area)} widget aktif\` : "Kosong"}</b></button>)}\n        <button className="content-main" onClick={() => onOpenWidgets("before-content")} aria-label="Konten utama. Klik untuk mengatur widget sekitar konten."><small>AREA UTAMA</small><strong>Post / Page</strong><b>Konten utama</b></button>\n      </div>\n    </div>\n    <aside className="tn-layout-side"><small>WIDGET AKTIF</small><h3>{enabled.length} dari {WIDGET_COUNT} widget</h3><p>Klik kotak pada denah, lalu pilih widget dan area yang sesuai. HTML / JavaScript tetap tersedia sebagai widget terakhir.</p><div className="tn-layout-widget-list">{enabled.map((entry) => <span key={entry.id}><Check/><b>{entry.title || getWidget(entry.id)?.name || entry.id}</b><em>{entry.area}</em></span>)}{!enabled.length && <span><Blocks/><b>Belum ada widget aktif</b></span>}</div><button onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Buka semua {WIDGET_COUNT} widget</button></aside>\n  </section>;\n}`;
  source = source.slice(0, start) + layoutMap + source.slice(end);

  source = source.replace(
    '<LayoutMap widgets={themeState.widgets} onOpenWidgets={() => setModal("widgets")}/>',
    '<LayoutMap widgets={themeState.widgets} onOpenWidgets={(area) => { document.documentElement.dataset.themeTargetAreaV232 = area || "sidebar-right-1"; setModal("widgets"); }}/>',
  );
  await write(path, source);
}

async function patchOnboardingGate() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);
  if (!source.includes("ACTIVE_SITE_SNAPSHOT_V232")) {
    source = source.replace(
      'const STARTUP_RETRY_DELAYS = [450, 900, 1_800];',
      'const STARTUP_RETRY_DELAYS = [250, 650, 1_200];\nconst ACTIVE_SITE_SNAPSHOT_V232 = "ngeblogging-active-site-snapshot-v232";\nconst LEGACY_SITE_SNAPSHOTS_V232 = ["ngeblogging-active-site-snapshot-v231","ngeblogging-active-site-snapshot-v230","ngeblogging-active-site-snapshot-v229","ngeblogging-active-site-snapshot-v210","ngeblogging-active-site-snapshot-v209"];',
    );
  }

  const start = source.indexOf("async function loadStudioMembership(userId) {");
  const end = source.indexOf("\n\nfunction preferredSite", start);
  if (start < 0 || end < 0) throw new Error("V232_ONBOARDING_MEMBERSHIP_ANCHOR_MISSING");
  const replacement = `function cachedSiteV232() {\n  const candidates = [window.__ngebloggingActiveSite];\n  try {\n    candidates.push(JSON.parse(localStorage.getItem(ACTIVE_SITE_SNAPSHOT_V232) || "null"));\n    for (const key of LEGACY_SITE_SNAPSHOTS_V232) candidates.push(JSON.parse(localStorage.getItem(key) || "null"));\n  } catch { /* hardened storage */ }\n  return candidates.find((site) => site?.id && site?.slug) || null;\n}\n\nasync function loadStudioMembership(userId) {\n  let lastError = null;\n  for (let attempt = 0; attempt <= STARTUP_RETRY_DELAYS.length; attempt += 1) {\n    try {\n      let verified;\n      try {\n        verified = await withDeadline(getVerifiedSession(), 6_500, "Verifikasi sesi melewati batas waktu.");\n      } catch (sessionError) {\n        if (isSessionReauthError(sessionError) || !isTransientStudioError(sessionError)) throw sessionError;\n        const local = await withDeadline(supabase.auth.getSession(), 4_500, "Pembacaan sesi lokal melewati batas waktu.");\n        if (local.error) throw local.error;\n        const localUser = local.data?.session?.user;\n        if (!localUser?.id && !userId) throw sessionError;\n        verified = { session: local.data?.session || null, user: localUser || { id: userId }, verification: "local-session-fallback-v232" };\n      }\n      const memberUserId = verified?.user?.id || userId;\n      if (!memberUserId) throw Object.assign(new Error("Sesi sudah berakhir. Silakan masuk kembali."), { code: "SESSION_REAUTH_REQUIRED", status: 401 });\n      const sites = await withDeadline(listUserSites(memberUserId), 9_000, "Pemeriksaan situs melewati batas waktu.");\n      return { verified, sites };\n    } catch (error) {\n      if (isSessionReauthError(error) || !isTransientStudioError(error)) throw error;\n      lastError = error;\n      if (attempt < STARTUP_RETRY_DELAYS.length) await sleep(STARTUP_RETRY_DELAYS[attempt]);\n    }\n  }\n  const cached = cachedSiteV232();\n  if (cached) return { verified: window.__ngebloggingVerifiedSession || { user: { id: userId }, verification: "cached-site-v232" }, sites: [cached], degraded: true };\n  throw Object.assign(new Error(\n    "Koneksi data Studio belum stabil. Sesi akun tetap tersimpan; Studio tidak melakukan logout otomatis. Tekan Coba lagi setelah jaringan tersedia.",\n  ), { name: "DataTransportError", code: "DATA_NETWORK_UNAVAILABLE", cause: lastError });\n}`;
  source = source.slice(0, start) + replacement + source.slice(end);

  const publishAnchor = '  window.__ngebloggingActiveSite = site;\n';
  if (source.includes(publishAnchor) && !source.includes("localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V232")) {
    source = source.replace(publishAnchor, `${publishAnchor}  try { localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V232, JSON.stringify(site)); } catch { /* storage may be restricted */ }\n`);
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  const lines = [
    `const ACTIVE_VERSION_V232 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V232 = "${ACTIVE_CACHE}";`,
    `const STUDIO_PRODUCTION_RELEASE_V232 = "${RELEASE}";`,
  ];
  for (const line of lines) source = insertAfterVersion(source, line);
  const shell231 = 'const SHELL_CACHE = `${ACTIVE_VERSION_V231}-${ACTIVE_CACHE_RELEASE_V231}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const shell232 = 'const SHELL_CACHE = `${ACTIVE_VERSION_V232}-${ACTIVE_CACHE_RELEASE_V232}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const asset231 = 'const ASSET_CACHE = `${ACTIVE_VERSION_V231}-${ACTIVE_CACHE_RELEASE_V231}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const asset232 = 'const ASSET_CACHE = `${ACTIVE_VERSION_V232}-${ACTIVE_CACHE_RELEASE_V232}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(shell232)) {
    if (!source.includes(shell231)) throw new Error("V232_SW_SHELL_V231_ANCHOR_MISSING");
    source = source.replace(shell231, shell232);
  }
  if (!source.includes(asset232)) {
    if (!source.includes(asset231)) throw new Error("V232_SW_ASSET_V231_ANCHOR_MISSING");
    source = source.replace(asset231, asset232);
  }
  source = source
    .replace("    version: ACTIVE_VERSION_V231,", "    version: ACTIVE_VERSION_V232,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V231,", "    release: ACTIVE_CACHE_RELEASE_V232,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V231", "NGE_BLOGGING_UPDATE_AVAILABLE_V232");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V232_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V232_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  await write(path, source);
}

async function verify() {
  const [entry,runtime,css,studio,next,nara,theme,widgets,auth,release] = await Promise.all([
    read("src/Studio.jsx"), read("src/studio-production-v232.js"), read("src/studio-production-v232.css"),
    read("src/StudioOnboardingGate.jsx"), read("src/StudioNext.jsx"), read("src/NaraAssistant.jsx"),
    read("src/ThemeStudio.jsx"), read("src/widget-system.js"), read("src/lib/supabase.js"), read("public/release-v232.json"),
  ]);
  const checks = [
    [entry,"studio-production-v232.js"],[runtime,RELEASE],[runtime,"five-action-dropdown"],[runtime,"compact-under-create"],
    [css,'data-v232-family="large"'],[css,'data-v232-family="small"'],[css,"nara-attachment-menu"],[css,"tn-code-workspace"],
    [studio,"ACTIVE_SITE_SNAPSHOT_V232"],[studio,"local-session-fallback-v232"],[next,"ngeblogging-studio-sidebar-open-v232"],
    [next,"onClick={toggleSidebar}"],[nara,'aria-modal={size === "full"}'],[nara,"setAttachmentMenu(false)"],
    [theme,'data-v222-code-tab="css"'],[theme,'data-v222-code-tab="javascript"'],[theme,"sidebar-left-4"],[theme,"sidebar-right-4"],
    [widgets,'sidebar-left-4'],[widgets,'sidebar-right-4'],[widgets,'custom-html'],[auth,"persistSession: true"],[auth,"autoRefreshToken: true"],[release,RELEASE],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V232_VERIFY_FAILED:${marker}`);
  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size !== 100) throw new Error("V232_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.length !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V232_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V232_DESTRUCTIVE_RUNTIME_SESSION_ACTION");
}

await patchStudioEntry();
await patchStudioFastGate();
await patchStudioNext();
await patchNara();
await patchWidgetAreas();
await patchThemeStudio();
await patchOnboardingGate();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}; v231 remains compatibility authority and v232 owns React-backed sidebar, startup resilience, Theme slots and Nara interaction geometry.`);
