import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v212-20260802";
const VERSION = "ngeblogging-app-v212-layout-code-nara-analytics-20260802";
const CACHE = "layout-code-nara-analytics-cache-v212";
const FORCE = "studio-v212";

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V212")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_PRODUCTION_RELEASE_V212 = "${RELEASE}";\nconst STUDIO_PRODUCTION_COMPAT_VERSION_V211 = "ngeblogging-app-v211-mobile-theme-nara-domain-20260802";\nconst STUDIO_PRODUCTION_COMPAT_CACHE_V211 = "mobile-theme-nara-domain-cache-v211";\n`);
  }
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v212 diagnostic authority: no forced navigation or session destruction.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V212_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [sw, release] = await Promise.all([read("public/sw.js"), read("public/release-v212.json")]);
  for (const [source, marker, label] of [
    [sw, VERSION, "v212 service worker"],
    [sw, CACHE, "v212 cache"],
    [sw, RELEASE, "v212 release marker"],
    [release, RELEASE, "v212 metadata"],
  ]) {
    if (!source.includes(marker)) throw new Error(`V212_VERIFY_FAILED:${label}:${marker}`);
  }
}

await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE} patch-chain isolation`);
