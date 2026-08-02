import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const write = (path, value) => writeFile(new URL(path, root), value);

const RELEASE = "studio-production-v203-20260802";
const SW_VERSION = "ngeblogging-app-v203-mobile-reflow-20260802";
const SW_CACHE = "mobile-reflow-cache-v203";
const SW_REFRESH = "mobile-reflow-v203";
const SW_MARKER = `const STUDIO_PRODUCTION_RELEASE_V203 = "${RELEASE}";`;
const SW_COMPAT = [
  'const STUDIO_PRODUCTION_COMPAT_VERSION_V202 = "ngeblogging-app-v202-mobile-theme-nara-20260802";',
  'const STUDIO_PRODUCTION_COMPAT_CACHE_V202 = "mobile-theme-nara-cache-v202";',
  'const STUDIO_PRODUCTION_COMPAT_RELEASE_V202 = "studio-production-v202-20260802";',
];

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V203_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const nextImport = 'import "./studio-production-v203.js";';
  if (!source.includes(nextImport)) {
    const anchor = 'import "./studio-production-v202.js";';
    if (!source.includes(anchor)) throw new Error("V203_STUDIO_V202_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${nextImport}`);
    await write(path, source);
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${SW_VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${SW_CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${SW_REFRESH}";`);
  source = source.replace(/NGE_BLOGGING_UPDATE_AVAILABLE_V\d+/g, "NGE_BLOGGING_UPDATE_AVAILABLE_V203");
  source = source.replace(/NGE_BLOGGING_FORCE_RELOAD_V\d+/g, "NGE_BLOGGING_UPDATE_AVAILABLE_V203");
  source = insertAfterVersion(source, SW_MARKER);
  for (const marker of SW_COMPAT) source = insertAfterVersion(source, marker);
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v203: update tersedia tanpa navigasi paksa; sesi, callback, editor, dan draf tetap dipertahankan.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V203_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V203_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  for (const marker of [SW_VERSION, SW_CACHE, SW_REFRESH, RELEASE, ...SW_COMPAT]) {
    if (!source.includes(marker)) throw new Error(`V203_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", 'import "./studio-production-v203.js";'],
    ["src/studio-production-v203.js", RELEASE],
    ["src/studio-production-v203.js", "studioMobileV203"],
    ["src/studio-production-v203.js", "normalizeCreateActions"],
    ["src/studio-production-v203.js", "layer.dataset.v203Mode"],
    ["src/studio-production-v203.css", 'data-studio-mobile-v203="true"'],
    ["src/studio-production-v203.css", ".sc161-content-page > .sn-page-title > .sn-primary"],
    ["src/studio-production-v203.css", 'grid-template-areas:\n    "title status"'],
    ["src/studio-production-v203.css", ".mv176-list > article"],
    ["src/studio-production-v203.css", ".sv124-free-domain"],
    ["src/studio-production-v203.css", 'grid-template-areas:\n    "back file"'],
    ["src/studio-production-v203.css", ".tn-code-workspace"],
    ["src/studio-production-v203.css", ".nara-select.intelligence"],
    ["public/release-v203.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V203_VERIFY_FAILED:${path}:${marker}`);
  }

  const runtime = await read("src/studio-production-v203.js");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) {
    throw new Error("V203_RUNTIME_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  const observerStart = runtime.indexOf("new MutationObserver(schedule)");
  const observerEnd = runtime.indexOf("});", observerStart);
  const observer = observerStart >= 0 && observerEnd > observerStart ? runtime.slice(observerStart, observerEnd + 3) : "";
  if (!observer || /"hidden"|"inert"|"aria-hidden"/.test(observer)) {
    throw new Error("V203_SELF_OBSERVED_MUTATION_ATTRIBUTE_FOUND");
  }

  const auth = await read("src/lib/supabase.js");
  for (const marker of ["persistSession: true", "autoRefreshToken: true"]) {
    if (!auth.includes(marker)) throw new Error(`V203_AUTH_CONTINUITY_MISSING:${marker}`);
  }

  const release = JSON.parse(await read("public/release-v203.json"));
  if (release.release !== RELEASE) throw new Error("V203_RELEASE_ID_MISMATCH");
  if (release.validation?.massLoginCapacityClaimed !== false) throw new Error("V203_UNSUPPORTED_MASS_LOGIN_CLAIM");
  if (release.validation?.nineHundredMillionUserCapacityClaimed !== false) throw new Error("V203_UNSUPPORTED_CAPACITY_CLAIM");
  if (release.validation?.realDeviceRequiredBeforeHundredPercentClaim !== true) throw new Error("V203_REAL_DEVICE_GATE_MISSING");
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);