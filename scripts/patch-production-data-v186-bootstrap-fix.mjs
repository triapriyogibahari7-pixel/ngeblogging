import { readFile, writeFile } from "node:fs/promises";

const file = new URL("./patch-production-data-v186.mjs", import.meta.url);
let source = await readFile(file, "utf8");
const oldBlock = `    const marker = source.indexOf("Promise.all([getOrCreatePrimarySite");
    const start = source.lastIndexOf("  useEffect(() => {", marker);
    const end = source.indexOf("\\n\\n  useEffect(() => {", marker);
    if (marker < 0 || start < 0 || end < 0) throw new Error("V186_STUDIO_BOOTSTRAP_RANGE_MISSING");`;
const newBlock = `    const marker = source.indexOf("studio-bootstrap-resilient-v183") >= 0
      ? source.indexOf("studio-bootstrap-resilient-v183")
      : source.indexOf("Promise.all([getOrCreatePrimarySite");
    const start = source.lastIndexOf("  useEffect(() => {", marker);
    const end = source.indexOf("\\n\\n  useEffect(() => {", marker);
    if (marker < 0 || start < 0 || end < 0) throw new Error("V186_STUDIO_BOOTSTRAP_RANGE_MISSING");`;

if (!source.includes(newBlock)) {
  if (!source.includes(oldBlock)) throw new Error("V186_BOOTSTRAP_FIX_ANCHOR_MISSING");
  source = source.replace(oldBlock, newBlock);
  await writeFile(file, source);
}
console.log("Prepared v186 to replace the v183 bootstrap block.");
