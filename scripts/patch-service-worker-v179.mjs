import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
const RELEASE = "studio-mobile-runtime-v179-20260731";
const VERSION = "ngeblogging-app-v179-mobile-runtime-20260731";
const CACHE = "mobile-runtime-cache-v179";
const CURRENT_RELEASE = "studio-responsive-shell-v262-20260804-r1";
const CURRENT_VERSION = "ngeblogging-app-v262-responsive-shell-r1-20260804";
const CURRENT_CACHE = "studio-responsive-shell-cache-v262-r1";
const UI_PATCH_RELEASE_V263 = "studio-shell-v263-20260804";
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

function replaceOrInsert(source, name, expression) {
  const line = `const ${name} = ${expression};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  return insertAfterVersion(source, line);
}

async function restoreCurrentServiceWorker() {
  let current = await readFile(file, "utf8");
  current = current
    .replace(/^const VERSION = .*;$/m, `const VERSION = "${CURRENT_VERSION}";`)
    .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CURRENT_CACHE}";`)
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v263: no automatic second navigation after service-worker activation.");
  current = replaceOrInsert(current, "STUDIO_STABILITY_RELEASE_V260", `"${CURRENT_RELEASE}"`);
  current = replaceOrInsert(current, "UI_PATCH_RELEASE_V263", `"${UI_PATCH_RELEASE_V263}"`);
  current = replaceOrInsert(current, "ACTIVE_VERSION_V260", "VERSION");
  current = replaceOrInsert(current, "ACTIVE_CACHE_RELEASE_V260", "CACHE_RELEASE");
  current = current
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V179", "NGE_BLOGGING_UPDATE_AVAILABLE_V260")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V258", "NGE_BLOGGING_UPDATE_AVAILABLE_V260")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V259", "NGE_BLOGGING_UPDATE_AVAILABLE_V260")
    .replaceAll("service-worker-activated-stability-v260-r2", "service-worker-activated-responsive-shell-v262-r1")
    .replaceAll("service-worker-activated-stability-v260-r3", "service-worker-activated-responsive-shell-v262-r1");

  if (!current.includes("reloadRequired: false")) {
    current = current.replace(
      /reason:\s*"service-worker-activated-responsive-shell-v262-r1",/,
      'reason: "service-worker-activated-responsive-shell-v262-r1",\n        reloadRequired: false,',
    );
  }
  for (const marker of [CURRENT_VERSION, CURRENT_CACHE, CURRENT_RELEASE, UI_PATCH_RELEASE_V263, "ACTIVE_VERSION_V260", "ACTIVE_CACHE_RELEASE_V260", "NGE_BLOGGING_UPDATE_AVAILABLE_V260"]) {
    if (!current.includes(marker)) throw new Error(`V263_POST_PATCH_RESTORE_MISSING:${marker}`);
  }
  if (/await refreshStaleWindow\(client, url\);/.test(current)) throw new Error("V263_POST_PATCH_DOUBLE_RELOAD_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(current)) throw new Error("V263_POST_PATCH_SESSION_DESTRUCTIVE_ACTION");
  await writeFile(file, current);
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
await import("./patch-sidebar-right4-v258.mjs");

// Historical migrations above may validate/migrate older repositories. The v262
// compatibility version stays intact, while v263 preserves the compatibility marker.
await restoreCurrentServiceWorker();
await import("./patch-service-worker-v265.mjs");
console.log(`Restored public/sw.js to ${CURRENT_RELEASE} + ${UI_PATCH_RELEASE_V263}, then rotated the final v265 UI cache namespace.`);
