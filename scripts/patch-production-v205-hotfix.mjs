import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const write = (path, value) => writeFile(new URL(path, root), value);

const HOTFIX = "studio-production-v205-hotfix-logo-auth-20260802";
const SW_VERSION = "ngeblogging-app-v205-hotfix-logo-auth-20260802";
const SW_CACHE = "v205-hotfix-logo-auth-cache";
const SW_REFRESH = "v205-hotfix-logo-auth";
const BASE_RELEASE = "studio-production-v205-20260802";
const BASE_VERSION = "ngeblogging-app-v205-theme-nara-auth-mobile-20260802";
const BASE_CACHE = "theme-nara-auth-mobile-cache-v205";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V205_HOTFIX_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${SW_VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${SW_CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${SW_REFRESH}";`);
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V205", "NGE_BLOGGING_UPDATE_AVAILABLE_V205_HOTFIX");
  for (const line of [
    `const STUDIO_PRODUCTION_HOTFIX_V205 = "${HOTFIX}";`,
    `const STUDIO_PRODUCTION_BASE_RELEASE_V205 = "${BASE_RELEASE}";`,
    `const STUDIO_PRODUCTION_BASE_VERSION_V205 = "${BASE_VERSION}";`,
    `const STUDIO_PRODUCTION_BASE_CACHE_V205 = "${BASE_CACHE}";`,
  ]) source = insertAfterVersion(source, line);
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v205.1: notify only; never force navigation through login/callback/editor state.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V205_HOTFIX_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V205_HOTFIX_SESSION_DESTRUCTIVE_ACTION_FOUND");
  for (const marker of [HOTFIX, SW_VERSION, SW_CACHE, SW_REFRESH, BASE_RELEASE, BASE_VERSION, BASE_CACHE]) {
    if (!source.includes(marker)) throw new Error(`V205_HOTFIX_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", 'import "./studio-production-v205-hotfix.js";'],
    ["src/studio-production-v205-hotfix.js", HOTFIX],
    ["src/studio-production-v205-hotfix.js", "open-blue-on-white"],
    ["src/studio-production-v205-hotfix.js", "closed-white-on-blue"],
    ["src/studio-production-v205-hotfix.js", "ensureThemeActions"],
    ["src/studio-production-v205-hotfix.js", "Tambah kamera, foto, atau file"],
    ["src/studio-production-v205-hotfix.css", '.sn-sidebar-toggle[aria-expanded="false"]'],
    ["src/studio-production-v205-hotfix.css", '.sn-sidebar-toggle[aria-expanded="true"]'],
    ["src/studio-production-v205-hotfix.css", ".nara-direct-attachments-v202,.nara-mobile-direct-tools-v199"],
    ["src/lib/auth-callback-v162.js", "AUTH_CALLBACK_REPLAY_RECOVERY_V205"],
    ["src/lib/auth-callback-v162.js", "recoverExistingSessionFromReplay"],
    ["src/lib/supabase.js", "persistSession: true"],
    ["src/lib/supabase.js", "autoRefreshToken: true"],
    ["public/release-v205.json", HOTFIX],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V205_HOTFIX_VERIFY_FAILED:${path}:${marker}`);
  }

  const runtime = await read("src/studio-production-v205-hotfix.js");
  const callback = await read("src/lib/auth-callback-v162.js");
  for (const source of [runtime, callback]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V205_HOTFIX_RUNTIME_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  if ((callback.match(/exchangeCodeForSession\(code\)/g) || []).length !== 1) throw new Error("V205_HOTFIX_PKCE_EXCHANGE_NOT_SINGLE");

  const release = JSON.parse(await read("public/release-v205.json"));
  if (release.release !== BASE_RELEASE) throw new Error("V205_HOTFIX_BASE_RELEASE_CHANGED");
  if (release.hotfix !== HOTFIX) throw new Error("V205_HOTFIX_RELEASE_MARKER_MISSING");
  if (release.validation?.realDeviceRequiredBeforeHundredPercentClaim !== true) throw new Error("V205_HOTFIX_REAL_DEVICE_GATE_MISSING");
  if (release.validation?.linkedinLoginEndToEndClaimed !== false || release.validation?.emailPasswordEndToEndClaimed !== false) {
    throw new Error("V205_HOTFIX_UNSUPPORTED_PROVIDER_CLAIM");
  }
  if (release.validation?.nineHundredMillionUserCapacityClaimed !== false) throw new Error("V205_HOTFIX_UNSUPPORTED_CAPACITY_CLAIM");
}

await patchServiceWorker();
await verify();
console.log(`Applied ${HOTFIX}`);
