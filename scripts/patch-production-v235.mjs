import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v235-interaction-map-nara-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v235-interaction-map-nara-20260803";
const ACTIVE_CACHE = "interaction-map-nara-cache-v235";
const NATIVE_V248_IMPORT = 'import "./studio-native-stability-v248.js";';

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V235_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const v234 = 'import "./studio-production-v234.js";';
  const v235 = 'import "./studio-production-v235.js";';
  const target = 'import "./studio-production-v235-widget-target.js";';
  const nativeV248 = source.includes(NATIVE_V248_IMPORT);

  if (!source.includes(v234)) throw new Error("V235_ENTRY_V234_MISSING");

  if (nativeV248) {
    // v248 intentionally retires v235's capture-phase click authority. Keep the
    // data/widget compatibility helper, but never re-enable the runtime that
    // intercepts n/avatar/Nara clicks with stopImmediatePropagation().
    source = source.replace(`${v235}\n`, "").replace(v235, "");
    if (!source.includes(target)) source = source.replace(v234, `${v234}\n${target}`);
  } else {
    if (!source.includes(v235)) source = source.replace(v234, `${v234}\n${v235}\n${target}`);
    else if (!source.includes(target)) source = source.replace(v235, `${v235}\n${target}`);
    if (source.indexOf("studio-production-v235.js") < source.indexOf("studio-production-v234.js")) throw new Error("V235_ENTRY_ORDER_INVALID");
  }

  if (nativeV248 && source.includes(v235)) throw new Error("V235_RETIRED_RUNTIME_REENABLED_UNDER_V248");
  await write(path, source);
}

function insertAreaAfterId(source, afterId, id, label) {
  if (source.includes(`id: "${id}"`)) return source;
  const pattern = new RegExp(`(^\\s*\\{\\s*id:\\s*"${afterId}"[^\\n]*\\n)`, "m");
  const match = source.match(pattern);
  if (!match) throw new Error(`V235_AREA_ANCHOR_MISSING:${afterId}`);
  const indent = match[1].match(/^(\s*)/)?.[1] || "  ";
  return source.replace(pattern, `$1${indent}{ id: "${id}", label: "${label}", group: "content" },\n`);
}

async function patchRealFourthAreas() {
  const widgetPath = "src/widget-system.js";
  let widgets = await read(widgetPath);
  widgets = insertAreaAfterId(widgets, "sidebar-left-3", "sidebar-left-4", "Sidebar kiri · kotak 4");
  widgets = insertAreaAfterId(widgets, "sidebar-right-3", "sidebar-right-4", "Sidebar kanan · kotak 4");
  if (!widgets.includes("v235: fourth sidebar areas are real editable areas")) {
    widgets += '\n/* v235: fourth sidebar areas are real editable areas, not screenshot-only decoration. */\n';
  }
  await write(widgetPath, widgets);

  const runtimePath = "src/theme-layout-runtime-v170.js";
  let runtime = await read(runtimePath);
  runtime = runtime.replace(
    /const LEFT_AREAS = \[([^\]]*)\];/,
    'const LEFT_AREAS = ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4"];',
  );
  runtime = runtime.replace(
    /const RIGHT_AREAS = \[([^\]]*)\];/,
    'const RIGHT_AREAS = ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"];',
  );
  runtime = runtime.replaceAll("Tiga area widget kiri postingan", "Empat area widget kiri postingan");
  runtime = runtime.replaceAll("Tiga area widget kanan postingan", "Empat area widget kanan postingan");
  for (const marker of ['"sidebar-left-4"', '"sidebar-right-4"', "Empat area widget kiri postingan", "Empat area widget kanan postingan"]) {
    if (!runtime.includes(marker)) throw new Error(`V235_LAYOUT_RUNTIME_MISSING:${marker}`);
  }
  await write(runtimePath, runtime);
}

