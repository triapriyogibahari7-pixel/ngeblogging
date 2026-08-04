import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
export const RELEASE = "pwa-source-stability-v252-20260804";
const VERSION = "ngeblogging-app-v252-source-stability-20260804";
const CACHE = "source-stability-cache-v252";
const FORCE_VALUE = "source-stability-v252";
const UPDATE_EVENT = "NGE_BLOGGING_UPDATE_AVAILABLE_V252";
const RELEASE_LINE = `const SOURCE_STABILITY_RELEASE_V252 = "${RELEASE}";`;
const CACHE_LINE = `const SOURCE_STABILITY_CACHE_V252 = "${CACHE}";`;

function replaceConstant(source, name, value) {
  const pattern = new RegExp(`^const ${name} = [^;]+;$`, "m");
  const line = `const ${name} = "${value}";`;
  if (pattern.test(source)) return source.replace(pattern, line);
  const versionLine = source.match(/^const VERSION = .*;$/m)?.[0];
  if (!versionLine) throw new Error(`V252_PWA_CONSTANT_ANCHOR_MISSING:${name}`);
  return source.replace(versionLine, `${versionLine}\n${line}`);
}

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V252_PWA_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

let source = await readFile(file, "utf8");
source = replaceConstant(source, "VERSION", VERSION);
source = replaceConstant(source, "CACHE_RELEASE", CACHE);
source = replaceConstant(source, "FORCE_REFRESH_VALUE", FORCE_VALUE);
source = insertAfterVersion(source, RELEASE_LINE);
source = insertAfterVersion(source, CACHE_LINE);
source = source.replace(/NGE_BLOGGING_(?:FORCE_RELOAD|UPDATE_AVAILABLE)_V\d+/g, UPDATE_EVENT);
source = source.replace(/reason:\s*"service-worker-[^"]+"/g, 'reason: "service-worker-update-available-v252"');

// v252 deliberately keeps the v179 safety model: tell open non-auth tabs that a
// new version exists, but never navigate them from the service worker. This avoids
// the historical double-load/reload loop and keeps login/callback surfaces intact.
source = source.replace(/\n\s*await\s+refreshStaleWindow\(client, url\);/g, "\n      // v252: no forced WindowClient navigation; the next normal navigation uses the fresh cache.");

for (const marker of [VERSION, CACHE, FORCE_VALUE, UPDATE_EVENT, RELEASE_LINE, CACHE_LINE]) {
  if (!source.includes(marker)) throw new Error(`V252_PWA_CONTRACT_MISSING:${marker}`);
}
if (/await\s+refreshStaleWindow\s*\(/.test(source)) throw new Error("V252_PWA_FORCED_REFRESH_CALL_FOUND");
for (const marker of ["function isAuthSurface", 'authMode === "callback"', 'authMode === "recovery"']) {
  if (!source.includes(marker)) throw new Error(`V252_PWA_AUTH_SURFACE_GUARD_MISSING:${marker}`);
}
for (const marker of ["caches.keys()", "caches.delete", "SHELL_CACHE", "ASSET_CACHE"]) {
  if (!source.includes(marker)) throw new Error(`V252_PWA_CACHE_CLEANUP_MARKER_MISSING:${marker}`);
}

await writeFile(file, source);
console.log(`Patched public/sw.js for ${RELEASE} without forced navigation.`);
