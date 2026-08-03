import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-desktop-sidebar-v238-20260803";
export const VERSION = "ngeblogging-app-v238-desktop-sidebar-20260803";
export const CACHE = "desktop-sidebar-cache-v238";

function verifySourceContracts() {
  const read = (path) => readFileSync(resolve(path), "utf8");
  const entry = read("src/Studio.jsx");
  const device = read("src/studio-device-mode-v140.js");
  const stability = read("src/studio-source-stability-v237.js");
  const css = read("src/studio-desktop-sidebar-v238.css");
  const release = read("public/release-v238.json");
  const checks = [
    [entry, 'import "./studio-desktop-sidebar-v238.css"'],
    [device, "desktopSitePhoneSignal"],
    [device, 'if (desktopSitePhone) return "desktop"'],
    [device, 'if (handheld) return "tablet"'],
    [stability, RELEASE],
    [stability, "desktopSitePhone"],
    [stability, "single-internal-n-toggle"],
    [css, 'data-v238-family="large"'],
    [css, 'data-v238-family="small"'],
    [css, "v238-internal-n"],
    [css, ".sv124-free-domain>aside"],
    [css, ".tn-code-workspace"],
    [css, "#ngeblogging-layout-map"],
    [release, RELEASE],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V238_SOURCE_CONTRACT_MISSING:${marker}`);
  for (const source of [device, stability, css]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V238_DESTRUCTIVE_SESSION_ACTION");
  }
}

export function finalizeServiceWorkerV238(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V238_FINALIZE_DIST_SW_MISSING:${swPath}`);

  let source = readFileSync(swPath, "utf8");
  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V238_FINALIZE_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V238 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V238 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_DESKTOP_SIDEBAR_RELEASE_V238 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V238}-${ACTIVE_CACHE_RELEASE_V238}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V238}-${ACTIVE_CACHE_RELEASE_V238}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V238,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V238,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V237", "NGE_BLOGGING_UPDATE_AVAILABLE_V238")
    .replaceAll("service-worker-activated-source-stability-v237", "service-worker-activated-desktop-sidebar-v238")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v238 announces the fresh shell without forced navigation or session destruction.");

  if (!source.includes("studioDesktopSidebarReleaseV238:")) {
    const payloadMarker = /\n\s*sitePolicyRelease:\s*SITE_POLICY_RELEASE,/;
    if (payloadMarker.test(source)) {
      source = source.replace(payloadMarker, (match) => `${match}\n    studioDesktopSidebarReleaseV238: STUDIO_DESKTOP_SIDEBAR_RELEASE_V238,`);
    } else {
      source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioDesktopSidebarReleaseV238: STUDIO_DESKTOP_SIDEBAR_RELEASE_V238,");
    }
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V238}-${ACTIVE_CACHE_RELEASE_V238}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V238}-${ACTIVE_CACHE_RELEASE_V238}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioDesktopSidebarReleaseV238",
  ]) {
    if (!source.includes(marker)) throw new Error(`V238_FINALIZE_MARKER_MISSING:${marker}`);
  }
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V238_FINALIZE_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V238_FINALIZE_DESTRUCTIVE_SESSION_ACTION");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V238_FINALIZE_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V238_FINALIZE_AUTH_SURFACE_GUARD_MISSING");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
