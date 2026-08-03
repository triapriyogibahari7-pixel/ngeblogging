import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-source-stability-v237-20260803";
export const VERSION = "ngeblogging-app-v237-source-stability-20260803";
export const CACHE = "source-stability-cache-v237";

const swPath = resolve("dist", "sw.js");
if (!existsSync(swPath)) throw new Error("V237_FINALIZE_DIST_SW_MISSING");

let source = readFileSync(swPath, "utf8");

function insertAfterVersion(line) {
  if (source.includes(line)) return;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V237_FINALIZE_VERSION_ANCHOR_MISSING:${line}`);
  source = next;
}

insertAfterVersion(`const ACTIVE_VERSION_V237 = "${VERSION}";`);
insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V237 = "${CACHE}";`);
insertAfterVersion(`const STUDIO_SOURCE_STABILITY_RELEASE_V237 = "${RELEASE}";`);

source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V237,")
  .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V237,")
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V236", "NGE_BLOGGING_UPDATE_AVAILABLE_V237")
  .replaceAll("service-worker-activated-real-device-v236", "service-worker-activated-source-stability-v237")
  .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v237 announces the fresh shell without forced navigation or session destruction.");

// Make the new release visible through GET_VERSION without changing auth/session semantics.
if (!source.includes("studioSourceStabilityReleaseV237:")) {
  source = source.replace(
    /(\n\s*sitePolicyRelease:\s*SITE_POLICY_RELEASE,)/,
    `$1\n    studioSourceStabilityReleaseV237: STUDIO_SOURCE_STABILITY_RELEASE_V237,`,
  );
}

for (const marker of [
  VERSION,
  CACHE,
  RELEASE,
  'const SHELL_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-shell`;',
  'const ASSET_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-assets`;',
  "studioSourceStabilityReleaseV237",
]) {
  if (!source.includes(marker)) throw new Error(`V237_FINALIZE_MARKER_MISSING:${marker}`);
}

if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V237_FINALIZE_FORCED_NAVIGATION_REMAINS");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V237_FINALIZE_DESTRUCTIVE_SESSION_ACTION");
if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V237_FINALIZE_OLD_CACHE_CLEANUP_MISSING");
if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V237_FINALIZE_AUTH_SURFACE_GUARD_MISSING");

writeFileSync(swPath, source, "utf8");
console.log(`Finalized dist/sw.js for ${RELEASE} after production tests and Vite build.`);
