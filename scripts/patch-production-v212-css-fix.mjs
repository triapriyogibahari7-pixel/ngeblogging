import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/studio-production-v212.css", import.meta.url);
let source = await readFile(file, "utf8");
const broken = `html[data-studio-v212-device="handheld"] .tn-code-workspace-v212,\nhtml[data-studio-v212-device="handheld"] .tn-code-workspace.tn-code-workspace-v212,\n@media (max-width:760px) {`;
if (source.includes(broken)) {
  source = source.replace(broken, `html[data-studio-v212-device="handheld"] .tn-code-workspace-v212,\nhtml[data-studio-v212-device="handheld"] .tn-code-workspace.tn-code-workspace-v212 {\n  grid-template-columns:1fr !important;\n  gap:10px !important;\n  overflow:visible !important;\n}\n\n@media (max-width:760px) {`);
}
if (source.includes(',\n@media (max-width:760px)')) throw new Error("V212_CSS_INVALID_MEDIA_SELECTOR");
await writeFile(file, source);
console.log("Normalized Studio v212 CSS syntax");
