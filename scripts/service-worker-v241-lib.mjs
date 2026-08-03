import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-visual-stability-v241-20260803";
export const VERSION = "ngeblogging-app-v241-visual-stability-20260803";
export const CACHE = "studio-visual-stability-cache-v241";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function verifySourceContracts() {
  const entry = read("src/Studio.jsx");
  const runtime = read("src/studio-visual-stability-v241.js");
  const css = read("src/studio-visual-stability-v241.css");
  const finalCss = read("src/studio-visual-stability-v241-final.css");
  const studio = read("src/StudioNext.jsx");
  const themes = read("src/theme-catalog.js");
  const widgets = read("src/widget-system.js");
  const nara = read("src/NaraAssistant.jsx");
  const analytics = read("src/studio-analytics-v41.js");
  const auth = read("src/lib/supabase.js");
  const release = read("public/release-v241.json");

  const v240 = entry.indexOf('import "./studio-react-safe-v240.css"');
  const v241 = entry.indexOf('import "./studio-visual-stability-v241.js"');
  const v241Final = entry.indexOf('import "./studio-visual-stability-v241-final.css"');
  if (!(v240 >= 0 && v241 > v240 && v241Final > v241)) throw new Error("V241_IMPORT_ORDER_INVALID");

  const checks = [
    [runtime, RELEASE],
    [runtime, "openAccountMenu"],
    [runtime, "openAttachmentPortal"],
    [runtime, "openWidgetPicker"],
    [runtime, "BUILT_IN_WIDGETS"],
    [runtime, "LAYOUT_AREAS"],
    [runtime, "loadAnalytics(view, 30, false)"],
    [runtime, 'data-kind="camera"'],
    [runtime, 'data-kind="photo"'],
    [runtime, 'data-kind="file"'],
    [css, ".v241-account-menu"],
    [css, ".v241-nara-attachment-portal"],
    [css, ".v241-widget-picker"],
    [css, 'data-v238-family="small"'],
    [css, 'data-v238-family="large"'],
    [css, 'grid-template-areas:"code preview"'],
    [css, 'grid-template-areas:"preview" "code"'],
    [finalCss, 'data-v238-family="large"'],
    [widgets, 'id: "custom-html"'],
    [analytics, "get_site_analytics_dashboard"],
    [analytics, "SIMULASI TAMPILAN — BUKAN DATA PRODUKSI"],
    [nara, "cameraInput"],
    [nara, "imageInput"],
    [nara, "fileInput"],
    [auth, "persistSession: true"],
    [auth, "autoRefreshToken: true"],
    [release, RELEASE],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V241_SOURCE_CONTRACT_MISSING:${marker}`);

  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    if (!studio.includes(label)) throw new Error(`V241_MENU_MISSING:${label}`);
  }

  const familyCount = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositionCount = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  const widgetCount = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  if (familyCount !== 20 || compositionCount !== 5 || familyCount * compositionCount !== 100) {
    throw new Error(`V241_THEME_COUNT_INVALID:${familyCount}x${compositionCount}`);
  }
  if (widgetCount !== 26) throw new Error(`V241_WIDGET_COUNT_INVALID:${widgetCount}`);

  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V241_DESTRUCTIVE_SESSION_ACTION");
  if (!/writing-mode:horizontal-tb!important/.test(css) || !/\.sv124-free-domain>aside>\*/.test(css)) throw new Error("V241_DOMAIN_HORIZONTAL_ACTION_GUARD_MISSING");
  if (!/min-height:310px!important/.test(css) || !/\.op41-donut/.test(css)) throw new Error("V241_ANALYTICS_GEOMETRY_MISSING");
}

export function finalizeServiceWorkerV241(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V241_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V241_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V241 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V241 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_VISUAL_STABILITY_RELEASE_V241 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V241}-${ACTIVE_CACHE_RELEASE_V241}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V241}-${ACTIVE_CACHE_RELEASE_V241}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V241,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V241,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V240", "NGE_BLOGGING_UPDATE_AVAILABLE_V241")
    .replaceAll("service-worker-activated-react-safe-v240", "service-worker-activated-visual-stability-v241")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v241 announces freshness without forced navigation or session destruction.");

  if (!source.includes("studioVisualStabilityReleaseV241:")) {
    const marker = /\n\s*studioReactSafeReleaseV240:\s*STUDIO_REACT_SAFE_RELEASE_V240,/;
    if (marker.test(source)) {
      source = source.replace(marker, (match) => `${match}\n    studioVisualStabilityReleaseV241: STUDIO_VISUAL_STABILITY_RELEASE_V241,`);
    } else {
      source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioVisualStabilityReleaseV241: STUDIO_VISUAL_STABILITY_RELEASE_V241,");
    }
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V241}-${ACTIVE_CACHE_RELEASE_V241}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V241}-${ACTIVE_CACHE_RELEASE_V241}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioVisualStabilityReleaseV241",
  ]) if (!source.includes(marker)) throw new Error(`V241_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V241_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V241_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V241_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V241_AUTH_SURFACE_GUARD_MISSING");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
