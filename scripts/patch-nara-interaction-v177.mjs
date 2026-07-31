import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve("src/NaraAssistant.jsx");
let source = readFileSync(file, "utf8");
const RELEASE = "nara-interaction-v177-20260731";

function replaceOnce(anchor, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(anchor)) throw new Error(`PATCH_NARA_V177_${label}_ANCHOR_MISSING`);
  source = source.replace(anchor, replacement);
}

replaceOnce(
  `  const closeNara = () => {\n    stopSpeech();\n    setOpen(false);\n  };`,
  `  const closeNara = () => {\n    stopSpeech();\n    try { recognition.current?.stop?.(); } catch { /* Mikrofon mungkin sudah berhenti. */ }\n    setListening(false);\n    setAttachmentMenu(false);\n    setOpen(false);\n  };`,
  "CLOSE",
);

replaceOnce(
  `<button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">`,
  `<button className="nara-floating-button" onClick={() => { changeSize("small"); setOpen(true); }} aria-label="Buka Nara AI Assistant">`,
  "LAUNCH_SMALL",
);

replaceOnce(
  `<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">\n          <button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />`,
  `<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} data-nara-interaction-v177={size === "full" ? "modal" : "nonmodal"} aria-label="Nara AI Assistant">\n          {size === "full" && <button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />}`,
  "NONMODAL",
);

replaceOnce(
  `<button onClick={closeNara} title="Tutup"><X /></button>`,
  `<button className="nara-close-v177" onClick={closeNara} title="Tutup" aria-label="Tutup Nara"><X /></button>`,
  "CLOSE_BUTTON",
);

if (!source.includes("data-nara-interaction-v177") || !source.includes("nara-close-v177") || !source.includes('changeSize("small")')) {
  throw new Error("PATCH_NARA_V177_INCOMPLETE");
}

writeFileSync(file, source, "utf8");
console.log(`Nara interaction ${RELEASE} aktif.`);
