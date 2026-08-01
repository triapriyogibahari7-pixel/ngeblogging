import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
let source = await readFile(file, "utf8");
const RELEASE = "studio-bootstrap-v196-v195-cache-compat";
const VERSION_MARKER = 'const STUDIO_BOOTSTRAP_SESSION_FIRST_COMPAT_VERSION_V195 = "ngeblogging-app-v195-session-first-20260801";';
const CACHE_MARKER = 'const STUDIO_BOOTSTRAP_SESSION_FIRST_COMPAT_CACHE_V195 = "studio-bootstrap-session-first-cache-v195";';

function insertAfterVersion(value, line) {
  if (value.includes(line)) return value;
  const next = value.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === value) throw new Error(`V196_COMPAT_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

source = insertAfterVersion(source, VERSION_MARKER);
source = insertAfterVersion(source, CACHE_MARKER);

for (const marker of [VERSION_MARKER, CACHE_MARKER]) {
  if (!source.includes(marker)) throw new Error(`V196_V195_COMPAT_MARKER_MISSING:${marker}`);
}
if (!source.includes('const VERSION = "ngeblogging-app-v196-live-recovery-20260802";')) {
  throw new Error("V196_ACTIVE_VERSION_WAS_NOT_PRESERVED");
}
if (!source.includes('const CACHE_RELEASE = "studio-bootstrap-live-recovery-cache-v196";')) {
  throw new Error("V196_ACTIVE_CACHE_WAS_NOT_PRESERVED");
}

await writeFile(file, source);
console.log(`Applied ${RELEASE}`);
