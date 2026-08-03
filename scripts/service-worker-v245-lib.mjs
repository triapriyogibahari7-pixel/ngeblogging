import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "theme-native-map-code-v245-20260803";
export const VERSION = "ngeblogging-app-v245-theme-native-20260803";
export const CACHE = "theme-native-map-code-cache-v245";

const read = (path) => readFileSync(resolve(path), "utf8");

function verifyThemeSource() {
  const studio = read("src/ThemeStudio.jsx");
  const css = read("src/theme-native-v245.css");
  const widgets = read("src/widget-system.js");
  const catalog = read("src/theme-catalog.js");
  const release = read("public/release-v245.json");
  const v244 = read("src/studio-stable-shell-v244.js");

  for (const marker of [
    'data-theme-interface="v245-native"',
    "theme-native-v245.css",
    'id: "left-1"', 'id: "left-2"', 'id: "left-3"', 'id: "left-4"',
    'id: "content-main"',
    'id: "right-1"', 'id: "right-2"', 'id: "right-3"', 'id: "right-4"',
    "function CodeSurface",
    "Math.min(10_000, actualLines)",
    'data-max-lines="10000"',
    "BUILT_IN_WIDGETS.map",
    "saveThemeWidgets",
  ]) if (!studio.includes(marker)) throw new Error(`V245_THEME_SOURCE_MISSING:${marker}`);

  for (const marker of [
    ".tn-native-layout-map",
    'grid-template-areas:\n    "header header header"',
    '"left content right"',
    ".tn-native-layout-popover",
    "width:min(420px,calc(100vw - 22px))!important",
    ".tn-native-code-workspace-v245",
    'grid-template-areas:"code preview"!important',
    'grid-template-areas:"preview" "code"!important',
    ".tn-native-line-gutter",
    "overflow-x:auto!important",
  ]) if (!css.includes(marker)) throw new Error(`V245_THEME_CSS_MISSING:${marker}`);

  const widgetCount = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  if (widgetCount !== 26) throw new Error(`V245_WIDGET_COUNT_INVALID:${widgetCount}`);
  if (!widgets.includes('id: "custom-html", name: "HTML / JavaScript"')) throw new Error("V245_CUSTOM_HTML_WIDGET_MISSING");

  const families = [...catalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...catalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  if (families !== 20 || compositions !== 5 || families * compositions !== 100) {
    throw new Error(`V245_THEME_COUNT_INVALID:${families}x${compositions}`);
  }

  if (!release.includes(RELEASE) || !release.includes('"themeCount": 100') || !release.includes('"widgetCount": 26')) {
    throw new Error("V245_RELEASE_METADATA_INVALID");
  }
  if (!v244.includes("studio-stable-source-shell-v244-20260803")) throw new Error("V245_REQUIRES_V244_SHELL");
  for (const source of [studio, css]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/.test(source)) {
      throw new Error("V245_DESTRUCTIVE_SESSION_ACTION");
    }
  }
}

export function finalizeServiceWorkerV245(target = resolve("dist", "sw.js")) {
  verifyThemeSource();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V245_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V245_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V245 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V245 = "${CACHE}";`);
  insertAfterVersion(`const THEME_NATIVE_RELEASE_V245 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V245}-${ACTIVE_CACHE_RELEASE_V245}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V245}-${ACTIVE_CACHE_RELEASE_V245}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V245,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V245,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V244", "NGE_BLOGGING_UPDATE_AVAILABLE_V245")
    .replaceAll("service-worker-activated-stable-source-shell-v244", "service-worker-activated-theme-native-v245");

  if (!source.includes("themeNativeReleaseV245:")) {
    source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    themeNativeReleaseV245: THEME_NATIVE_RELEASE_V245,");
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V245}-${ACTIVE_CACHE_RELEASE_V245}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V245}-${ACTIVE_CACHE_RELEASE_V245}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "themeNativeReleaseV245",
  ]) if (!source.includes(marker)) throw new Error(`V245_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V245_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V245_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V245_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V245_AUTH_SURFACE_GUARD_MISSING");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
