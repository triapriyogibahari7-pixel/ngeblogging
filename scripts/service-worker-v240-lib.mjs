import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-react-safe-v240-20260803";
export const VERSION = "ngeblogging-app-v240-react-safe-20260803";
export const CACHE = "studio-react-safe-cache-v240";

function verifySourceContracts() {
  const read = (path) => readFileSync(resolve(path), "utf8");
  const entry = read("src/Studio.jsx");
  const runtime = read("src/studio-react-safe-v240.js");
  const css = read("src/studio-react-safe-v240.css");
  const widgets = read("src/widget-system.js");
  const release = read("public/release-v240.json");

  const v238 = entry.indexOf('import "./studio-desktop-sidebar-v238.js"');
  const v240 = entry.indexOf('import "./studio-react-safe-v240.js"');
  const v239 = entry.indexOf('import "./studio-final-authority-v239.js"');
  const v240Css = entry.indexOf('import "./studio-react-safe-v240.css"');
  if (!(v238 >= 0 && v240 > v238 && v239 > v240 && v240Css > v239)) throw new Error("V240_IMPORT_ORDER_INVALID");

  const checks = [
    [runtime, RELEASE],
    [runtime, "preemptUnsafeV239DomRewrites"],
    [runtime, "attachShadow"],
    [runtime, "v240-code-gutter-portal"],
    [runtime, "event.stopPropagation()"],
    [runtime, "Widget kiri 4"],
    [runtime, "Widget kanan 4"],
    [runtime, "configureWidget"],
    [runtime, "Math.min(10000"],
    [css, ".v240-widget-popover"],
    [css, ".v240-code-gutter-portal"],
    [css, 'textarea[data-v240-line-numbers="true"]'],
    [widgets, 'id: "custom-html"'],
    [release, RELEASE],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V240_SOURCE_CONTRACT_MISSING:${marker}`);

  if (/canvas\.innerHTML\s*=/.test(runtime)) throw new Error("V240_REACT_CANVAS_REPLACEMENT_FOUND");
  if (/textarea\.parentNode\.insertBefore|\.append\([^\n]*textarea/.test(runtime)) throw new Error("V240_REACT_TEXTAREA_REPARENT_FOUND");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V240_DESTRUCTIVE_SESSION_ACTION");
}

export function finalizeServiceWorkerV240(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V240_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V240_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V240 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V240 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_REACT_SAFE_RELEASE_V240 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V240}-${ACTIVE_CACHE_RELEASE_V240}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V240}-${ACTIVE_CACHE_RELEASE_V240}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V240,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V240,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V239", "NGE_BLOGGING_UPDATE_AVAILABLE_V240")
    .replaceAll("service-worker-activated-final-authority-v239", "service-worker-activated-react-safe-v240")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v240 announces freshness without forced navigation.");

  if (!source.includes("studioReactSafeReleaseV240:")) {
    const marker = /\n\s*studioFinalAuthorityReleaseV239:\s*STUDIO_FINAL_AUTHORITY_RELEASE_V239,/;
    if (marker.test(source)) {
      source = source.replace(marker, (match) => `${match}\n    studioReactSafeReleaseV240: STUDIO_REACT_SAFE_RELEASE_V240,`);
    } else {
      source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioReactSafeReleaseV240: STUDIO_REACT_SAFE_RELEASE_V240,");
    }
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V240}-${ACTIVE_CACHE_RELEASE_V240}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V240}-${ACTIVE_CACHE_RELEASE_V240}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioReactSafeReleaseV240",
  ]) if (!source.includes(marker)) throw new Error(`V240_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V240_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V240_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V240_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V240_AUTH_SURFACE_GUARD_MISSING");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