async function patchCssSyntax() {
  const path = "src/studio-production-v235.css";
  let css = await read(path);
  css = css.replaceAll("!important!important", "!important");
  if (css.includes("!important!important")) throw new Error("V235_CSS_DOUBLE_IMPORTANT_REMAINS");
  await write(path, css);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  for (const line of [
    `const ACTIVE_VERSION_V235 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V235 = "${ACTIVE_CACHE}";`,
    `const STUDIO_PRODUCTION_RELEASE_V235 = "${RELEASE}";`,
  ]) source = insertAfterVersion(source, line);

  const oldShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V234}-${ACTIVE_CACHE_RELEASE_V234}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const nextShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V235}-${ACTIVE_CACHE_RELEASE_V235}-${AUTH_HANDOFF_RELEASE}-shell`;';
  if (!source.includes(nextShell)) {
    if (!source.includes(oldShell)) throw new Error("V235_SHELL_V234_ANCHOR_MISSING");
    source = source.replace(oldShell, nextShell);
  }
  const oldAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V234}-${ACTIVE_CACHE_RELEASE_V234}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const nextAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V235}-${ACTIVE_CACHE_RELEASE_V235}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(nextAsset)) {
    if (!source.includes(oldAsset)) throw new Error("V235_ASSET_V234_ANCHOR_MISSING");
    source = source.replace(oldAsset, nextAsset);
  }

  source = source
    .replace("    version: ACTIVE_VERSION_V234,", "    version: ACTIVE_VERSION_V235,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V234,", "    release: ACTIVE_CACHE_RELEASE_V235,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V234", "NGE_BLOGGING_UPDATE_AVAILABLE_V235")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v235 announces a fresh shell without forced navigation or logout.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V235_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V235_DESTRUCTIVE_SW_ACTION");
  for (const marker of [ACTIVE_VERSION, ACTIVE_CACHE, RELEASE, nextShell, nextAsset]) {
    if (!source.includes(marker)) throw new Error(`V235_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const [entry, runtime, helper, css, release, nara, theme, widgets, layoutRuntime, auth] = await Promise.all([
    read("src/Studio.jsx"), read("src/studio-production-v235.js"), read("src/studio-production-v235-widget-target.js"),
    read("src/studio-production-v235.css"), read("public/release-v235.json"), read("src/NaraAssistant.jsx"),
    read("src/ThemeStudio.jsx"), read("src/widget-system.js"), read("src/theme-layout-runtime-v170.js"), read("src/lib/supabase.js"),
  ]);
  const nativeV248 = entry.includes(NATIVE_V248_IMPORT);
  const checks = [
    [entry, "studio-production-v234.js"], [entry, "studio-production-v235-widget-target.js"],
    [runtime, RELEASE], [runtime, 'window.addEventListener("click"'], [runtime, "v235-nara-attachment-portal"],
    [runtime, "LEGACY_LAYOUT_LABEL"], [runtime, "MAX_CODE_LINES = 10000"], [runtime, "openProfileV178"],
    [helper, "setReactSelect"], [helper, "sidebar-right-4"],
    [css, 'data-v235-family="large"'], [css, 'data-v235-family="small"'], [css, "v235-layout-popover"],
    [css, "v235-code-gutter"], [css, "v235-nara-attachment-portal"],
    [nara, "Kamera"], [nara, "Foto"], [nara, "File teks"], [nara, "Tingkat kecerdasan"], [nara, "Model Nara"],
    [widgets, 'id: "sidebar-left-4"'], [widgets, 'id: "sidebar-right-4"'],
    [layoutRuntime, '"sidebar-left-4"'], [layoutRuntime, '"sidebar-right-4"'],
    [theme, "THEME_COUNT"], [auth, "persistSession: true"], [auth, "autoRefreshToken: true"],
    [release, RELEASE],
  ];
  if (nativeV248) checks.push([entry, NATIVE_V248_IMPORT]);
  else checks.push([entry, "studio-production-v235.js"]);
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V235_VERIFY_FAILED:${marker}`);

  if (nativeV248) {
    if (entry.includes('import "./studio-production-v235.js";')) throw new Error("V235_RETIRED_RUNTIME_PRESENT_UNDER_V248");
  } else if (entry.indexOf("studio-production-v235.js") < entry.indexOf("studio-production-v234.js")) {
    throw new Error("V235_ENTRY_NOT_FINAL");
  }

  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size !== 100) throw new Error("V235_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.length !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V235_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V235_DESTRUCTIVE_RUNTIME_ACTION");
}

await patchStudioEntry();
await patchRealFourthAreas();
await patchCssSyntax();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}; v235 data/layout/service-worker compatibility preserved${(await read("src/Studio.jsx")).includes(NATIVE_V248_IMPORT) ? " while v248 remains the active interaction authority" : " under the historical v235 interaction authority"}.`);