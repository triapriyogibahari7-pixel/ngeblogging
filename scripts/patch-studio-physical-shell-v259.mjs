import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/Studio.jsx", import.meta.url);
const RELEASE = "studio-physical-shell-v259-20260804";
const IMPORTS = [
  'import "./studio-physical-shell-v259.js";',
  'import "./studio-physical-shell-v259.css";',
];

let source = await readFile(file, "utf8");
const anchor = "export default StudioFastGate;";
if (!source.includes(anchor)) throw new Error("V259_PATCH_STUDIO_EXPORT_ANCHOR_MISSING");

for (const statement of IMPORTS) {
  source = source.replace(new RegExp(`^\\s*${statement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "gm"), "");
}
source = source.replace(anchor, `${IMPORTS.join("\n")}\n\n${anchor}`).replace(/\n{3,}/g, "\n\n");

const v257 = source.lastIndexOf('import "./studio-visual-native-v257.css";');
const v259js = source.lastIndexOf(IMPORTS[0]);
const v259css = source.lastIndexOf(IMPORTS[1]);
if (!(v257 >= 0 && v259js > v257 && v259css > v259js)) throw new Error("V259_PATCH_FINAL_ORDER_INVALID");

await writeFile(file, source, "utf8");
console.log(`Patched Studio imports for ${RELEASE}`);
