import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
const RELEASE = "studio-mobile-hardening-v181-20260731";
const VERSION = "ngeblogging-app-v181-mobile-hardening-20260731";
const CACHE = "mobile-hardening-cache-v181";
const MARKER = `const STUDIO_MOBILE_HARDENING_RELEASE_V181 = "${RELEASE}";`;
const V179_VERSION_COMPAT = 'const MOBILE_RUNTIME_COMPAT_VERSION_V179 = "ngeblogging-app-v179-mobile-runtime-20260731";';
const V179_CACHE_COMPAT = 'const MOBILE_RUNTIME_COMPAT_CACHE_V179 = "mobile-runtime-cache-v179";';

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V181_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

let source = await readFile(file, "utf8");
source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "mobile-hardening-v181";');
source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V179", "NGE_BLOGGING_UPDATE_AVAILABLE_V181");
source = insertAfterVersion(source, MARKER);
source = insertAfterVersion(source, V179_VERSION_COMPAT);
source = insertAfterVersion(source, V179_CACHE_COMPAT);

for (const required of [VERSION, CACHE, MARKER, V179_VERSION_COMPAT, V179_CACHE_COMPAT]) {
  if (!source.includes(required)) throw new Error(`V181_SERVICE_WORKER_PATCH_INCOMPLETE:${required}`);
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) {
  throw new Error("V181_FORCED_NAVIGATION_MUST_REMAIN_DISABLED");
}

await writeFile(file, source);
console.log(`Patched public/sw.js for ${RELEASE}`);

// v183 menjadi cache terakhir setelah v181 tanpa forced navigation pada login, callback, editor, atau Studio.
await import("./patch-service-worker-v183.mjs");
