import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const write = (path, value) => writeFile(new URL(path, root), value);

const RELEASE = "studio-production-v202-20260802";
const SW_VERSION = "ngeblogging-app-v202-mobile-theme-nara-20260802";
const SW_CACHE = "mobile-theme-nara-cache-v202";
const SW_REFRESH = "mobile-theme-nara-v202";
const SW_MARKER = `const STUDIO_PRODUCTION_RELEASE_V202 = "${RELEASE}";`;
const SW_COMPAT = [
  'const STUDIO_PRODUCTION_COMPAT_VERSION_V198 = "ngeblogging-app-v198-persisted-session-20260802";',
  'const STUDIO_PRODUCTION_COMPAT_CACHE_V198 = "studio-persisted-session-cache-v198";',
  'const STUDIO_PRODUCTION_COMPAT_VERSION_V199 = "ngeblogging-app-v199-mobile-ui-20260802";',
  'const STUDIO_PRODUCTION_COMPAT_CACHE_V199 = "mobile-ui-cache-v199";',
  'const STUDIO_PRODUCTION_COMPAT_VERSION_V200 = "ngeblogging-app-v200-mobile-flicker-20260802";',
  'const STUDIO_PRODUCTION_COMPAT_CACHE_V200 = "mobile-flicker-cache-v200";',
  'const STUDIO_PRODUCTION_COMPAT_VERSION_V201 = "ngeblogging-app-v201-production-ui-20260802";',
  'const STUDIO_PRODUCTION_COMPAT_CACHE_V201 = "production-ui-cache-v201";',
];

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V202_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const nextImport = 'import "./studio-production-v202.js";';
  if (!source.includes(nextImport)) {
    const anchor = 'import "./studio-production-v201.js";';
    if (!source.includes(anchor)) throw new Error("V202_STUDIO_V201_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${nextImport}`);
    await write(path, source);
  }
}

async function patchLegacyObserverOnce() {
  const path = "src/studio-screenshot-recovery-v193.js";
  let source = await read(path);
  const oldBlock = `  attributeFilter: [
    "class", "hidden", "inert", "aria-hidden", "data-nara-size",
    "data-studio-responsive-mode", "data-studio-handheld", "data-studio-physical-mobile-v191",
  ],`;
  const newBlock = `  /* v202 finalizer: v193 writes hidden/inert/aria-hidden itself. Observing those
     writes creates a mutation -> requestAnimationFrame -> mutation loop on phones. */
  attributeFilter: [
    "class", "data-nara-size",
    "data-studio-responsive-mode", "data-studio-handheld", "data-studio-physical-mobile-v191",
  ],`;
  if (!source.includes("v202 finalizer: v193 writes hidden/inert/aria-hidden itself")) {
    if (!source.includes(oldBlock)) throw new Error("V202_V193_OBSERVER_ANCHOR_MISSING");
    source = source.replace(oldBlock, newBlock);
    await write(path, source);
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${SW_VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${SW_CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${SW_REFRESH}";`);

  source = insertAfterVersion(source, SW_MARKER);
  for (const marker of SW_COMPAT) source = insertAfterVersion(source, marker);

  source = source.replace(/NGE_BLOGGING_UPDATE_AVAILABLE_V\d+/g, "NGE_BLOGGING_UPDATE_AVAILABLE_V202");
  source = source.replace(/NGE_BLOGGING_FORCE_RELOAD_V\d+/g, "NGE_BLOGGING_UPDATE_AVAILABLE_V202");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v202: update tersedia tanpa navigasi paksa; sesi, callback dan draf tetap dipertahankan.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V202_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V202_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  for (const marker of [SW_VERSION, SW_CACHE, SW_REFRESH, RELEASE, ...SW_COMPAT]) {
    if (!source.includes(marker)) throw new Error(`V202_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", 'import "./studio-production-v202.js";'],
    ["src/studio-production-v202.js", RELEASE],
    ["src/studio-production-v202.js", 'data-v202-theme-action'],
    ["src/studio-production-v202.js", "Edit Tata Letak"],
    ["src/studio-production-v202.js", "Edit Kode"],
    ["src/studio-production-v202.js", "nara-direct-attachments-v202"],
    ["src/studio-production-v202.css", 'data-studio-mobile-v202="true"'],
    ["src/studio-production-v202.css", 'grid-template-areas: "title sizes voice close"'],
    ["src/studio-production-v202.css", ".nara-composer-tools"],
    ["src/studio-production-v202.css", "flex-flow: row nowrap"],
    ["src/studio-production-v202.css", ".sn-api-empty"],
    ["src/studio-screenshot-recovery-v193.js", "v202 finalizer: v193 writes hidden/inert/aria-hidden itself"],
    ["public/release-v202.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V202_VERIFY_FAILED:${path}:${marker}`);
  }

  const v193 = await read("src/studio-screenshot-recovery-v193.js");
  const observerStart = v193.indexOf("new MutationObserver(scheduleV193)");
  const observerEnd = v193.indexOf("});", observerStart);
  const observer = observerStart >= 0 && observerEnd > observerStart ? v193.slice(observerStart, observerEnd + 3) : "";
  if (!observer || /"hidden"|"inert"|"aria-hidden"/.test(observer)) {
    throw new Error("V202_V193_SELF_OBSERVED_ATTRIBUTE_REMAINS");
  }

  const runtime = await read("src/studio-production-v202.js");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) {
    throw new Error("V202_RUNTIME_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }

  const auth = await read("src/lib/supabase.js");
  for (const marker of ["persistSession: true", "autoRefreshToken: true"]) {
    if (!auth.includes(marker)) throw new Error(`V202_AUTH_CONTINUITY_MISSING:${marker}`);
  }

  const release = JSON.parse(await read("public/release-v202.json"));
  if (release.release !== RELEASE) throw new Error("V202_RELEASE_ID_MISMATCH");
  if (release.validation?.massLoginCapacityClaimed !== false) throw new Error("V202_UNSUPPORTED_CAPACITY_CLAIM");
  if (release.validation?.realDeviceRequiredBeforeHundredPercentClaim !== true) throw new Error("V202_REAL_DEVICE_GATE_MISSING");
}

await patchStudioEntry();
await patchLegacyObserverOnce();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
