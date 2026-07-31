import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve("public/sw.js");
let source = readFileSync(file, "utf8");
const marker = "/* v177 patch-chain compatibility markers */";
if (!source.includes(marker)) {
  const anchors = [
    'const VERSION = "ngeblogging-app-v179-runtime-authority-20260731";',
    'const VERSION = "ngeblogging-app-v179-production-stability-20260731";',
  ];
  const anchor = anchors.find((value) => source.includes(value));
  if (!anchor) throw new Error("PATCH_V179_COMPAT_VERSION_MISSING");
  source = source.replace(anchor, `${anchor}\n${marker}\n// const VERSION = "ngeblogging-app-v177-screenshot-stability-20260731";\n// const CACHE_RELEASE = "screenshot-stability-cache-v177";\n// const FORCE_REFRESH_VALUE = "screenshot-stability-v177";`);
  writeFileSync(file, source, "utf8");
}
