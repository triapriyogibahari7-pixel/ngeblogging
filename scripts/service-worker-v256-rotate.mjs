import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-production-order-data-v256-20260804";
export const VERSION = "ngeblogging-app-v256-production-order-data-20260804";
export const CACHE = "studio-production-order-data-cache-v256";

export function rotateServiceWorkerV256(target = resolve("dist", "sw.js")) {
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V256_ROTATE_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  for (const required of [
    "ACTIVE_VERSION_V253",
    "ACTIVE_CACHE_RELEASE_V253",
    "STUDIO_SHELL_NARA_RELEASE_V253",
    "AUTH_HANDOFF_RELEASE",
    "function versionPayload",
    "isAuthSurface(url)",
  ]) {
    if (!source.includes(required)) throw new Error(`V256_ROTATE_REQUIRES_V253:${required}`);
  }

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V256_ROTATE_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V256 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V256 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_PRODUCTION_ORDER_DATA_RELEASE_V256 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V256}-${ACTIVE_CACHE_RELEASE_V256}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V256}-${ACTIVE_CACHE_RELEASE_V256}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V256,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V256,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V253", "NGE_BLOGGING_UPDATE_AVAILABLE_V256")
    .replaceAll("service-worker-activated-shell-nara-v253", "service-worker-activated-production-order-data-v256")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v256 announces the new controller only; auth/callback/editor pages are never force-navigated.");

  if (!source.includes("studioProductionOrderDataReleaseV256:")) {
    source = source.replace(
      /(function versionPayload\(type\) \{[\s\S]*?return \{)/,
      "$1\n    studioProductionOrderDataReleaseV256: STUDIO_PRODUCTION_ORDER_DATA_RELEASE_V256,",
    );
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V256}-${ACTIVE_CACHE_RELEASE_V256}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V256}-${ACTIVE_CACHE_RELEASE_V256}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioProductionOrderDataReleaseV256",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V256",
  ]) {
    if (!source.includes(marker)) throw new Error(`V256_ROTATE_MARKER_MISSING:${marker}`);
  }

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V256_ROTATE_FORCED_NAVIGATION_REMAINS");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V256_ROTATE_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V256_ROTATE_AUTH_SURFACE_GUARD_MISSING");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V256_ROTATE_DESTRUCTIVE_SESSION_ACTION");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
