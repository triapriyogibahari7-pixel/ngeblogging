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

// Compatibility subchain intentionally stops at v222. v223 must not be imported
// here because ESM import caching would prevent the final v223 import in
// patch-service-worker-v179.mjs from executing after v222. The top-level chain
// owns v223 as the single final production authority.
await import("./patch-public-site-v218.mjs");
await import("./patch-production-v219.mjs");
await import("./patch-production-v220.mjs");
await import("./patch-production-v221.mjs");
await import("./patch-production-v222.mjs");
