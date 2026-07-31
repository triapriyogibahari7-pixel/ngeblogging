import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
const RELEASE = "studio-mobile-runtime-v179-20260731";
const VERSION = "ngeblogging-app-v179-mobile-runtime-20260731";
const CACHE = "mobile-runtime-cache-v179";
const COMPAT = `const FIRST_SITE_COMPAT_VERSION_V169 = "ngeblogging-app-v169-first-site-20260730";\nconst FIRST_SITE_COMPAT_CACHE_V169 = "first-site-cache-v169";\nconst MOBILE_RUNTIME_RELEASE = "${RELEASE}";`;

let source = await readFile(file, "utf8");
source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "mobile-runtime-v179";');
source = source.replaceAll("NGE_BLOGGING_FORCE_RELOAD_V169", "NGE_BLOGGING_UPDATE_AVAILABLE_V179");

if (!source.includes("FIRST_SITE_COMPAT_VERSION_V169")) {
  source = source.replace(/^(const VERSION = .*;\n)/m, `$1${COMPAT}\n`);
}

source = source.replace(
  /\n\s*await refreshStaleWindow\(client, url\);/,
  "\n      // v179 memberi tahu tab lama tanpa navigasi paksa; pengguna tidak dikeluarkan dari editor atau callback autentikasi.",
);

if (!source.includes(VERSION) || !source.includes(CACHE) || !source.includes(RELEASE)) {
  throw new Error("Patch service worker v179 tidak lengkap.");
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) {
  throw new Error("Navigasi paksa tab lama masih aktif.");
}

await writeFile(file, source);
console.log(`Patched public/sw.js for ${RELEASE}`);

// v180 berjalan sesudah authority v179 selesai agar tidak ada race condition atau beforeExit patch.
await import("./patch-production-recovery-v180.mjs");
