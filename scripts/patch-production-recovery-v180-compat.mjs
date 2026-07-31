import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
let source = await readFile(file, "utf8");

source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v179-mobile-runtime-20260731";');
source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "mobile-runtime-cache-v179";');
source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "mobile-runtime-v179";');

if (!source.includes("PRODUCTION_RECOVERY_RELEASE_V180")) {
  source = source.replace(
    /^(const VERSION = .*;\n)/m,
    '$1const PRODUCTION_RECOVERY_RELEASE_V180 = "production-recovery-v180-20260731";\n',
  );
}

if (!source.includes("ngeblogging-app-v179-mobile-runtime-20260731")
  || !source.includes("mobile-runtime-cache-v179")
  || !source.includes("PRODUCTION_RECOVERY_RELEASE_V180")) {
  throw new Error("V180_COMPAT_SERVICE_WORKER_INCOMPLETE");
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) {
  throw new Error("V180_COMPAT_FORCED_NAVIGATION_ACTIVE");
}

await writeFile(file, source);
console.log("Production recovery v180 preserves the v179 service-worker contract.");
