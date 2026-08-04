import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-shell-nara-v253-20260804";
export const VERSION = "ngeblogging-app-v253-shell-nara-20260804";
export const CACHE = "studio-shell-nara-cache-v253";

export function rotateServiceWorkerV253(target = resolve("dist", "sw.js")) {
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V253_ROTATE_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  for (const required of [
    "ACTIVE_VERSION_V250",
    "ACTIVE_CACHE_RELEASE_V250",
    "STUDIO_NATIVE_BUNDLE_RELEASE_V250",
    "AUTH_HANDOFF_RELEASE",
    "function versionPayload",
    "isAuthSurface(url)",
  ]) {
    if (!source.includes(required)) throw new Error(`V253_ROTATE_REQUIRES_V250:${required}`);
  }

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V253_ROTATE_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V253 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V253 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_SHELL_NARA_RELEASE_V253 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V253}-${ACTIVE_CACHE_RELEASE_V253}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V253}-${ACTIVE_CACHE_RELEASE_V253}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V253,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V253,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V250", "NGE_BLOGGING_UPDATE_AVAILABLE_V253")
    .replaceAll("service-worker-activated-native-bundle-v250", "service-worker-activated-shell-nara-v253")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v253 only announces the controller; login/callback/editor routes are never force-navigated.");

  if (!source.includes("studioShellNaraReleaseV253:")) {
    source = source.replace(
      /(function versionPayload\(type\) \{[\s\S]*?return \{)/,
      "$1\n    studioShellNaraReleaseV253: STUDIO_SHELL_NARA_RELEASE_V253,",
    );
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V253}-${ACTIVE_CACHE_RELEASE_V253}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V253}-${ACTIVE_CACHE_RELEASE_V253}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioShellNaraReleaseV253",
  ]) {
    if (!source.includes(marker)) throw new Error(`V253_ROTATE_MARKER_MISSING:${marker}`);
  }

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V253_ROTATE_FORCED_NAVIGATION_REMAINS");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V253_ROTATE_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V253_ROTATE_AUTH_SURFACE_GUARD_MISSING");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V253_ROTATE_DESTRUCTIVE_SESSION_ACTION");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
