import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v234-screenshot-layout-sidebar-nara-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v234-screenshot-layout-sidebar-nara-20260803";
const ACTIVE_CACHE = "screenshot-layout-sidebar-nara-cache-v234";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V234_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const v232 = 'import "./studio-production-v232.js";';
  const v234 = 'import "./studio-production-v234.js";';
  if (!source.includes(v232)) throw new Error("V234_ENTRY_V232_MISSING");
  if (!source.includes(v234)) source = source.replace(v232, `${v232}\n${v234}`);
  if (source.indexOf("studio-production-v234.js") < source.indexOf("studio-production-v232.js")) throw new Error("V234_ENTRY_ORDER_INVALID");
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  for (const line of [
    `const ACTIVE_VERSION_V234 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V234 = "${ACTIVE_CACHE}";`,
    `const STUDIO_PRODUCTION_RELEASE_V234 = "${RELEASE}";`,
  ]) source = insertAfterVersion(source, line);

  const oldShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V233}-${ACTIVE_CACHE_RELEASE_V233}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const nextShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V234}-${ACTIVE_CACHE_RELEASE_V234}-${AUTH_HANDOFF_RELEASE}-shell`;';
  if (!source.includes(nextShell)) {
    if (!source.includes(oldShell)) throw new Error("V234_SHELL_V233_ANCHOR_MISSING");
    source = source.replace(oldShell, nextShell);
  }
  const oldAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V233}-${ACTIVE_CACHE_RELEASE_V233}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const nextAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V234}-${ACTIVE_CACHE_RELEASE_V234}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(nextAsset)) {
    if (!source.includes(oldAsset)) throw new Error("V234_ASSET_V233_ANCHOR_MISSING");
    source = source.replace(oldAsset, nextAsset);
  }

  source = source
    .replace("    version: ACTIVE_VERSION_V233,", "    version: ACTIVE_VERSION_V234,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V233,", "    release: ACTIVE_CACHE_RELEASE_V234,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V233", "NGE_BLOGGING_UPDATE_AVAILABLE_V234")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v234 announces a fresh UI shell without forced navigation or logout.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V234_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V234_DESTRUCTIVE_SW_ACTION");
  for (const marker of [ACTIVE_VERSION, ACTIVE_CACHE, RELEASE, nextShell, nextAsset]) if (!source.includes(marker)) throw new Error(`V234_SW_MARKER_MISSING:${marker}`);
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, release, nara, theme, analytics, auth] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v234.js"),
    read("src/studio-production-v234.css"),
    read("public/release-v234.json"),
    read("src/NaraAssistant.jsx"),
    read("src/ThemeStudio.jsx"),
    read("src/studio-analytics-v41.js"),
    read("src/lib/supabase.js"),
  ]);
  const checks = [
    [entry, "studio-production-v232.js"], [entry, "studio-production-v234.js"],
    [runtime, RELEASE], [runtime, "GRID_PLACEMENT"], [runtime, "content-main"],
    [runtime, "WIDGET_CHOICES"], [runtime, "HTML / JavaScript"], [runtime, "numberText"],
    [runtime, "camera-photo-file"], [runtime, "siteManagerTrigger"],
    [css, 'data-v234-family="large"'], [css, 'data-v234-family="small"'],
    [css, "v234-layout-popover"], [css, "code-left-preview-right"], [css, "preview-top-code-bottom"],
    [css, "v234-code-gutter"], [css, "nara-attachment-menu"], [css, "op41-line"],
    [nara, "Kamera"], [nara, "Foto"], [nara, "File teks"], [nara, "Tingkat kecerdasan"], [nara, "Model Nara"],
    [theme, "THEME_COUNT"], [analytics, "get_site_analytics_dashboard"],
    [auth, "persistSession: true"], [auth, "autoRefreshToken: true"], [auth, "DATA_TRANSPORT_RELEASE_V233"],
    [release, RELEASE],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V234_VERIFY_FAILED:${marker}`);
  if (entry.indexOf("studio-production-v234.js") < entry.indexOf("studio-production-v232.js")) throw new Error("V234_ENTRY_NOT_FINAL");
  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size !== 100) throw new Error("V234_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.length !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V234_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V234_DESTRUCTIVE_RUNTIME_ACTION");
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}; v233 data-session failover remains preserved while v234 owns screenshot UI geometry.`);
