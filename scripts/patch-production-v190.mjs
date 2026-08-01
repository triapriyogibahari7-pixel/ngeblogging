import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-real-device-v190-20260801";

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-real-device-v190.js";')) {
    const anchor = 'import "./studio-production-mobile-v189-fix.css";';
    if (!source.includes(anchor)) throw new Error("V190_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\nimport "./studio-real-device-v190.js";`);
    await write(path, source);
  }
}

async function patchNaraClose() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);
  const current = `  const closeNara = () => {
    stopSpeech();
    setOpen(false);
  };`;
  const hardened = `  const closeNara = () => {
    recognition.current?.stop?.();
    recognition.current = null;
    setListening(false);
    stopSpeech();
    setAttachmentMenu(false);
    setOpen(false);
  };`;
  if (!source.includes("recognition.current = null;")) {
    if (!source.includes(current)) throw new Error("V190_NARA_CLOSE_ANCHOR_MISSING");
    source = source.replace(current, hardened);
    await write(path, source);
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v190-real-device-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "real-device-cache-v190";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "real-device-v190";');
  if (!source.includes("REAL_DEVICE_RELEASE_V190")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, '$1const REAL_DEVICE_RELEASE_V190 = "studio-real-device-v190-20260801";\n');
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V189", "NGE_BLOGGING_UPDATE_AVAILABLE_V190");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V190_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V190_SESSION_DESTRUCTIVE_ACTION_FOUND");
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-real-device-v190.js"],
    ["src/studio-real-device-v190.js", "studio-real-device-v190-20260801"],
    ["src/studio-real-device-v190.js", "studioViewportCalibrationV190"],
    ["src/studio-real-device-v190.css", "data-studio-physical-mobile-v190"],
    ["src/studio-real-device-v190.css", "background: transparent !important"],
    ["src/lib/supabase.js", "DATA_TRANSPORT_RELEASE_V190"],
    ["src/lib/supabase.js", "proxiedDataUrlV190"],
    ["src/lib/supabase.js", "same-origin-data-gateway"],
    ["src/StudioFastGate.jsx", "ngeblogging-active-site-snapshot-v190"],
    ["src/NaraAssistant.jsx", "recognition.current = null"],
    ["src/NaraAssistant.jsx", "setListening(false)"],
    ["public/release-v190.json", "studio-real-device-v190-20260801"],
    ["public/sw.js", "ngeblogging-app-v190-real-device-20260801"],
    ["public/sw.js", "real-device-cache-v190"],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V190_VERIFY_FAILED:${path}:${marker}`);
  }

  const runtime = await read("src/studio-real-device-v190.js");
  if (runtime.includes('setImportant(body, "width", `${state.physicalWidth}px`)')) {
    throw new Error("V190_BODY_PHYSICAL_WIDTH_REINTRODUCED");
  }
  const auth = await read("src/lib/supabase.js");
  if (!auth.includes("persistSession: true") || !auth.includes("autoRefreshToken: true")) {
    throw new Error("V190_AUTH_SESSION_PERSISTENCE_MISSING");
  }
}

await patchStudioEntry();
await patchNaraClose();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
