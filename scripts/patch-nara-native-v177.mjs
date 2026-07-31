import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE = "nara-native-mobile-v177-launcher";
const path = resolve("src/NaraAssistant.jsx");
let source = readFileSync(path, "utf8");
const search = '<button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">';
const replacement = '<button className="nara-floating-button" onClick={() => { changeSize("small"); setOpen(true); }} aria-label="Buka Nara AI Assistant">';
if (!source.includes(replacement)) {
  if (!source.includes(search)) throw new Error("PATCH_NARA_V177_MISSING:launcher-small");
  source = source.replace(search, replacement);
}
if (!source.includes('changeSize("small"); setOpen(true)')) throw new Error("PATCH_NARA_V177_INCOMPLETE:launcher-small");
writeFileSync(path, source, "utf8");
console.log(`Nara native authority ${RELEASE} aktif.`);
