import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const write = (path, value) => writeFile(new URL(path, root), value);

const RELEASE = "studio-production-v204-20260802";
const SW_VERSION = "ngeblogging-app-v204-topbar-session-20260802";
const SW_CACHE = "topbar-session-cache-v204";
const SW_REFRESH = "topbar-session-v204";
const SW_MARKER = `const STUDIO_PRODUCTION_RELEASE_V204 = "${RELEASE}";`;
const SW_COMPAT = [
  'const STUDIO_PRODUCTION_COMPAT_VERSION_V203 = "ngeblogging-app-v203-mobile-reflow-20260802";',
  'const STUDIO_PRODUCTION_COMPAT_CACHE_V203 = "mobile-reflow-cache-v203";',
  'const STUDIO_PRODUCTION_COMPAT_RELEASE_V203 = "studio-production-v203-20260802";',
];

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V204_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const nextImport = 'import "./studio-production-v204.js";';
  if (!source.includes(nextImport)) {
    const anchor = 'import "./studio-production-v203.js";';
    if (!source.includes(anchor)) throw new Error("V204_STUDIO_V203_ANCHOR_MISSING");
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
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V203", "NGE_BLOGGING_UPDATE_AVAILABLE_V204");
  source = insertAfterVersion(source, SW_MARKER);
  for (const marker of SW_COMPAT) source = insertAfterVersion(source, marker);
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v204: beri tahu tab lama tanpa navigasi paksa; sesi dan callback autentikasi dipertahankan.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V204_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V204_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  for (const marker of [SW_VERSION, SW_CACHE, SW_REFRESH, RELEASE, ...SW_COMPAT]) {
    if (!source.includes(marker)) throw new Error(`V204_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", 'import "./studio-production-v204.js";'],
    ["src/studio-production-v204.js", RELEASE],
    ["src/studio-production-v204.js", "normalizeTopbar"],
    ["src/studio-production-v204.js", "normalizeProfileMenu"],
    ["src/studio-production-v204.js", "retryStartupWhenOnline"],
    ["src/studio-production-v204.css", 'data-studio-mobile-v204="true"'],
    ["src/studio-production-v204.css", ".sn-top-actions > .sn-avatar"],
    ["src/studio-production-v204.css", ".sn-profile-menu-v147"],
    ["src/studio-production-v204.css", "grid-template-columns: 52px minmax(0,1fr) 44px"],
    ["src/lib/supabase.js", "persistSession: true"],
    ["src/lib/supabase.js", "autoRefreshToken: true"],
    ["public/release-v204.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V204_VERIFY_FAILED:${path}:${marker}`);
  }

  const runtime = await read("src/studio-production-v204.js");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) {
    throw new Error("V204_RUNTIME_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  const release = JSON.parse(await read("public/release-v204.json"));
  if (release.release !== RELEASE) throw new Error("V204_RELEASE_ID_MISMATCH");
  if (release.validation?.realDeviceRequiredBeforeHundredPercentClaim !== true) throw new Error("V204_REAL_DEVICE_GATE_MISSING");
  if (release.validation?.linkedinLoginEndToEndClaimed !== false) throw new Error("V204_UNSUPPORTED_LINKEDIN_CLAIM");
  if (release.validation?.emailPasswordEndToEndClaimed !== false) throw new Error("V204_UNSUPPORTED_EMAIL_CLAIM");
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
