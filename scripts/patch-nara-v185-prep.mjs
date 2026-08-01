import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/NaraAssistant.jsx", import.meta.url);
let source = await readFile(file, "utf8");
const MODE = 'data-nara-mode={size === "full" ? "modal" : "nonmodal"}';

if (!source.includes(MODE)) {
  if (source.includes('aria-modal="true" aria-label="Nara AI Assistant"')) {
    source = source.replace(
      'aria-modal="true" aria-label="Nara AI Assistant"',
      `aria-modal={size === "full"} ${MODE} aria-label="Nara AI Assistant"`,
    );
  } else if (source.includes('aria-modal={size === "full"} aria-label="Nara AI Assistant"')) {
    source = source.replace(
      'aria-modal={size === "full"} aria-label="Nara AI Assistant"',
      `aria-modal={size === "full"} ${MODE} aria-label="Nara AI Assistant"`,
    );
  } else {
    const anchor = 'aria-label="Nara AI Assistant">';
    if (!source.includes(anchor)) throw new Error("V185_NARA_PREP_LAYER_ANCHOR_MISSING");
    source = source.replace(anchor, `${MODE} ${anchor}`);
  }
}

if (!source.includes('tabIndex={size === "full" ? 0 : -1}')) {
  const match = source.match(/<button className="nara-assistant-backdrop"[^>]*\/>/);
  if (!match) throw new Error("V185_NARA_PREP_BACKDROP_ANCHOR_MISSING");
  source = source.replace(
    match[0],
    '<button className="nara-assistant-backdrop" hidden={size !== "full"} aria-hidden={size !== "full"} tabIndex={size === "full" ? 0 : -1} onClick={closeNara} aria-label="Tutup Nara" />',
  );
}

for (const marker of [
  'aria-modal={size === "full"}',
  MODE,
  'hidden={size !== "full"}',
  'tabIndex={size === "full" ? 0 : -1}',
]) {
  if (!source.includes(marker)) throw new Error(`V185_NARA_PREP_VERIFY_FAILED:${marker}`);
}

await writeFile(file, source);
console.log("Prepared Nara source for v183/v185 compatibility.");
