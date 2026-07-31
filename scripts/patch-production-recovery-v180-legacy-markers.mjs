import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/lib/supabase.js", import.meta.url);
let source = await readFile(file, "utf8");
const marker = 'const AUTH_COMPAT_RELEASE_V153 = "auth-production-v153-20260730";';

if (!source.includes(marker)) {
  source = source.replace(
    /^(const AUTH_RELEASE = .*;\n)/m,
    `$1${marker}\n`,
  );
}

if (!source.includes(marker) || !source.includes("direct-fallback-v180")) {
  throw new Error("V180_AUTH_LEGACY_MARKER_INCOMPLETE");
}

await writeFile(file, source);
console.log("Auth v180 retains the v153 regression marker while using safe fallback.");
