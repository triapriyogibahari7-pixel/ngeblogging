import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
const VERSION = "ngeblogging-app-v203-mobile-reflow-20260802";
const CACHE = "mobile-reflow-cache-v203";
const REFRESH = "mobile-reflow-v203";
const RELEASE = 'const STUDIO_PRODUCTION_RELEASE_V203 = "studio-production-v203-20260802";';
const COMPAT = [
  'const STUDIO_PRODUCTION_COMPAT_VERSION_V202 = "ngeblogging-app-v202-mobile-theme-nara-20260802";',
  'const STUDIO_PRODUCTION_COMPAT_CACHE_V202 = "mobile-theme-nara-cache-v202";',
  'const STUDIO_PRODUCTION_COMPAT_RELEASE_V202 = "studio-production-v202-20260802";',
];

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  return source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
}

let source = await readFile(file, "utf8");
source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${REFRESH}";`);
source = source.replace(/NGE_BLOGGING_UPDATE_AVAILABLE_V\d+/g, "NGE_BLOGGING_UPDATE_AVAILABLE_V203");
source = source.replace(/NGE_BLOGGING_FORCE_RELOAD_V\d+/g, "NGE_BLOGGING_UPDATE_AVAILABLE_V203");
source = insertAfterVersion(source, RELEASE);
for (const marker of COMPAT) source = insertAfterVersion(source, marker);
source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v203 diagnostic: no forced navigation.");
await writeFile(file, source);
console.log("Applied v203 SW diagnostic without v203 verify().");
