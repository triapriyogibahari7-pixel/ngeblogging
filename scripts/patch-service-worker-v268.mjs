import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
const RELEASE = "studio-final-device-authority-v268-20260804";
const CACHE_RELEASE = "studio-final-device-cache-v268";

function replaceOrInsert(source, name, expression) {
  const line = `const ${name} = ${expression};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const version = /^(const VERSION = .*;\n)/m;
  if (!version.test(source)) throw new Error(`V268_SW_VERSION_ANCHOR_MISSING:${name}`);
  return source.replace(version, `$1${line}\n`);
}

let source = await readFile(file, "utf8");
source = replaceOrInsert(source, "UI_PATCH_RELEASE_V268", `"${RELEASE}"`);
source = replaceOrInsert(source, "UI_CACHE_RELEASE_V268", `"${CACHE_RELEASE}"`);
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v268: notify the old tab only; never force a second navigation.");

for (const marker of [
  "UI_PATCH_RELEASE_V263",
  "UI_PATCH_RELEASE_V265",
  "UI_CACHE_RELEASE_V265",
  "UI_PATCH_RELEASE_V267",
  "UI_CACHE_RELEASE_V267",
  "UI_PATCH_RELEASE_V268",
  "UI_CACHE_RELEASE_V268",
  RELEASE,
  CACHE_RELEASE,
]) {
  if (!source.includes(marker)) throw new Error(`V268_SW_MARKER_MISSING:${marker}`);
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V268_SW_DOUBLE_RELOAD_REGRESSION");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V268_SW_SESSION_DESTRUCTIVE_ACTION");

await writeFile(file, source);
console.log(`Rotated service-worker shell/assets for ${RELEASE}`);
