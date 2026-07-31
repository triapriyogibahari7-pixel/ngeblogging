import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
const RELEASE = "studio-screenshot-authority-v183-20260731";
const VERSION = "ngeblogging-app-v183-screenshot-authority-20260731";
const CACHE = "screenshot-authority-cache-v183";
const MARKER = `const STUDIO_SCREENSHOT_AUTHORITY_RELEASE_V183 = "${RELEASE}";`;
const V181_VERSION_COMPAT = 'const MOBILE_HARDENING_COMPAT_VERSION_V181 = "ngeblogging-app-v181-mobile-hardening-20260731";';
const V181_CACHE_COMPAT = 'const MOBILE_HARDENING_COMPAT_CACHE_V181 = "mobile-hardening-cache-v181";';

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V183_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

let source = await readFile(file, "utf8");
source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "screenshot-authority-v183";');
source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V181", "NGE_BLOGGING_UPDATE_AVAILABLE_V183");
source = insertAfterVersion(source, MARKER);
source = insertAfterVersion(source, V181_VERSION_COMPAT);
source = insertAfterVersion(source, V181_CACHE_COMPAT);

for (const required of [VERSION, CACHE, MARKER, V181_VERSION_COMPAT, V181_CACHE_COMPAT]) {
  if (!source.includes(required)) throw new Error(`V183_SERVICE_WORKER_PATCH_INCOMPLETE:${required}`);
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) {
  throw new Error("V183_FORCED_NAVIGATION_MUST_REMAIN_DISABLED");
}

await writeFile(file, source);
console.log(`Patched public/sw.js for ${RELEASE}`);
