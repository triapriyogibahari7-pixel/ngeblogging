import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
const ACTIVE_VERSION = "ngeblogging-app-v216-theme-nara-layout-route-20260802";
const ACTIVE_CACHE = "theme-nara-layout-route-cache-v216";
const V215_VERSION = 'const STUDIO_PRODUCTION_COMPAT_VERSION_V215 = "ngeblogging-app-v215-auth-late-callback-20260802";';
const V215_CACHE = 'const STUDIO_PRODUCTION_COMPAT_CACHE_V215 = "auth-late-callback-cache-v215";';
const V215_RECOVERY = "auth-late-callback-recovery-v215-20260802";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V216_V215_COMPAT_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

let source = await readFile(file, "utf8");
source = insertAfterVersion(source, V215_VERSION);
source = insertAfterVersion(source, V215_CACHE);

for (const marker of [ACTIVE_VERSION, ACTIVE_CACHE, V215_VERSION, V215_CACHE, V215_RECOVERY]) {
  if (!source.includes(marker)) throw new Error(`V216_V215_AUTH_COMPAT_MISSING:${marker}`);
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) {
  throw new Error("V216_V215_AUTH_COMPAT_FORCED_NAVIGATION_REMAINS");
}

await writeFile(file, source);
console.log("Preserved v215 auth recovery compatibility markers under v216");

// v218 keeps the public site atomic. v219 provides eager Theme recovery. v220
// locks desktop-site and repairs code/Nara. v221 establishes the green semantic
// map. v222 is the final screenshot authority for the full-width green map,
// actual line-numbered code editor, fixed Camera/Photo/File attachment menu and
// stable mode lock. None of these layers may destroy the authenticated session.
await import("./patch-public-site-v218.mjs");
await import("./patch-production-v219.mjs");
await import("./patch-production-v220.mjs");
await import("./patch-production-v221.mjs");
await import("./patch-production-v222.mjs");
