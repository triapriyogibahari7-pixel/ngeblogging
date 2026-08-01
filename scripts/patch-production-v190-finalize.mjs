import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const path = new URL("src/lib/supabase.js", root);
let source = await readFile(path, "utf8");

/* The v190 transport patch replaces the full authAwareFetch function. When the
   historical source includes its closing brace in the range boundary, normalize
   a possible duplicated brace before Vite parses the module. This is intentionally
   narrow and idempotent. */
source = source.replace(
  /return nativeFetch\(input, init\);\n}\n}\n\nexport const supabase/,
  "return nativeFetch(input, init);\n}\n\nexport const supabase",
);

if (!source.includes("DATA_TRANSPORT_RELEASE_V190")) throw new Error("V190_FINALIZE_DATA_MARKER_MISSING");
if (!source.includes("proxiedDataUrlV190")) throw new Error("V190_FINALIZE_DATA_PROXY_MISSING");
if (/return nativeFetch\(input, init\);\n}\n}\n\nexport const supabase/.test(source)) {
  throw new Error("V190_FINALIZE_DUPLICATE_BRACE_REMAINS");
}

await writeFile(path, source, "utf8");
console.log("Finalized Studio v190 generated transport source.");
