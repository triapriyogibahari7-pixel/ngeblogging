import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
const RELEASE = "studio-mobile-runtime-v179-20260731";
const VERSION = "ngeblogging-app-v179-mobile-runtime-20260731";
const CACHE = "mobile-runtime-cache-v179";
const FIRST_SITE_VERSION = 'const FIRST_SITE_COMPAT_VERSION_V169 = "ngeblogging-app-v169-first-site-20260730";';
const FIRST_SITE_CACHE = 'const FIRST_SITE_COMPAT_CACHE_V169 = "first-site-cache-v169";';
const SCREENSHOT_VERSION = 'const SCREENSHOT_STABILITY_COMPAT_VERSION_V177 = "ngeblogging-app-v177-screenshot-stability-20260731";';
const SCREENSHOT_CACHE = 'const SCREENSHOT_STABILITY_COMPAT_CACHE_V177 = "screenshot-stability-cache-v177";';
const MOBILE_RUNTIME = `const MOBILE_RUNTIME_RELEASE = "${RELEASE}";`;

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`Patch service worker v179 tidak menemukan VERSION untuk ${line}.`);
  return next;
}

let source = await readFile(file, "utf8");
source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "mobile-runtime-v179";');
source = source.replaceAll("NGE_BLOGGING_FORCE_RELOAD_V169", "NGE_BLOGGING_UPDATE_AVAILABLE_V179");
for (const legacyEvent of ["NGE_BLOGGING_FORCE_RELOAD_V174", "NGE_BLOGGING_FORCE_RELOAD_V176", "NGE_BLOGGING_FORCE_RELOAD_V177"]) {
  source = source.replaceAll(legacyEvent, "NGE_BLOGGING_UPDATE_AVAILABLE_V179");
}
source = insertAfterVersion(source, FIRST_SITE_VERSION);
source = insertAfterVersion(source, FIRST_SITE_CACHE);
source = insertAfterVersion(source, SCREENSHOT_VERSION);
source = insertAfterVersion(source, SCREENSHOT_CACHE);
source = insertAfterVersion(source, MOBILE_RUNTIME);
source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v179 memberi tahu tab lama tanpa navigasi paksa; pengguna tidak dikeluarkan dari editor atau callback autentikasi.");
for (const marker of [VERSION, CACHE, RELEASE, FIRST_SITE_VERSION, FIRST_SITE_CACHE, SCREENSHOT_VERSION, SCREENSHOT_CACHE, MOBILE_RUNTIME]) {
  if (!source.includes(marker)) throw new Error(`Patch service worker v179 tidak lengkap: ${marker}`);
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("Navigasi paksa tab lama masih aktif.");
await writeFile(file, source);
console.log(`Patched public/sw.js for ${RELEASE}`);

await import("./patch-production-recovery-v180.mjs");
await import("./patch-production-recovery-v180-legacy-markers.mjs");
await import("./patch-production-recovery-v180-compat.mjs");
await import("./patch-service-worker-v181.mjs");
await import("./patch-site-limit-summary-v182.mjs");
await import("./patch-studio-production-v183.mjs");
await import("./patch-production-data-v186-bootstrap-fix.mjs");
await import("./patch-production-data-v186-nara-fix.mjs");
await import("./patch-production-data-v186.mjs");
await import("./patch-workflow-compat-v186.mjs");
await import("./patch-production-ui-v187.mjs");
await import("./patch-production-physical-mobile-v188.mjs");
await import("./patch-production-mobile-v189.mjs");
await import("./patch-studio-screenshot-v193.mjs");
await import("./patch-studio-nara-theme-v194.mjs");
await import("./patch-studio-bootstrap-v195-publish-fix.mjs");
await import("./patch-studio-persisted-session-v198-generator.mjs");
await import("./patch-studio-bootstrap-v195.mjs");
await import("./patch-studio-bootstrap-v195-compat.mjs");
await import("./patch-studio-bootstrap-v196-v186-bridge.mjs");
await import("./patch-studio-bootstrap-v196.mjs");
await import("./patch-studio-bootstrap-v196-compat.mjs");
await import("./patch-studio-session-race-v197.mjs");
await import("./patch-studio-persisted-session-v198.mjs");

// Historical authorities remain executable for regression compatibility. v222
// establishes the code gutter/Nara attachment geometry; v223 locks physical UI;
// v224 owns transient data re-auth; v225 owns responsive Studio/Nara UI; v226
// owns the native React green Theme map; v227 aligns Nara model/intelligence;
// v228 locks physical layout/editor/Nara; v229 locks map/sidebar/profile; v230
// owns bounded-preview/bootstrap recovery; v231 owns the green map and single-n
// geometry; v232 owns screenshot controls; v233 owns bounded data failover; v234
// owns screenshot geometry; v235 preempts historical interaction listeners and
// owns single-n/layout/code/Nara interactions; v236 guards real-device geometry;
// v237 corrects the React source and physical-device geometry after all of them.
await import("./patch-production-v202.mjs");
await import("./patch-production-v203.mjs");
await import("./patch-production-v204.mjs");
await import("./patch-production-v205.mjs");
await import("./patch-production-v205-hotfix.mjs");
await import("./patch-production-v206.mjs");
await import("./patch-production-v207.mjs");
await import("./patch-sidebar-left4-v207.mjs");
await import("./patch-production-v208.mjs");
await import("./patch-production-v209.mjs");
await import("./patch-production-v209-compat.mjs");
await import("./patch-public-site-v209.mjs");
await import("./patch-production-v210.mjs");
await import("./patch-production-v211.mjs");
await import("./patch-production-v212.mjs");
await import("./patch-production-v213.mjs");
await import("./patch-production-v214.mjs");
await import("./patch-auth-late-callback-v215.mjs");
await import("./patch-production-v216.mjs");
await import("./patch-v216-v215-auth-compat.mjs");
await import("./patch-production-v222.mjs");
await import("./patch-production-v223.mjs");
await import("./patch-data-reauth-v224.mjs");
await import("./patch-v225-mode-lock.mjs");
await import("./patch-production-v225.mjs");
await import("./patch-nara-fallback-v227.mjs");
await import("./patch-production-v228.mjs");
await import("./patch-production-v229.mjs");
await import("./patch-production-v230.mjs");
await import("./patch-production-v231.mjs");
await import("./patch-production-v232.mjs");
await import("./patch-production-v233.mjs");
await import("./patch-production-v234.mjs");
await import("./patch-production-v235.mjs");
await import("./patch-production-v236.mjs");
await import("./patch-production-v237-preflight.mjs");
await import("./patch-production-v237.mjs");
await import("./patch-studio-bootstrap-v243.mjs");
await import("./patch-auth-production-v245.mjs");
// v258 extends the generated Theme model only after every historical migration,
// preserving the current v257 visual authority and old patch anchors.
await import("./patch-sidebar-right4-v258.mjs");
