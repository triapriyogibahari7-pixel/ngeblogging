import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-native-stability-v248-20260803";
export const VERSION = "ngeblogging-app-v248-native-stability-20260803";
export const CACHE = "studio-native-stability-cache-v248";

const read = (path) => readFileSync(resolve(path), "utf8");

function verifySourceContracts() {
  const entry = read("src/Studio.jsx");
  const runtime = read("src/studio-native-stability-v248.js");
  const css = read("src/studio-native-stability-v248.css");
  const studio = read("src/StudioNext.jsx");
  const provider = read("src/auth-provider-gateway-v248.js");
  const session = read("src/auth-session-authority-v76.js");
  const widgets = read("src/widget-system.js");
  const themes = read("src/theme-catalog.js");
  const release = read("public/release-v248.json");

  if (entry.includes('import "./studio-stable-shell-v244.js"')) throw new Error("V248_DUPLICATE_SHELL_RUNTIME_REENABLED");
  if (entry.includes('import "./studio-sidebar-brand-v246.js"')) throw new Error("V248_DUPLICATE_BRAND_RUNTIME_REENABLED");
  if (entry.includes('import "./studio-shell-controller-v147.js"')) throw new Error("V248_DUPLICATE_PROFILE_CONTROLLER_REENABLED");
  const runtimePos = entry.indexOf('import "./studio-native-stability-v248.js"');
  const cssPos = entry.indexOf('import "./studio-native-stability-v248.css"');
  if (!(runtimePos >= 0 && cssPos > runtimePos)) throw new Error("V248_ENTRY_ORDER_INVALID");

  for (const marker of [
    "restoreReactChrome",
    "responsiveFamily",
    "studioAccountPaneV248",
    "backdrop.hidden = !full",
    "LAYOUT_AREAS",
    "tn-code-gutter-v248",
  ]) if (!runtime.includes(marker)) throw new Error(`V248_RUNTIME_MARKER_MISSING:${marker}`);

  for (const marker of [
    "--v248-sidebar-open:248px",
    "--v248-sidebar-rail:70px",
    "#ngeblogging-studio-chrome-v244",
    "data-studio-v248-family=\"large\"",
    "data-studio-v248-family=\"small\"",
    "nara-assistant-layer[data-nara-layer-size=\"small\"]",
    "nara-assistant-layer[data-nara-layer-size=\"medium\"]",
    ".v248-layout-map",
    ".tn-code-gutter-v248",
  ]) if (!css.includes(marker)) throw new Error(`V248_CSS_MARKER_MISSING:${marker}`);

  for (const label of ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"]) {
    if (!studio.includes(label)) throw new Error(`V248_MENU_REGRESSION:${label}`);
  }

  for (const marker of ["/api/auth-proxy", "same-origin-auth-gateway", "/auth/v1/authorize"]) {
    if (!provider.includes(marker)) throw new Error(`V248_PROVIDER_GATEWAY_MISSING:${marker}`);
  }
  if (!session.includes("auth-provider-gateway-v248.js")) throw new Error("V248_PROVIDER_GATEWAY_NOT_BOOTSTRAPPED");

  const areaIds = [...widgets.matchAll(/\{ id: "(?:header-left|header-right|below-header|sidebar-left|before-content|after-content|sidebar-right|footer-left|footer-right|footer-wide)"/g)].length;
  if (areaIds !== 10) throw new Error(`V248_LAYOUT_AREA_COUNT:${areaIds}`);
  const widgetIds = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  if (widgetIds !== 26) throw new Error(`V248_WIDGET_COUNT:${widgetIds}`);
  const families = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  if (families !== 20 || compositions !== 5) throw new Error(`V248_THEME_ARCHITECTURE:${families}x${compositions}`);
  if (!release.includes(RELEASE)) throw new Error("V248_RELEASE_METADATA_MISSING");
}

export function finalizeServiceWorkerV248(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V248_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V248_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V248 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V248 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_NATIVE_STABILITY_RELEASE_V248 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V248}-${ACTIVE_CACHE_RELEASE_V248}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V248}-${ACTIVE_CACHE_RELEASE_V248}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V248,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V248,")
    .replace(/NGE_BLOGGING_UPDATE_AVAILABLE_V\d+/g, "NGE_BLOGGING_UPDATE_AVAILABLE_V248")
    .replace(/service-worker-activated-[a-z0-9-]+-v\d+/g, "service-worker-activated-native-stability-v248");

  if (!source.includes("studioNativeStabilityReleaseV248:")) {
    source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioNativeStabilityReleaseV248: STUDIO_NATIVE_STABILITY_RELEASE_V248,");
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V248}-${ACTIVE_CACHE_RELEASE_V248}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V248}-${ACTIVE_CACHE_RELEASE_V248}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioNativeStabilityReleaseV248",
  ]) if (!source.includes(marker)) throw new Error(`V248_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V248_FORCED_NAVIGATION_REMAINS");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V248_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V248_AUTH_SURFACE_GUARD_MISSING");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
