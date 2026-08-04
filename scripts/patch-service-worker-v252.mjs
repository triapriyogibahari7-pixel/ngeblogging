import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
export const RELEASE = "pwa-source-stability-v252-20260804";
const VERSION = "ngeblogging-app-v252-source-stability-20260804";
const CACHE = "source-stability-cache-v252";
const FORCE_VALUE = "source-stability-v252";
const UPDATE_EVENT = "NGE_BLOGGING_UPDATE_AVAILABLE_V252";

let source = await readFile(file, "utf8");
source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE_VALUE}";`);
if (!source.includes("SOURCE_STABILITY_RELEASE_V252")) {
  source = source.replace(
    /^(const VERSION = .*;\n)/m,
    `$1const SOURCE_STABILITY_RELEASE_V252 = "${RELEASE}";\n`,
  );
}
source = source.replace(/NGE_BLOGGING_(?:FORCE_RELOAD|UPDATE_AVAILABLE)_V\d+/g, UPDATE_EVENT);
source = source.replace(/\n\s*await\s+refreshStaleWindow\(client, url\);/g, "\n      // v252: update tersedia tanpa navigasi paksa WindowClient.");

for (const marker of [VERSION, CACHE, FORCE_VALUE, RELEASE, UPDATE_EVENT, "SHELL_CACHE", "ASSET_CACHE", "caches.delete"]) {
  if (!source.includes(marker)) throw new Error(`V252_PWA_BUILD_MARKER_MISSING:${marker}`);
}
if (/await\s+refreshStaleWindow\s*\(/.test(source)) throw new Error("V252_PWA_FORCED_NAVIGATION_FOUND");
for (const marker of ['url.pathname === "/login"', 'authMode === "callback"', 'authMode === "recovery"']) {
  if (!source.includes(marker)) throw new Error(`V252_PWA_AUTH_GUARD_MISSING:${marker}`);
}

await writeFile(file, source);
console.log(`Applied ${RELEASE} after historical regression tests.`);
