import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE = "nara-native-mobile-v177";
const path = resolve("src/NaraAssistant.jsx");
let source = readFileSync(path, "utf8");

function replaceAny(candidates, replacement, label) {
  if (source.includes(replacement)) return;
  const anchor = candidates.find((candidate) => source.includes(candidate));
  if (!anchor) throw new Error(`PATCH_NARA_V177_MISSING:${label}`);
  source = source.replace(anchor, replacement);
}

replaceAny([
  '<button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">',
], '<button className="nara-floating-button" onClick={() => { changeSize("small"); setOpen(true); }} aria-label="Buka Nara AI Assistant">', "launcher-small");

replaceAny([
  '<div className="nara-assistant-layer" data-nara-layer-size={size} role="dialog" aria-modal={size === "full"} aria-label="Nara AI Assistant">',
  '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">',
], '<div className="nara-assistant-layer" data-nara-layer-size={size} role="dialog" aria-modal={size === "full"} data-nara-native-interaction="v177" data-nara-interaction-native={size === "full" ? "modal" : "nonmodal"} aria-label="Nara AI Assistant">', "layer-state");

replaceAny([
  '<button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />',
], '<button className="nara-assistant-backdrop" hidden={size !== "full"} aria-hidden={size !== "full"} onClick={closeNara} aria-label="Tutup Nara" />', "backdrop-full-only");

replaceAny([
  '<button onClick={resetChat} title="Percakapan baru"><RotateCcw /></button>\n              <button onClick={closeNara} title="Tutup"><X /></button>',
], '<button className="nara-reset-v177" onClick={resetChat} aria-label="Percakapan baru" title="Percakapan baru"><RotateCcw /></button>\n              <button className="nara-close-v177" data-nara-close-v177="native" onClick={closeNara} aria-label="Tutup Nara AI" title="Tutup Nara AI"><X /></button>', "reset-close");

for (const marker of [
  'changeSize("small"); setOpen(true)',
  'data-nara-native-interaction="v177"',
  'data-nara-interaction-native={size === "full" ? "modal" : "nonmodal"}',
  'hidden={size !== "full"}',
  'className="nara-close-v177"',
]) {
  if (!source.includes(marker)) throw new Error(`PATCH_NARA_V177_INCOMPLETE:${marker}`);
}

writeFileSync(path, source, "utf8");
console.log(`Nara native authority ${RELEASE} aktif.`);
