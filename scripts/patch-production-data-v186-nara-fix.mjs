import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/NaraAssistant.jsx", import.meta.url);
let source = await readFile(file, "utf8");
const mode = 'data-nara-mode={size === "full" ? "modal" : "nonmodal"}';

if (!source.includes(mode)) {
  const layer = source.match(/<div className="nara-assistant-layer"[^>]*>/)?.[0];
  if (!layer) throw new Error("V186_NARA_MODE_LAYER_MISSING");
  const replacement = layer.includes('aria-label="Nara AI Assistant"')
    ? layer.replace('aria-label="Nara AI Assistant"', `${mode} aria-label="Nara AI Assistant"`)
    : layer.replace(/>$/, ` ${mode}>`);
  source = source.replace(layer, replacement);
}

if (!source.includes('hidden={size !== "full"}')) {
  const backdrop = source.match(/<button className="nara-assistant-backdrop"[^>]*\/>/)?.[0];
  if (!backdrop) throw new Error("V186_NARA_BACKDROP_MISSING");
  source = source.replace(
    backdrop,
    backdrop.replace('className="nara-assistant-backdrop"', 'className="nara-assistant-backdrop" hidden={size !== "full"} aria-hidden={size !== "full"}'),
  );
}

if (!source.includes('tabIndex={size === "full" ? 0 : -1}')) {
  const backdrop = source.match(/<button className="nara-assistant-backdrop"[^>]*\/>/)?.[0];
  if (!backdrop) throw new Error("V186_NARA_TABINDEX_BACKDROP_MISSING");
  source = source.replace(
    backdrop,
    backdrop.replace('className="nara-assistant-backdrop"', 'className="nara-assistant-backdrop" tabIndex={size === "full" ? 0 : -1}'),
  );
}

for (const marker of [mode, 'hidden={size !== "full"}', 'tabIndex={size === "full" ? 0 : -1}']) {
  if (!source.includes(marker)) throw new Error(`V186_NARA_NORMALIZE_FAILED:${marker}`);
}

await writeFile(file, source);
console.log("Normalized Nara source for v186.");
