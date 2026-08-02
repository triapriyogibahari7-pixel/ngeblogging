import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const write = (path, value) => writeFile(new URL(path, root), value);

const RELEASE = "studio-production-v205-20260802";
const SW_VERSION = "ngeblogging-app-v205-theme-mobile-controls-20260802";
const SW_CACHE = "theme-mobile-controls-cache-v205";
const SW_REFRESH = "theme-mobile-controls-v205";
const SW_MARKER = `const STUDIO_PRODUCTION_RELEASE_V205 = "${RELEASE}";`;
const SW_COMPAT = [
  'const STUDIO_PRODUCTION_COMPAT_VERSION_V204 = "ngeblogging-app-v204-topbar-session-20260802";',
  'const STUDIO_PRODUCTION_COMPAT_CACHE_V204 = "topbar-session-cache-v204";',
  'const STUDIO_PRODUCTION_COMPAT_RELEASE_V204 = "studio-production-v204-20260802";',
];

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V205_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const nextImport = 'import "./studio-production-v205.js";';
  if (!source.includes(nextImport)) {
    const anchor = 'import "./studio-production-v204.js";';
    if (!source.includes(anchor)) throw new Error("V205_STUDIO_V204_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${nextImport}`);
    await write(path, source);
  }
}

async function repairV205CssSyntax() {
  const path = "src/studio-production-v205.css";
  let source = await read(path);
  const malformed = `html[data-studio-production-v205][data-studio-mobile-v205="true"] .tn-studio .tn-code-workspace,\n@media (max-width:1024px) {`;
  if (source.includes(malformed)) {
    source = source.replace(malformed, "@media (max-width:1024px) {");
    await write(path, source);
  }
  if (source.includes(".tn-code-workspace,\n@media")) throw new Error("V205_CSS_MEDIA_SELECTOR_MALFORMED");
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${SW_VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${SW_CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${SW_REFRESH}";`);
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V204", "NGE_BLOGGING_UPDATE_AVAILABLE_V205");
  source = insertAfterVersion(source, SW_MARKER);
  for (const marker of SW_COMPAT) source = insertAfterVersion(source, marker);
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v205: update tersedia tanpa navigasi paksa; sesi login, callback, draf dan editor dipertahankan.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V205_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V205_SESSION_DESTRUCTIVE_ACTION_FOUND");
  for (const marker of [SW_VERSION, SW_CACHE, SW_REFRESH, RELEASE, ...SW_COMPAT]) {
    if (!source.includes(marker)) throw new Error(`V205_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", 'import "./studio-production-v205.js";'],
    ["src/studio-production-v205.js", RELEASE],
    ["src/studio-production-v205.js", "normalizeThemeActions"],
    ["src/studio-production-v205.js", "normalizeLogoState"],
    ["src/studio-production-v205.js", "normalizeThemeLayout"],
    ["src/studio-production-v205.js", "normalizeCreateActions"],
    ["src/studio-production-v205.css", 'data-studio-mobile-v205="true"'],
    ["src/studio-production-v205.css", 'button[data-v202-theme-action="layout"]'],
    ["src/studio-production-v205.css", ".v199-button-label,.v201-button-label,.v202-button-label"],
    ["src/studio-production-v205.css", '"top-left-1 top-right-1"'],
    ["src/studio-production-v205.css", ".nara-direct-attachments-v202"],
    ["src/studio-production-v205.css", "grid-template-columns:32px 32px minmax(62px,.82fr) minmax(78px,1fr) 34px"],
    ["src/NaraAssistant.jsx", "nara-attachment-menu"],
    ["src/NaraAssistant.jsx", "Kamera"],
    ["src/NaraAssistant.jsx", "Foto"],
    ["src/NaraAssistant.jsx", "File teks"],
    ["src/ThemeStudio.jsx", 'setModal("code")'],
    ["src/ThemeStudio.jsx", "saveThemeCode"],
    ["src/ThemeStudio.jsx", "tn-layout-canvas-v170"],
    ["src/lib/supabase.js", "persistSession: true"],
    ["src/lib/supabase.js", "autoRefreshToken: true"],
    ["public/release-v205.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V205_VERIFY_FAILED:${path}:${marker}`);
  }

  const css = await read("src/studio-production-v205.css");
  if (css.includes(".tn-code-workspace,\n@media")) throw new Error("V205_INVALID_CSS_REMAINED");
  if (!/\.nara-direct-attachments-v202[\s\S]*display\s*:\s*none\s*!important/.test(css)) throw new Error("V205_DIRECT_NARA_TOOLS_NOT_HIDDEN");
  if (!/\.sn-sidebar-toggle\[aria-expanded="false"\][\s\S]*background\s*:\s*linear-gradient/.test(css)) throw new Error("V205_CLOSED_LOGO_STATE_MISSING");
  if (!/\.sn-sidebar-toggle\[aria-expanded="true"\][\s\S]*background\s*:\s*#fff\s*!important/.test(css)) throw new Error("V205_OPEN_LOGO_STATE_MISSING");

  const runtime = await read("src/studio-production-v205.js");
  const observerStart = runtime.indexOf("new MutationObserver(schedule)");
  const observerEnd = runtime.indexOf("});", observerStart);
  const observer = observerStart >= 0 && observerEnd > observerStart ? runtime.slice(observerStart, observerEnd + 3) : "";
  if (!observer || /"hidden"|"inert"|"aria-hidden"/.test(observer)) throw new Error("V205_SELF_OBSERVED_MUTATION_ATTRIBUTE_FOUND");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V205_RUNTIME_SESSION_DESTRUCTIVE_ACTION_FOUND");

  const release = JSON.parse(await read("public/release-v205.json"));
  if (release.release !== RELEASE) throw new Error("V205_RELEASE_ID_MISMATCH");
  if (release.validation?.realDeviceRequiredBeforeHundredPercentClaim !== true) throw new Error("V205_REAL_DEVICE_GATE_MISSING");
  if (release.validation?.nineHundredMillionUserCapacityClaimed !== false) throw new Error("V205_UNSUPPORTED_CAPACITY_CLAIM");
}

await patchStudioEntry();
await repairV205CssSyntax();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
