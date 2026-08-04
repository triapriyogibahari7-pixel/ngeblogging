import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/Studio.jsx", import.meta.url);
export const RELEASE = "studio-build-finalizer-v252-20260804";

const RETIRED = [
  "studio-stable-shell-v244.js",
  "studio-shell-controller-v147.js",
  "studio-production-v235.js",
  "studio-visual-stability-v241.js",
  "studio-shell-rescue-v242.js",
  "studio-sidebar-brand-v246.js",
  "studio-stable-shell-v244-final.css",
  "studio-sidebar-brand-v246.css",
  "studio-screenshot-lock-v247.css",
  "studio-final-visual-v249.css",
  "studio-final-visual-v249-hotfix.css",
];
const ACTIVE = [
  "studio-native-authority-v250.js",
  "studio-native-authority-v250.css",
  "studio-sidebar-rescue-v251.js",
  "studio-sidebar-rescue-v251.css",
  "studio-source-stability-v252.js",
  "studio-source-stability-v252.css",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeLiveImport(source, path) {
  const live = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  return source.replace(live, `// v252 build backup-only: import "./${path}";`);
}

function ensureAtEnd(source, path) {
  const live = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  source = source.replace(live, "");
  const anchor = "export default StudioFastGate;";
  if (!source.includes(anchor)) throw new Error(`V252_FINALIZER_EXPORT_ANCHOR_MISSING:${path}`);
  return source.replace(anchor, `import "./${path}";\n\n${anchor}`);
}

let source = await readFile(file, "utf8");
for (const item of RETIRED) source = removeLiveImport(source, item);
for (const item of ACTIVE) source = ensureAtEnd(source, item);
source = source.replace(/\n{3,}/g, "\n\n");

for (const item of RETIRED) {
  const live = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(item)}[\"'];?\\s*$`, "m");
  if (live.test(source)) throw new Error(`V252_FINALIZER_RETIRED_IMPORT_LIVE:${item}`);
}
for (const item of ACTIVE) {
  const live = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(item)}[\"'];?\\s*$`, "m");
  if (!live.test(source)) throw new Error(`V252_FINALIZER_ACTIVE_IMPORT_MISSING:${item}`);
}
for (let index = 1; index < ACTIVE.length; index += 1) {
  if (!(source.indexOf(`import "./${ACTIVE[index]}";`) > source.indexOf(`import "./${ACTIVE[index - 1]}";`))) {
    throw new Error(`V252_FINALIZER_ORDER_INVALID:${ACTIVE[index]}`);
  }
}

await writeFile(file, source);
console.log(`Applied ${RELEASE}: v252 remains last without touching auth or onboarding.`);
