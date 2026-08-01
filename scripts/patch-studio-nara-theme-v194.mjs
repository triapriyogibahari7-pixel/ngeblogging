import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-nara-theme-v194-20260801";
const VERSION = "ngeblogging-app-v194-nara-theme-20260801";
const CACHE = "nara-theme-cache-v194";
const V193_VERSION = 'const SCREENSHOT_RECOVERY_COMPAT_VERSION_V193 = "ngeblogging-app-v193-screenshot-recovery-20260801";';
const V193_CACHE = 'const SCREENSHOT_RECOVERY_COMPAT_CACHE_V193 = "screenshot-recovery-cache-v193";';

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V194_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-nara-theme-v194.js";')) {
    const anchor = 'import "./studio-screenshot-recovery-v193-hotfix.css";';
    if (!source.includes(anchor)) throw new Error("V194_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\nimport "./studio-nara-theme-v194.js";`);
    await write(path, source);
  }
}

async function patchNaraSource() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);

  const launcherCurrent = '<button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">';
  const launcherV194 = '<button className="nara-floating-button" onClick={() => { changeSize("small"); setOpen(true); }} aria-label="Buka Nara AI Assistant">';
  source = replaceOnce(source, launcherCurrent, launcherV194, "NARA_SMALL_FIRST");

  const layerCurrent = '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">';
  const layerV194 = '<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} data-nara-react-modal-v194={size === "full" ? "modal" : "nonmodal"} aria-label="Nara AI Assistant">';
  source = replaceOnce(source, layerCurrent, layerV194, "NARA_REACT_MODAL_STATE");

  const backdropCurrent = '<button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />';
  const backdropV194 = '<button className="nara-assistant-backdrop" hidden={size !== "full"} aria-hidden={size !== "full"} tabIndex={size === "full" ? 0 : -1} onClick={closeNara} aria-label="Tutup Nara" />';
  source = replaceOnce(source, backdropCurrent, backdropV194, "NARA_BACKDROP_FIRST_PAINT");

  const shellCurrent = '<aside className="nara-assistant-shell" aria-busy={busy} data-nara-size={size} data-nara-native-size="v149">';
  const shellV194 = '<aside className="nara-assistant-shell" aria-busy={busy} aria-modal={size === "full"} data-nara-size={size} data-nara-native-size="v149" data-nara-controls="single-row-v194">';
  source = replaceOnce(source, shellCurrent, shellV194, "NARA_SHELL_MODAL_STATE");

  if (!source.includes("recognition.current = null;")) {
    const closeCurrent = `  const closeNara = () => {\n    stopSpeech();\n    setOpen(false);\n  };`;
    const closeV194 = `  const closeNara = () => {\n    recognition.current?.stop?.();\n    recognition.current = null;\n    setListening(false);\n    stopSpeech();\n    setAttachmentMenu(false);\n    setOpen(false);\n  };`;
    source = replaceOnce(source, closeCurrent, closeV194, "NARA_CLOSE_HARDENING");
  }

  await write(path, source);
}

async function patchOlderNaraObservers() {
  for (const path of ["src/studio-screenshot-recovery-v191.js", "src/studio-screenshot-recovery-v193.js"]) {
    let source = await read(path);
    source = source.replace(
      '  layer.setAttribute("aria-modal", String(full));\n  shell.setAttribute("aria-modal", String(full));',
      '  if (layer.getAttribute("aria-modal") !== String(full)) layer.setAttribute("aria-modal", String(full));\n  if (shell.getAttribute("aria-modal") !== String(full)) shell.setAttribute("aria-modal", String(full));',
    );
    source = source.replace(
      '    backdrop.setAttribute("aria-hidden", String(!full));',
      '    if (backdrop.getAttribute("aria-hidden") !== String(!full)) backdrop.setAttribute("aria-hidden", String(!full));',
    );
    await write(path, source);
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "nara-theme-v194";');

  for (const line of [V193_VERSION, V193_CACHE]) {
    if (!source.includes(line)) source = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  }
  if (!source.includes("STUDIO_NARA_THEME_RELEASE_V194")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_NARA_THEME_RELEASE_V194 = "${RELEASE}";\n`);
  }
  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V193", "NGE_BLOGGING_UPDATE_AVAILABLE_V194")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V192", "NGE_BLOGGING_UPDATE_AVAILABLE_V194")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v194 announces a new shell without forcing navigation or destroying the active session.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V194_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V194_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-nara-theme-v194.js"],
    ["src/studio-nara-theme-v194.js", RELEASE],
    ["src/studio-nara-theme-v194.js", "single-row-controls"],
    ["src/studio-nara-theme-v194.css", ".tn-library>header"],
    ["src/studio-nara-theme-v194.css", ".tn-layout-studio-header"],
    ["src/studio-nara-theme-v194.css", 'grid-template-areas:"title sizes voice reset close"'],
    ["src/studio-nara-theme-v194.css", "grid-template-columns:30px 30px minmax(58px,.82fr) minmax(72px,1fr) 32px"],
    ["src/studio-nara-theme-v194.css", ':has(> .nara-assistant-shell[data-nara-size="small"])'],
    ["src/NaraAssistant.jsx", 'changeSize("small"); setOpen(true)'],
    ["src/NaraAssistant.jsx", 'aria-modal={size === "full"}'],
    ["src/NaraAssistant.jsx", 'hidden={size !== "full"}'],
    ["src/NaraAssistant.jsx", "recognition.current = null;"],
    ["src/lib/supabase.js", "persistSession: true"],
    ["src/lib/supabase.js", "autoRefreshToken: true"],
    ["src/StudioOnboardingGate.jsx", "listUserSitesDirectV192"],
    ["public/release-v194.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V194_VERIFY_FAILED:${path}:${marker}`);
  }

  const worker = await read("public/sw.js");
  for (const marker of [VERSION, CACHE, RELEASE, V193_VERSION, V193_CACHE]) {
    if (!worker.includes(marker)) throw new Error(`V194_SERVICE_WORKER_MARKER_MISSING:${marker}`);
  }
  if (/await refreshStaleWindow\(client, url\);/.test(worker)) throw new Error("V194_FORCED_NAVIGATION_REINTRODUCED");
}

await patchStudioEntry();
await patchNaraSource();
await patchOlderNaraObservers();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
