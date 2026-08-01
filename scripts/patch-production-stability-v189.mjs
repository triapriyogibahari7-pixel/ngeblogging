import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-stability-v189-20260801";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V189_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-stability-v189.js";')) {
    source = replaceOnce(
      source,
      'import "./studio-physical-mobile-v188.js";',
      'import "./studio-physical-mobile-v188.js";\nimport "./studio-production-stability-v189.js";',
      "STUDIO_ENTRY",
    );
    await write(path, source);
  }
}

async function patchNaraSource() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);

  const oldClose = `  const closeNara = () => {\n    stopSpeech();\n    setOpen(false);\n  };`;
  const newClose = `  const closeNara = () => {\n    stopSpeech();\n    try { recognition.current?.stop?.(); } catch { /* izin/browser dapat berubah */ }\n    recognition.current = null;\n    setListening(false);\n    setAttachmentMenu(false);\n    activeRequest.current?.abort?.();\n    activeRequest.current = null;\n    setOpen(false);\n  };`;
  if (!source.includes("recognition.current = null;")) {
    source = replaceOnce(source, oldClose, newClose, "NARA_CLOSE_CLEANUP");
  }

  source = source.replace(
    '<button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">',
    '<button className="nara-floating-button" onClick={() => { changeSize("small"); setOpen(true); }} aria-label="Buka Nara AI Assistant dalam ukuran kecil">',
  );

  const mode = 'data-nara-mode={size === "full" ? "modal" : "nonmodal"}';
  if (!source.includes(mode)) {
    source = source.replace(
      '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">',
      `<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} ${mode} aria-label="Nara AI Assistant">`,
    );
  }
  if (!source.includes('hidden={size !== "full"}')) {
    source = source.replace(
      /<button className="nara-assistant-backdrop"[^>]*\/>/,
      '<button className="nara-assistant-backdrop" hidden={size !== "full"} aria-hidden={size !== "full"} tabIndex={size === "full" ? 0 : -1} onClick={closeNara} aria-label="Tutup Nara" />',
    );
  }

  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v189-stability-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "studio-stability-cache-v189";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "studio-stability-v189";');
  if (!source.includes("PRODUCTION_STABILITY_RELEASE_V189")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      '$1const PRODUCTION_STABILITY_RELEASE_V189 = "studio-production-stability-v189-20260801";\n',
    );
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V188", "NGE_BLOGGING_UPDATE_AVAILABLE_V189");
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V187", "NGE_BLOGGING_UPDATE_AVAILABLE_V189");
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V179", "NGE_BLOGGING_UPDATE_AVAILABLE_V189");
  source = source.replace(
    /\n\s*await refreshStaleWindow\(client, url\);/g,
    "\n      // v189 tidak memaksa navigasi; sesi, editor, dan callback autentikasi dipertahankan.",
  );
  if (/await refreshStaleWindow\(client, url\);/.test(source)) {
    throw new Error("V189_FORCED_NAVIGATION_REMAINS");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-production-stability-v189.js"],
    ["src/studio-production-stability-v189.js", RELEASE],
    ["src/studio-production-stability-v189.css", 'data-studio-desktop-site-phone-v189="true"'],
    ["src/studio-production-stability-v189.css", "--v189-layout-width"],
    ["src/studio-production-stability-v189.css", ".mv176-title-actions"],
    ["src/studio-production-stability-v189.css", ".op41-chart-grid"],
    ["src/studio-production-stability-v189.css", 'data-production-nara-mode-v189="nonmodal"'],
    ["src/StudioNext.jsx", "studio-bootstrap-resilient-v186"],
    ["src/StudioOnboardingGate.jsx", "degraded-session-retained"],
    ["src/lib/supabase.js", "auth-resilience-v189"],
    ["src/lib/supabase.js", "direct-supabase-oauth"],
    ["src/NaraAssistant.jsx", "recognition.current = null;"],
    ["src/NaraAssistant.jsx", 'data-nara-mode={size === "full" ? "modal" : "nonmodal"}'],
    ["public/sw.js", "ngeblogging-app-v189-stability-20260801"],
    ["public/sw.js", "studio-stability-cache-v189"],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V189_VERIFY_FAILED:${path}:${marker}`);
  }

  const css = await read("src/studio-production-stability-v189.css");
  if (/data-studio-desktop-site-phone-v189="true"\]\s+body\s*\{[^}]*width:\s*var\(--v189-physical-width\)/s.test(css)) {
    throw new Error("V189_BODY_PHYSICAL_WIDTH_CLIPPING_REGRESSION");
  }
  const auth = await read("src/lib/supabase.js");
  const providerStart = auth.indexOf("function providerDestination");
  const providerEnd = auth.indexOf("export async function signInWithProvider", providerStart);
  if (providerStart < 0 || providerEnd < 0 || /proxiedAuthUrl/.test(auth.slice(providerStart, providerEnd))) {
    throw new Error("V189_OAUTH_PROVIDER_STILL_PROXIED");
  }
  const sw = await read("public/sw.js");
  if (/await refreshStaleWindow\(client, url\);/.test(sw)) throw new Error("V189_FORCED_SW_NAVIGATION");
}

await patchStudioEntry();
await patchNaraSource();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);