import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
const RELEASE = "studio-mobile-hardening-v181-20260731";
const VERSION = "ngeblogging-app-v181-mobile-hardening-20260731";
const CACHE = "mobile-hardening-cache-v181";
const MARKER = `const STUDIO_MOBILE_HARDENING_RELEASE_V181 = "${RELEASE}";`;

let source = await readFile(file, "utf8");
source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "mobile-hardening-v181";');
source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V179", "NGE_BLOGGING_UPDATE_AVAILABLE_V181");

if (!source.includes(MARKER)) {
  source = source.replace(/^(const VERSION = .*;\n)/m, `$1${MARKER}\n`);
}

if (!source.includes(VERSION) || !source.includes(CACHE) || !source.includes(MARKER)) {
  throw new Error("V181_SERVICE_WORKER_PATCH_INCOMPLETE");
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) {
  throw new Error("V181_FORCED_NAVIGATION_MUST_REMAIN_DISABLED");
}

await writeFile(file, source);
console.log(`Patched public/sw.js for ${RELEASE}`);
