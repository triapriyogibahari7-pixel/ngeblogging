import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTHORITY = "theme-layout-v170-20260730";
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch v170 gagal: ${label} tidak ditemukan.`);
  return source.replace(search, replacement);
}
function replaceRegex(source, pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`Patch v170 gagal: ${label} tidak ditemukan.`);
  return next;
}

function patchWidgetSystem() {
  const file = "src/widget-system.js";
  let source = read(file);
  if (source.includes(`WIDGET_LAYOUT_AUTHORITY = "${AUTHORITY}"`)) return;
  const areas = `export const WIDGET_LAYOUT_AUTHORITY = "${AUTHORITY}";
export const LAYOUT_AREAS = [
  { id: "top-left-1", label: "Widget atas kiri 1", group: "top" },
  { id: "top-left-2", label: "Widget atas kiri 2", group: "top" },
  { id: "top-left-3", label: "Widget atas kiri 3", group: "top" },
  { id: "top-right-1", label: "Widget atas kanan 1", group: "top" },
  { id: "top-right-2", label: "Widget atas kanan 2", group: "top" },
  { id: "top-right-3", label: "Widget atas kanan 3", group: "top" },
  { id: "before-content", label: "Tepat di atas postingan", group: "content" },
  { id: "sidebar-left-1", label: "Sidebar kiri 1", group: "content" },
  { id: "sidebar-left-2", label: "Sidebar kiri 2", group: "content" },
  { id: "sidebar-left-3", label: "Sidebar kiri 3", group: "content" },
  { id: "sidebar-right-1", label: "Sidebar kanan 1", group: "content" },
  { id: "sidebar-right-2", label: "Sidebar kanan 2", group: "content" },
  { id: "sidebar-right-3", label: "Sidebar kanan 3", group: "content" },
  { id: "after-content", label: "Tepat di bawah postingan", group: "content" },
  { id: "bottom-left-1", label: "Widget bawah kiri 1", group: "bottom" },
  { id: "bottom-left-2", label: "Widget bawah kiri 2", group: "bottom" },
  { id: "bottom-left-3", label: "Widget bawah kiri 3", group: "bottom" },
  { id: "bottom-right-1", label: "Widget bawah kanan 1", group: "bottom" },
  { id: "bottom-right-2", label: "Widget bawah kanan 2", group: "bottom" },
  { id: "bottom-right-3", label: "Widget bawah kanan 3", group: "bottom" },
];
const LEGACY_AREA_MAP = {
  "header-left": "top-left-1", "header-right": "top-right-1", "below-header": "top-left-2",
  "sidebar-left": "sidebar-left-1", "sidebar-right": "sidebar-right-1",
  "footer-left": "bottom-left-1", "footer-right": "bottom-right-1", "footer-wide": "bottom-left-2",
  sidebar: "sidebar-right-1", footer: "bottom-left-1",
};
const VALID_AREAS = new Set([...LAYOUT_AREAS.map((area) => area.id), ...Object.keys(LEGACY_AREA_MAP)]);
const RENDER_GROUPS = {
  sidebar: new Set(LAYOUT_AREAS.filter((area) => area.id.startsWith("sidebar-")).map((area) => area.id)),
  "after-content": new Set(LAYOUT_AREAS.filter((area) => area.group === "top" || ["before-content", "after-content"].includes(area.id)).map((area) => area.id)),
  footer: new Set(LAYOUT_AREAS.filter((area) => area.group === "bottom").map((area) => area.id)),
};`;
  source = replaceRegex(source, /export const LAYOUT_AREAS = \[[\s\S]*?const RENDER_GROUPS = \{[\s\S]*?\n\};/, areas, "area widget lama");
  source = replaceRequired(source,
    `export function getLayoutArea(areaId) {\n  return LAYOUT_AREAS.find((area) => area.id === areaId) || null;\n}`,
    `export function getLayoutArea(areaId) {\n  const normalized = LEGACY_AREA_MAP[areaId] || areaId;\n  return LAYOUT_AREAS.find((area) => area.id === normalized) || null;\n}`,
    "getLayoutArea");
  source = replaceRequired(source, `  const defaults = ["sidebar-right", "sidebar-right", "sidebar-right", "footer-left"];`, `  const defaults = ["sidebar-right-1", "sidebar-right-2", "sidebar-left-1", "bottom-left-1"];`, "default widget");
  source = replaceRequired(source, `    area: defaults[index] || "sidebar-right",`, `    area: defaults[index] || "sidebar-right-1",`, "default area");
  source = replaceRequired(source,
    `    const area = VALID_AREAS.has(entry?.area) ? entry.area : "sidebar-right";`,
    `    const requestedArea = String(entry?.area || "");\n    const area = VALID_AREAS.has(requestedArea) ? (LEGACY_AREA_MAP[requestedArea] || requestedArea) : "sidebar-right-1";`,
    "normalisasi area");
  source = replaceRequired(source,
    `  const accepted = RENDER_GROUPS[renderGroup] || new Set([renderGroup]);`,
    `  const normalizedGroup = LEGACY_AREA_MAP[renderGroup] || renderGroup;\n  const accepted = RENDER_GROUPS[renderGroup] || new Set([normalizedGroup]);`,
    "render area");
  write(file, source);
}

function patchThemeSystem() {
  const file = "src/theme-system.js";
  let source = read(file);
  if (!source.includes('composeThemeLayoutV170')) {
    source = replaceRequired(source,
      `import { createDefaultWidgetState, normalizeWidgetState, widgetsMarkup } from "./widget-system.js";`,
      `import { createDefaultWidgetState, normalizeWidgetState, widgetsMarkup } from "./widget-system.js";\nimport { composeThemeLayoutV170 } from "./theme-layout-runtime-v170.js";`,
      "import runtime");
  }
  const build = `export function buildThemeSrcDoc(code, config = DEFAULT_THEME_CONFIG, widgets = []) {
  const safeScript = validString(code?.javascript, "", 120000).replace(/<\\/script/gi, "<\\\\/script");
  const sourceHtml = validString(code?.html, "", 350000);
  const layout = composeThemeLayoutV170(sourceHtml, widgets, widgetsMarkup);
  const css = validString(code?.css, "", 350000) + validString(config.customCss, "", 80000) + layout.css;
  const csp = "default-src 'none'; img-src https: data: blob:; media-src https: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src https: data:; connect-src https:; form-action https:; base-uri 'none'; frame-ancestors 'none'";
  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="' + csp + '"><style>html,body{margin:0;min-width:0;max-width:100%;min-height:100%;overflow-x:hidden;font-family:' + JSON.stringify(config.font || "DM Sans") + ',sans-serif}' + css + '</style></head><body data-theme-layout-authority="${AUTHORITY}">' + layout.html + '<script>' + safeScript + '<\\/script></body></html>';
}`;
  source = replaceRegex(source, /export function buildThemeSrcDoc\(code, config = DEFAULT_THEME_CONFIG, widgets = \[\]\) \{[\s\S]*?\n\}/, build, "buildThemeSrcDoc");
  write(file, source);
}

function patchThemeStudio() {
  const file = "src/ThemeStudio.jsx";
  let source = read(file);
  if (!source.includes("theme-layout-v170.css")) {
    source = replaceRequired(source,
      `import { BUILT_IN_WIDGETS, createDefaultWidgetState, getWidget, normalizeWidgetState, WIDGET_COUNT } from "./widget-system";`,
      `import { BUILT_IN_WIDGETS, createDefaultWidgetState, getWidget, LAYOUT_AREAS, normalizeWidgetState, WIDGET_COUNT } from "./widget-system";`,
      "import LAYOUT_AREAS");
    source = replaceRequired(source, `import "./theme-interface-v149.css";`, `import "./theme-interface-v149.css";\nimport "./theme-layout-v170.css";`, "import CSS");
  }
  const widgetStudio = `function WidgetStudio({ value, onChange }) {
  const normalized = normalizeWidgetState(value);
  const activeMap = new Map(normalized.map((entry) => [entry.id, entry]));
  const toggle = (widgetId) => {
    const existing = activeMap.get(widgetId);
    if (existing) onChange(value.filter((entry) => entry.id !== widgetId));
    else onChange([...value, { id: widgetId, enabled: true, area: "sidebar-right-1", order: value.length, title: getWidget(widgetId)?.name || widgetId, settings: {} }]);
  };
  const patch = (widgetId, changes) => onChange(value.map((entry) => entry.id === widgetId ? { ...entry, ...changes } : entry));
  const move = (widgetId, direction) => {
    const ordered = [...normalized];
    const index = ordered.findIndex((entry) => entry.id === widgetId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    onChange(ordered.map((entry, order) => ({ ...entry, order })));
  };
  return <div className="tn-widget-studio">
    <div className="tn-widget-summary"><Blocks/><div><b>{activeMap.size} widget aktif</b><p>Pilih widget, area rinci, judul, dan urutan. Preview semua perangkat ikut berubah.</p></div><button onClick={() => onChange(createDefaultWidgetState())}>Gunakan default</button></div>
    <div className="tn-widget-grid">{BUILT_IN_WIDGETS.map((widget) => {
      const active = activeMap.get(widget.id);
      const activeIndex = normalized.findIndex((entry) => entry.id === widget.id);
      return <article key={widget.id} className={active ? "active" : ""}>
        <button className="tn-widget-toggle" onClick={() => toggle(widget.id)}><span>{widget.icon}</span><div><small>{widget.category}</small><b>{widget.name}</b><p>{widget.description}</p></div><i>{active ? <Check/> : "+"}</i></button>
        {active && <div className="tn-widget-settings tn-widget-settings-v170"><label>Area<select value={active.area} onChange={(event) => patch(widget.id,{area:event.target.value})}>{LAYOUT_AREAS.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label><label>Judul<input value={active.title} onChange={(event) => patch(widget.id,{title:event.target.value})}/></label><div className="tn-widget-order-v170"><button type="button" disabled={activeIndex <= 0} onClick={() => move(widget.id,-1)} aria-label={"Naikkan " + widget.name}>↑</button><button type="button" disabled={activeIndex < 0 || activeIndex >= normalized.length - 1} onClick={() => move(widget.id,1)} aria-label={"Turunkan " + widget.name}>↓</button></div></div>}
      </article>;
    })}</div>
  </div>;
}`;
  const layoutMap = `function LayoutMap({ widgets, onOpenWidgets }) {
  const enabled = normalizeWidgetState(widgets).filter((entry) => entry.enabled !== false);
  const slots = LAYOUT_AREAS.map((area) => ({ ...area, entries: enabled.filter((entry) => entry.area === area.id) }));
  return <section className="tn-layout-studio" aria-label="Peta tata letak 20 area widget">
    <div>
      <header className="tn-layout-studio-header"><div><small>PETA TATA LETAK V170</small><h2>Enam widget atas, konten tiga kolom, dan enam widget bawah.</h2><p>Setiap kotak adalah area nyata pada aplikasi, handphone, mobile, perangkat kecil, tablet, laptop, desktop, dan komputer.</p></div><button onClick={onOpenWidgets}><Blocks/> Atur widget</button></header>
      <div className="tn-layout-canvas-v170">{slots.map((area) => <button key={area.id} className={"tn-layout-slot-v170 " + area.id} onClick={onOpenWidgets} title={area.entries.map((entry) => entry.title).join(", ") || area.label + " kosong"}><span>{area.entries.length}</span><small>{area.label}</small><b>{area.entries.length ? area.entries.map((entry) => entry.title).join(" · ") : "Siap diisi"}</b></button>)}<button className="tn-layout-slot-v170 content-main" onClick={onOpenWidgets}><span>POST</span><small>Konten utama</small><b>Post atau Page responsif</b></button></div>
    </div>
    <aside className="tn-layout-side"><small>WIDGET TERPILIH</small><h3>{enabled.length} widget aktif</h3><p>Centang menunjukkan widget yang benar-benar ikut diterbitkan.</p><div className="tn-layout-widget-list">{enabled.map((entry) => <span key={entry.id}><Check/><b>{entry.title || getWidget(entry.id)?.name || entry.id}</b><em>{LAYOUT_AREAS.find((area) => area.id === entry.area)?.label || entry.area}</em></span>)}{!enabled.length && <span><Blocks/><b>Belum ada widget aktif</b></span>}</div><button onClick={onOpenWidgets}><Blocks/> Buka semua {WIDGET_COUNT} widget</button></aside>
  </section>;
}`;
  source = replaceRegex(source, /function WidgetStudio\([\s\S]*?\n\}\n\nfunction LayoutMap/, widgetStudio + "\n\nfunction LayoutMap", "WidgetStudio");
  source = replaceRegex(source, /function LayoutMap\([\s\S]*?\n\}\n\nexport default function ThemeStudio/, layoutMap + "\n\nexport default function ThemeStudio", "LayoutMap");
  source = replaceRequired(source, `<div className="tn-studio" data-theme-interface="v149">`, `<div className="tn-studio" data-theme-interface="v149" data-theme-layout-authority="${AUTHORITY}">`, "authority root");
  write(file, source);
}

function patchStudio() {
  const file = "src/StudioNext.jsx";
  let source = read(file);
  if (!source.includes("studio-page-audit-v170.css")) {
    source = replaceRequired(source, `  Activity, BarChart3, BookOpen, Check, ChevronDown, Cloud, CloudOff,`, `  Activity, BarChart3, BookOpen, Check, ChevronDown, Cloud, CloudOff, Download,`, "ikon Download");
    source = replaceRequired(source, `import "./studio-recovery-v135.css";`, `import "./studio-recovery-v135.css";\nimport "./studio-page-audit-v170.css";`, "CSS audit");
  }
  source = replaceRequired(source, `  const [profile, setProfile] = useState(null);`, `  const [profile, setProfile] = useState(null);\n  const [profileMenu, setProfileMenu] = useState(false);`, "state menu profil");
  source = replaceRequired(source, `  const sequence = useRef(0);`, `  const sequence = useRef(0);\n  const profileMenuRef = useRef(null);`, "ref menu profil");
  source = replaceRequired(source, `  useEffect(() => () => clearTimeout(saveTimer.current), []);`, `  useEffect(() => () => clearTimeout(saveTimer.current), []);\n  useEffect(() => {\n    if (!profileMenu) return undefined;\n    const close = (event) => { if (event.key === "Escape" || !profileMenuRef.current?.contains(event.target)) setProfileMenu(false); };\n    document.addEventListener("keydown", close);\n    document.addEventListener("pointerdown", close);\n    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", close); };\n  }, [profileMenu]);`, "close menu profil");
  source = replaceRequired(source,
    `  const chooseView = (next) => { setView(next); setMobileSidebar(false); if (["posts", "pages"].includes(next)) setQuery(""); };`,
    `  const chooseView = (next) => { setView(next); setMobileSidebar(false); setProfileMenu(false); if (["posts", "pages"].includes(next)) setQuery(""); };\n  const installApp = () => { window.dispatchEvent(new CustomEvent("ngeblogging:request-install-app")); setProfileMenu(false); setToast("Permintaan pemasangan aplikasi dibuka"); };\n  const exitToLanding = async () => { setProfileMenu(false); setMobileSidebar(false); await onExit?.(); };`,
    "aksi profil");
  source = source.replace(`onClick={onExit}><LogOut/><span>Keluar</span>`, `onClick={exitToLanding}><LogOut/><span>Keluar</span>`);
  source = replaceRequired(source,
    `<button className="sn-avatar" onClick={() => chooseView("settings")} aria-label="Buka pengaturan profil">{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : initials}</button>`,
    `<div className="sn-profile-menu-wrap" ref={profileMenuRef}><button className="sn-avatar" onClick={() => setProfileMenu((open) => !open)} aria-label="Buka menu profil" aria-expanded={profileMenu}>{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : initials}</button>{profileMenu && <div className="sn-profile-dropdown" role="menu"><header><b>{displayName}</b><small>{user?.email || "Akun Ngeblogging"}</small></header><button role="menuitem" onClick={() => chooseView("settings")}><Users/> Profil</button><button role="menuitem" onClick={() => chooseView("settings")}><Settings/> Pengaturan</button><button role="menuitem" onClick={installApp}><Download/> Dapatkan aplikasi</button><button role="menuitem" className="danger" onClick={exitToLanding}><LogOut/> Keluar</button></div>}</div>`,
    "dropdown profil");
  source = replaceRequired(source, `<div className="sn-shell" data-ui-release="stable-v138"`, `<div className="sn-shell" data-page-audit="studio-page-audit-v170-20260730" data-ui-release="stable-v138"`, "audit root");
  write(file, source);
}

function patchLogout() {
  const file = "src/main.jsx";
  let source = read(file);
  if (source.includes("logout-landing-v170-20260730")) return;
  source = replaceRequired(source,
    `    setSession(null);\n    setStudio(false);`,
    `    setSession(null);\n    setStudio(false);\n    window.history.replaceState({ release: "logout-landing-v170-20260730" }, document.title, "/");\n    window.scrollTo({ top: 0, left: 0, behavior: "auto" });`,
    "logout landing");
  write(file, source);
}

function patchPwa() {
  const file = "src/pwa-runtime.js";
  let source = read(file);
  if (!source.includes("ngeblogging:request-install-app")) {
    source = replaceRequired(source, `window.addEventListener("beforeinstallprompt", (event) => {`, `window.addEventListener("ngeblogging:request-install-app", async () => {\n  if (standalone()) return;\n  const prompt = installPrompt;\n  if (!prompt) { ensureInstallButton(); return; }\n  await prompt.prompt();\n  await prompt.userChoice.catch(() => null);\n  installPrompt = null;\n  removeInstallButton();\n});\n\nwindow.addEventListener("beforeinstallprompt", (event) => {`, "event install");
  }
  write(file, source);
}

function patchServiceWorker() {
  const file = "public/sw.js";
  let source = read(file);
  if (source.includes("ngeblogging-app-v170-theme-layout-20260730")) return;
  source = source
    .replace('const VERSION = "ngeblogging-app-v169-first-site-20260730";', 'const VERSION = "ngeblogging-app-v170-theme-layout-20260730";\nconst FIRST_SITE_COMPAT_VERSION = "ngeblogging-app-v169-first-site-20260730";')
    .replace('const CACHE_RELEASE = "first-site-cache-v169";', 'const CACHE_RELEASE = "theme-layout-cache-v170";\nconst FIRST_SITE_COMPAT_RELEASE = "first-site-cache-v169";')
    .replace('const FORCE_REFRESH_VALUE = "first-site-v169";', 'const FORCE_REFRESH_VALUE = "theme-layout-v170";')
    .replace('service-worker-stale-shell-v169', 'service-worker-stale-shell-v170')
    .replace('version: VERSION,', 'version: VERSION,\n    firstSiteCompatVersion: FIRST_SITE_COMPAT_VERSION,')
    .replace('release: CACHE_RELEASE,', 'release: CACHE_RELEASE,\n    firstSiteCompatRelease: FIRST_SITE_COMPAT_RELEASE,')
    .replace('sitePolicyRelease: SITE_POLICY_RELEASE,', 'sitePolicyRelease: SITE_POLICY_RELEASE,\n    themeLayoutRelease: "theme-layout-v170-20260730",')
    .replace('NGE_BLOGGING_FORCE_RELOAD_V169', 'NGE_BLOGGING_FORCE_RELOAD_V170')
    .replace('service-worker-activated-first-site-v169', 'service-worker-activated-theme-layout-v170');
  write(file, source);
}

patchWidgetSystem();
patchThemeSystem();
patchThemeStudio();
patchStudio();
patchLogout();
patchPwa();
patchServiceWorker();
console.log(`[${AUTHORITY}] patch applied`);
