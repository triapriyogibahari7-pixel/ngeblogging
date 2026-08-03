import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v222-20260803";
const VERSION = "ngeblogging-app-v222-green-map-code-nara-20260803";
const CACHE = "green-map-code-nara-cache-v222";
const FORCE = "studio-v222";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V222_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const importLine = 'import "./studio-production-v222.js";';
  if (!source.includes(importLine)) {
    const anchor = 'import "./studio-production-v210.js";';
    if (!source.includes(anchor)) throw new Error("V222_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${importLine}`);
    await write(path, source);
  }
}

async function patchThemeActions() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  if (source.includes("THEME_CODE_ACTIONS_V222")) return;

  // v209 already provides the real 4+4 map, preferred-area Widget Studio and
  // custom HTML/JavaScript widget. v222 only exposes the three code entry points
  // explicitly instead of hiding CSS/JS behind a single generic button.
  const marker = '<button onClick={() => setModal("preview")}><Eye/> Preview</button><button onClick={() => setModal("code")}><Code2/> Edit Kode</button>';
  const replacement = '<button onClick={() => setModal("preview")}><Eye/> Preview</button>{/* THEME_CODE_ACTIONS_V222 */}<button data-v222-code-tab="html" onClick={() => setModal("code")}><FileCode2/> Edit HTML</button><button data-v222-code-tab="css" onClick={() => setModal("code")}><Palette/> Edit CSS</button><button data-v222-code-tab="javascript" onClick={() => setModal("code")}><Code2/> Edit JavaScript</button>';
  if (source.includes(marker)) source = source.replace(marker, replacement);
  else {
    const fallback = '<button onClick={() => setModal("preview")}><Eye/> Preview</button>';
    if (!source.includes(fallback)) throw new Error("V222_THEME_COMMAND_ANCHOR_MISSING");
    source = source.replace(fallback, `${fallback}{/* THEME_CODE_ACTIONS_V222 */}`);
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  source = insertAfterVersion(source, `const STUDIO_PRODUCTION_RELEASE_V222 = "${RELEASE}";`);
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_VERSION_V216 = "ngeblogging-app-v216-theme-nara-layout-route-20260802";');
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_CACHE_V216 = "theme-nara-layout-route-cache-v216";');
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V216", "NGE_BLOGGING_UPDATE_AVAILABLE_V222");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v222 announces the update without forced navigation; login and drafts stay intact.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V222_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V222_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, themeStudio, nara, auth, analytics, publicSite, widgets, worker, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v222.js"),
    read("src/studio-production-v222.css"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/lib/supabase.js"),
    read("src/studio-analytics-v41.js"),
    read("src/PublicSiteNext.jsx"),
    read("src/widget-system.js"),
    read("public/sw.js"),
    read("public/release-v222.json"),
  ]);

  const checks = [
    [entry, "studio-production-v222.js", "direct Studio entry"],
    [runtime, RELEASE, "v222 runtime"],
    [runtime, "MAX_CODE_LINES = 10000", "10k line capability"],
    [runtime, "GREEN_LABELS", "green semantic map"],
    [runtime, "camera-photo-file", "Nara attachment menu"],
    [runtime, 'studioDesktopSitePhone === "true"', "desktop-site lock"],
    [css, 'data-v222-layout="green-reference"', "green map CSS"],
    [css, ".sidebar-left-4", "left fourth slot"],
    [css, ".sidebar-right-4", "right fourth slot"],
    [css, ".v222-code-line-gutter", "actual code gutter"],
    [css, 'data-v222-workspace', "responsive code workspace"],
    [css, 'data-v222-nara="nonmodal"', "Nara non-modal"],
    [themeStudio, "preferredArea={widgetArea}", "area-aware Widget Studio"],
    [themeStudio, "tn-widget-custom-code-v209", "custom HTML/JavaScript widget"],
    [themeStudio, "Tema Custom", "custom theme entry"],
    [themeStudio, "THEME_CODE_ACTIONS_V222", "explicit HTML CSS JS actions"],
    [nara, "Kamera", "Nara camera"],
    [nara, "Foto", "Nara photo"],
    [nara, "File teks", "Nara file"],
    [nara, "Nara Vision", "Nara model"],
    [nara, "Maksimal", "Nara intelligence"],
    [auth, "persistSession: true", "persist session"],
    [auth, "autoRefreshToken: true", "auto refresh"],
    [analytics, "get_site_analytics_dashboard", "real analytics RPC"],
    [publicSite, "PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218", "atomic single public bootstrap"],
    [widgets, 'id: "custom-html"', "custom widget retained"],
    [worker, VERSION, "v222 SW version"],
    [worker, CACHE, "v222 cache"],
    [worker, RELEASE, "v222 release marker"],
    [release, RELEASE, "release metadata"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V222_VERIFY_FAILED:${label}:${marker}`);
  }

  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size !== 100) throw new Error("V222_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V222_WIDGET_COUNT_REGRESSION");
  for (const areaId of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) if (!LAYOUT_AREAS.some((area) => area.id === areaId)) throw new Error(`V222_LAYOUT_AREA_REGRESSION:${areaId}`);

  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V222_DESTRUCTIVE_SESSION_ACTION");
}

await patchStudioEntry();
await patchThemeActions();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
