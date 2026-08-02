import { readFile, writeFile } from "node:fs/promises";

const SW_FILE = new URL("../public/sw.js", import.meta.url);
const STUDIO_FILE = new URL("../src/Studio.jsx", import.meta.url);
const RUNTIME_FILE = new URL("../src/studio-production-v208.js", import.meta.url);
const CSS_FILE = new URL("../src/studio-production-v208.css", import.meta.url);
const FAST_GATE_FILE = new URL("../src/StudioFastGate.jsx", import.meta.url);

const RELEASE = "studio-production-v208-20260802";
const VERSION = "ngeblogging-app-v208-studio-stability-20260802";
const CACHE = "studio-stability-cache-v208";
const COMPAT = 'const STUDIO_V207_COMPAT_VERSION = "studio-production-v207-20260802";';
const MARKER = `const STUDIO_V208_RELEASE = "${RELEASE}";`;

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`v208 tidak menemukan VERSION untuk ${line}`);
  return next;
}

let sw = await readFile(SW_FILE, "utf8");
sw = sw.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
sw = sw.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
sw = sw.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "studio-v208";');
sw = insertAfterVersion(sw, COMPAT);
sw = insertAfterVersion(sw, MARKER);

const [studio, runtime, css, fastGate] = await Promise.all([
  readFile(STUDIO_FILE, "utf8"),
  readFile(RUNTIME_FILE, "utf8"),
  readFile(CSS_FILE, "utf8"),
  readFile(FAST_GATE_FILE, "utf8"),
]);

const required = [
  [studio, 'import "./studio-production-v208.js";', "Studio v208 import"],
  [runtime, 'studio-production-v208-20260802', "runtime release"],
  [runtime, 'exactly-four', "single Theme actions"],
  [runtime, 'spatial-map', "spatial Theme Layout Map"],
  [runtime, 'camera-photo-file', "Nara native attachment menu"],
  [runtime, 'recoverMembership', "bounded membership recovery"],
  [css, 'data-v208-layout-map="spatial-map"', "layout-map CSS"],
  [css, '.sidebar-left-4', "fourth left widget map area"],
  [css, 'data-v208-attachment-menu="camera-photo-file"', "Nara attachment CSS"],
  [fastGate, 'ngeblogging-active-site-snapshot-v195', "current active-site snapshot"],
  [fastGate, 'ngeblogging-active-site-snapshot-v192', "recovery active-site snapshot"],
];
for (const [source, marker, label] of required) {
  if (!source.includes(marker)) throw new Error(`v208 regression gate gagal: ${label}`);
}
for (const marker of [VERSION, CACHE, RELEASE, COMPAT, MARKER]) {
  if (!sw.includes(marker)) throw new Error(`v208 service worker belum lengkap: ${marker}`);
}
if (/await refreshStaleWindow\(client, url\);/.test(sw)) {
  throw new Error("v208 menolak forced navigation service worker pada tab login/editor");
}

await writeFile(SW_FILE, sw);
console.log(`Patched production shell for ${RELEASE}`);