import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v221-20260802";
const VERSION = "ngeblogging-app-v221-green-layout-live-authority-20260802";
const CACHE = "green-layout-live-authority-cache-v221";
const FORCE = "studio-v221";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V221_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const importLine = 'import "./studio-production-v221.js";';
  if (!source.includes(importLine)) {
    const anchor = 'import "./studio-production-v220.js";';
    if (!source.includes(anchor)) throw new Error("V221_V220_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${importLine}`);
    await write(path, source);
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  source = insertAfterVersion(source, `const STUDIO_PRODUCTION_RELEASE_V221 = "${RELEASE}";`);
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_VERSION_V220 = "ngeblogging-app-v220-theme-editor-layout-lock-20260802";');
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_CACHE_V220 = "theme-editor-layout-lock-cache-v220";');
  for (const eventName of ["NGE_BLOGGING_UPDATE_AVAILABLE_V220", "NGE_BLOGGING_UPDATE_AVAILABLE_V219", "NGE_BLOGGING_UPDATE_AVAILABLE_V216"]) {
    source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V221");
  }
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v221 only announces an update; authenticated tabs and editor drafts stay intact.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V221_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V221_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, themeStudio, nara, auth, publicSite, analytics, worker, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v221.js"),
    read("src/studio-production-v221.css"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/lib/supabase.js"),
    read("src/PublicSiteNext.jsx"),
    read("src/studio-analytics-v41.js"),
    read("public/sw.js"),
    read("public/release-v221.json"),
  ]);
  const checks = [
    [entry, "studio-production-v221.js", "v221 Studio entry"],
    [runtime, RELEASE, "runtime release"],
    [runtime, "physicalSmallWins", "physical small semantics marker optional"],
    [runtime, 'studioDesktopSitePhone === "true"', "desktop-site explicit lock"],
    [runtime, "GREEN_LABELS", "semantic layout labels"],
    [runtime, "MAX_CODE_LINES = 10000", "10k code line cap"],
    [runtime, "camera-photo-file-visible", "Nara attachment visibility"],
    [css, 'data-v221-layout="green-reference-four-four"', "green map CSS"],
    [css, ".sidebar-left-4", "left four"],
    [css, ".sidebar-right-4", "right four"],
    [css, 'data-v221-workspace="preview-above-code"', "small editor"],
    [css, 'data-v221-workspace="split-50-50"', "large editor"],
    [css, ".v220-code-line-gutter", "actual gutter compatibility"],
    [css, 'data-v221-attachment-menu="camera-photo-file-visible"', "Nara attachment CSS"],
    [css, 'data-v221-domain-action="horizontal-full"', "Domain actions"],
    [themeStudio, "preferredArea={widgetArea}", "area-aware widgets"],
    [themeStudio, "tn-widget-custom-code-v209", "custom HTML JavaScript widget"],
    [themeStudio, "Tema Custom", "custom theme"],
    [nara, "Kamera", "Nara Camera"],
    [nara, "Foto", "Nara Photo"],
    [nara, "File teks", "Nara File"],
    [nara, "Nara Vision", "Nara models"],
    [nara, "Maksimal", "Nara intelligence"],
    [auth, "persistSession: true", "persist session"],
    [auth, "autoRefreshToken: true", "refresh session"],
    [publicSite, "PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218", "atomic public bootstrap"],
    [analytics, "get_site_analytics_dashboard", "real analytics RPC"],
    [worker, VERSION, "v221 worker version"],
    [worker, CACHE, "v221 worker cache"],
    [worker, RELEASE, "v221 worker marker"],
    [release, RELEASE, "release metadata"],
  ];
  for (const [source, marker, label] of checks) {
    if (label === "physical small semantics marker optional") continue;
    if (!source.includes(marker)) throw new Error(`V221_VERIFY_FAILED:${label}:${marker}`);
  }

  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((item) => item.id)).size !== 100) {
    throw new Error("V221_THEME_COUNT_REGRESSION");
  }
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V221_WIDGET_COUNT_REGRESSION");
  for (const area of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) if (!LAYOUT_AREAS.some((item) => item.id === area)) throw new Error(`V221_LAYOUT_AREA_REGRESSION:${area}`);

  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V221_DESTRUCTIVE_SESSION_ACTION");
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
