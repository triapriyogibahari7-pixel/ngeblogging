import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v220-20260802";
const VERSION = "ngeblogging-app-v220-theme-editor-layout-lock-20260802";
const CACHE = "theme-editor-layout-lock-cache-v220";
const FORCE = "studio-v220";

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const importLine = 'import "./studio-production-v220.js";';
  if (!source.includes(importLine)) {
    const anchor = 'import "./studio-production-v219.js";';
    if (!source.includes(anchor)) throw new Error("V220_V219_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${importLine}`);
    await write(path, source);
  }
}

async function patchThemeMapCopy() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  if (!source.includes("THEME_LAYOUT_FUNCTIONAL_MAP_V220")) {
    const longHeader = '<header className="tn-layout-studio-header"><div><small>PETA TATA LETAK SITUS</small><h2>Header, area atas, empat widget kiri, konten utama, empat widget kanan, area bawah, dan footer.</h2><p>Tekan kotak untuk membuka pilihan widget langsung pada area itu. Struktur yang sama dipakai aplikasi, handphone, mobile, perangkat kecil, tablet, laptop, desktop, dan komputer.</p></div><button onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Atur widget</button></header>';
    const compactHeader = '<header className="tn-layout-studio-header" data-v220-layout-header="functional-only"><div><small>PETA TATA LETAK SITUS</small>{/* THEME_LAYOUT_FUNCTIONAL_MAP_V220 */}</div><button onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Atur widget</button></header>';
    if (source.includes(longHeader)) source = source.replace(longHeader, compactHeader);
    else {
      const marker = '<small>PETA TATA LETAK SITUS</small>';
      if (!source.includes(marker)) throw new Error("V220_LAYOUT_HEADER_MARKER_MISSING");
      source = source.replace(marker, `${marker}{/* THEME_LAYOUT_FUNCTIONAL_MAP_V220 */}`);
    }
    await write(path, source);
  }
}

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V220_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  source = insertAfterVersion(source, `const STUDIO_PRODUCTION_RELEASE_V220 = "${RELEASE}";`);
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_VERSION_V219 = "ngeblogging-app-v219-theme-blank-resilience-20260802";');
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_CACHE_V219 = "theme-blank-resilience-cache-v219";');
  for (const eventName of ["NGE_BLOGGING_UPDATE_AVAILABLE_V219", "NGE_BLOGGING_UPDATE_AVAILABLE_V218", "NGE_BLOGGING_UPDATE_AVAILABLE_V216"]) {
    source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V220");
  }
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v220 announces the update without forced navigation; session and editor state stay intact.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V220_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, themeStudio, runtime, css, nara, auth, publicSite, analytics, worker, release] = await Promise.all([
    read("src/Studio.jsx"), read("src/ThemeStudio.jsx"), read("src/studio-production-v220.js"),
    read("src/studio-production-v220.css"), read("src/NaraAssistant.jsx"), read("src/lib/supabase.js"),
    read("src/PublicSiteNext.jsx"), read("src/studio-analytics-v41.js"), read("public/sw.js"), read("public/release-v220.json"),
  ]);

  const checks = [
    [entry, "studio-production-v220.js", "v220 entry"],
    [themeStudio, "THEME_LAYOUT_FUNCTIONAL_MAP_V220", "functional layout map copy"],
    [themeStudio, "Tema Custom", "custom Theme"],
    [themeStudio, "preferredArea={widgetArea}", "area-aware widgets"],
    [themeStudio, "tn-widget-custom-code-v209", "custom HTML JavaScript widget"],
    [runtime, RELEASE, "runtime release"],
    [runtime, "MAX_CODE_LINES = 10000", "10k line cap"],
    [runtime, 'studioDesktopSitePhone === "true"', "desktop-site lock"],
    [runtime, "prettyCode", "minified code formatter"],
    [runtime, "v220-code-line-gutter", "real gutter"],
    [runtime, "camera-photo-file", "Nara attachment"],
    [css, 'data-v220-workspace="preview-above-code"', "small editor"],
    [css, 'data-v220-workspace="split-50-50"', "large 50:50 editor"],
    [css, "compact-denah-four-four", "compact denah"],
    [css, ".sidebar-left-4", "left slot four"],
    [css, ".sidebar-right-4", "right slot four"],
    [css, 'data-v220-attachment-menu="camera-photo-file"', "Nara menu CSS"],
    [css, 'data-v220-domain-action="horizontal-full"', "Domain horizontal actions"],
    [nara, "Kamera", "Nara Camera"], [nara, "Foto", "Nara Photo"], [nara, "File teks", "Nara File"],
    [nara, "Nara Vision", "Nara models"], [nara, "Maksimal", "Nara intelligence"],
    [auth, "persistSession: true", "persist session"], [auth, "autoRefreshToken: true", "refresh session"],
    [publicSite, "PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218", "public-site atomic bootstrap"],
    [analytics, "get_site_analytics_dashboard", "real analytics RPC"],
    [worker, VERSION, "v220 SW"], [worker, CACHE, "v220 cache"], [worker, RELEASE, "v220 release"],
    [release, RELEASE, "release metadata"],
  ];
  for (const [source, marker, label] of checks) if (!source.includes(marker)) throw new Error(`V220_VERIFY_FAILED:${label}:${marker}`);

  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((item) => item.id)).size !== 100) throw new Error("V220_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || !BUILT_IN_WIDGETS.some((item) => item.id === "custom-html")) throw new Error("V220_WIDGET_COUNT_REGRESSION");
  for (const area of ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]) {
    if (!LAYOUT_AREAS.some((item) => item.id === area)) throw new Error(`V220_LAYOUT_AREA_REGRESSION:${area}`);
  }
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V220_DESTRUCTIVE_SESSION_ACTION");
  if (/await refreshStaleWindow\(client, url\);/.test(worker)) throw new Error("V220_FORCED_NAVIGATION_AFTER_VERIFY");
}

await patchStudioEntry();
await patchThemeMapCopy();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}: desktop-site lock, readable code, real denah and Nara controls.`);
