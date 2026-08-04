import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
export const RELEASE = "pwa-source-stability-v252-20260804";
const VERSION = "ngeblogging-app-v252-source-stability-20260804";
const CACHE = "source-stability-cache-v252";
const FORCE_VALUE = "source-stability-v252";
const UPDATE_EVENT = "NGE_BLOGGING_UPDATE_AVAILABLE_V252";
const RELEASE_LINE = `const SOURCE_STABILITY_RELEASE_V252 = "${RELEASE}";`;
const CACHE_LINE = `const SOURCE_STABILITY_CACHE_V252 = "${CACHE}";`;

function replaceRequired(source, pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source && !source.includes(replacement)) throw new Error(`V252_PWA_MARKER_MISSING:${label}`);
  return next;
}

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V252_PWA_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

let source = await readFile(file, "utf8");
source = replaceRequired(source, /^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`, "VERSION");
source = replaceRequired(source, /^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`, "CACHE_RELEASE");
source = replaceRequired(source, /^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE_VALUE}";`, "FORCE_REFRESH_VALUE");
source = insertAfterVersion(source, RELEASE_LINE);
source = insertAfterVersion(source, CACHE_LINE);
source = source.replace(/NGE_BLOGGING_(?:FORCE_RELOAD|UPDATE_AVAILABLE)_V\d+/g, UPDATE_EVENT);
source = source.replace(/reason:\s*"service-worker-[^"]+"/g, 'reason: "service-worker-update-available-v252"');

// v252 deliberately keeps the v179 safety model: tell open non-auth tabs that a
// new version exists, but never navigate them from the service worker. This avoids
// the historical double-load/reload loop and keeps login/callback surfaces intact.
source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v252: no forced WindowClient navigation; the next normal navigation uses the fresh cache.");

for (const marker of [VERSION, CACHE, FORCE_VALUE, UPDATE_EVENT, RELEASE_LINE, CACHE_LINE]) {
  if (!source.includes(marker)) throw new Error(`V252_PWA_CONTRACT_MISSING:${marker}`);
}
if (/await\s+refreshStaleWindow\s*\(/.test(source)) throw new Error("V252_PWA_FORCED_REFRESH_CALL_FOUND");
if (!/function isAuthSurface\([\s\S]*authMode === "callback"[\s\S]*authMode === "recovery"/.test(source)) {
  throw new Error("V252_PWA_AUTH_SURFACE_GUARD_MISSING");
}
if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)[\s\S]*caches\.delete/.test(source)) {
  throw new Error("V252_PWA_OLD_CACHE_CLEANUP_MISSING");
}

await writeFile(file, source);
console.log(`Patched public/sw.js for ${RELEASE} without forced navigation.`);
