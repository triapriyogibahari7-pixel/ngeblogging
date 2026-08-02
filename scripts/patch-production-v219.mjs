import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v219-20260802";
const VERSION = "ngeblogging-app-v219-theme-blank-resilience-20260802";
const CACHE = "theme-blank-resilience-cache-v219";
const FORCE = "studio-v219";
const V218_VERSION = 'const STUDIO_PRODUCTION_COMPAT_VERSION_V218 = "ngeblogging-app-v218-public-single-load-20260802";';
const V218_CACHE = 'const STUDIO_PRODUCTION_COMPAT_CACHE_V218 = "public-single-load-cache-v218";';

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V219_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const importLine = 'import "./studio-production-v219.js";';
  if (!source.includes(importLine)) {
    const anchors = [
      'import "./studio-production-v216-layout-clean.css";',
      'import "./studio-production-v216.js";',
      'import "./studio-production-v210.js";',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("V219_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${importLine}`);
    await write(path, source);
  }
}

async function patchThemeLoading() {
  const path = "src/StudioNext.jsx";
  let source = await read(path);
  const boundaryImport = 'import ThemeStudioBoundary from "./ThemeStudioBoundary.jsx";';
  if (!source.includes(boundaryImport)) {
    const anchor = 'import NaraAssistant from "./NaraAssistant";';
    if (!source.includes(anchor)) throw new Error("V219_THEME_BOUNDARY_IMPORT_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${boundaryImport}`);
  }

  if (!source.includes("THEME_EAGER_BOUNDARY_V219")) {
    const candidates = [
      'const ThemeStudio = lazy(() => import("./ThemeStudio"));',
      'const ThemeStudio = lazy(() => import("./ThemeStudio.jsx"));',
    ];
    const target = candidates.find((candidate) => source.includes(candidate));
    if (!target) throw new Error("V219_THEME_LAZY_ANCHOR_MISSING");
    source = source.replace(target, 'const ThemeStudio = ThemeStudioBoundary; // THEME_EAGER_BOUNDARY_V219');
  }

  await write(path, source);
}

async function rotateServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  source = insertAfterVersion(source, V218_VERSION);
  source = insertAfterVersion(source, V218_CACHE);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V219")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_PRODUCTION_RELEASE_V219 = "${RELEASE}";\n`,
    );
  }
  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V218", "NGE_BLOGGING_UPDATE_AVAILABLE_V219")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V216", "NGE_BLOGGING_UPDATE_AVAILABLE_V219");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v219 announces the new Theme shell without forced navigation or logout.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V219_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V219_DESTRUCTIVE_SESSION_ACTION_FOUND_IN_SW");
  }
  await write(path, source);
}

async function verify() {
  const [entry, studioNext, boundary, runtime, css, v216Runtime, v216Css, themeStudio, nara, auth, widgets, publicSite, analytics, sw, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/StudioNext.jsx"),
    read("src/ThemeStudioBoundary.jsx"),
    read("src/studio-production-v219.js"),
    read("src/studio-production-v219.css"),
    read("src/studio-production-v216.js"),
    read("src/studio-production-v216.css"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/lib/supabase.js"),
    read("src/widget-system.js"),
    read("src/PublicSiteNext.jsx"),
    read("src/studio-analytics-v41.js"),
    read("public/sw.js"),
    read("public/release-v219.json"),
  ]);

  const checks = [
    [entry, "studio-production-v219.js", "Studio v219 final authority"],
    [studioNext, boundaryImportMarker(), "Theme eager boundary import"],
    [studioNext, "THEME_EAGER_BOUNDARY_V219", "Theme eager loading marker"],
    [boundary, "theme-studio-boundary-v219-20260802", "Theme render boundary"],
    [boundary, 'import ThemeStudio from "./ThemeStudio.jsx"', "Theme static import"],
    [boundary, "Tema belum dapat dirender", "non-blank Theme recovery"],
    [runtime, RELEASE, "v219 runtime"],
    [runtime, "MAX_CODE_LINES = 10000", "10k code line support"],
    [runtime, '"application"', "application family"],
    [runtime, '"phone"', "phone family"],
    [runtime, '"mobile"', "mobile family"],
    [runtime, '"compact"', "compact family"],
    [runtime, '"tablet"', "tablet family"],
    [runtime, '"desktop"', "desktop family"],
    [runtime, "camera-photo-file", "Nara attachment menu"],
    [css, 'data-v219-workspace="preview-above-code"', "small preview-above-code"],
    [css, 'data-v219-workspace="split-50-50"', "large code split"],
    [css, ".v219-code-line-gutter", "v219 line numbers"],
    [css, 'grid-area:sidebar-left-4', "fourth left layout slot"],
    [css, 'grid-area:sidebar-right-4', "fourth right layout slot"],
    [css, 'data-v219-attachment-menu="camera-photo-file"', "Nara attachment CSS"],
    [css, 'data-v219-domain-action="full-horizontal"', "Domain full horizontal actions"],
    [v216Runtime, "MAX_CODE_LINES = 10000", "v216 code authority preserved"],
    [v216Runtime, "preview-above-code", "v216 physical small layout preserved"],
    [v216Css, 'data-v216-workspace="split-50-50"', "v216 large split preserved"],
    [themeStudio, "Tema Custom", "custom Theme source retained"],
    [themeStudio, "preferredArea={widgetArea}", "area-aware Widget Studio retained"],
    [themeStudio, "tn-widget-custom-code-v209", "custom HTML/JavaScript editor retained"],
    [nara, "Kamera", "Nara Camera"],
    [nara, "Foto", "Nara Photo"],
    [nara, "File teks", "Nara File"],
    [nara, "Nara Vision", "Nara models"],
    [nara, "Maksimal", "Nara intelligence"],
    [auth, "persistSession: true", "persistent auth"],
    [auth, "autoRefreshToken: true", "auth refresh"],
    [widgets, 'id: "custom-html"', "custom HTML/JS widget"],
    [publicSite, "PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218", "single public load retained"],
    [analytics, "get_site_analytics_dashboard", "real analytics RPC"],
    [sw, VERSION, "v219 SW version"],
    [sw, CACHE, "v219 SW cache"],
    [sw, RELEASE, "v219 SW marker"],
    [sw, "ngeblogging-app-v218-public-single-load-20260802", "v218 compatibility"],
    [release, RELEASE, "v219 release metadata"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V219_VERIFY_FAILED:${label}:${marker}`);
  }

  if (studioNext.includes('lazy(() => import("./ThemeStudio"))') || studioNext.includes('lazy(() => import("./ThemeStudio.jsx"))')) {
    throw new Error("V219_THEME_LAZY_CHUNK_REMAINS");
  }
  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size !== 100) {
    throw new Error("V219_THEME_COUNT_REGRESSION");
  }
  if (WIDGET_COUNT !== 26 || !BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html")) {
    throw new Error("V219_WIDGET_COUNT_REGRESSION");
  }
  for (const source of [runtime, boundary]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
      throw new Error("V219_DESTRUCTIVE_SESSION_ACTION");
    }
  }
}

function boundaryImportMarker() {
  return 'import ThemeStudioBoundary from "./ThemeStudioBoundary.jsx";';
}

await patchStudioEntry();
await patchThemeLoading();
await rotateServiceWorker();
await verify();
console.log(`Applied ${RELEASE}; Theme is eager and has a non-blank recovery boundary.`);
