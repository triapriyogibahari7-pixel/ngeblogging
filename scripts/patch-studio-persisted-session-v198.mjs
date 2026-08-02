import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-persisted-session-recovery-v198-20260802";
const VERSION = "ngeblogging-app-v198-persisted-session-20260802";
const CACHE = "studio-persisted-session-cache-v198";

async function verifyGate() {
  const source = await read("src/StudioOnboardingGate.jsx");
  for (const marker of [
    "function readPersistedSupabaseSessionV198",
    "sb-${projectRef}-auth-token",
    "persisted-storage-v198",
    "persisted-storage-first",
    "async function readLocalStudioSessionV195",
    "listUserSitesDirectV192",
    "studioMembershipSingleFlightV197",
    "studioRecoverySingleFlightV197",
  ]) {
    if (!source.includes(marker)) throw new Error(`V198_GATE_VERIFY_FAILED:${marker}`);
  }
  const start = source.indexOf("async function readLocalStudioSessionV195(userId)");
  const end = source.indexOf("\n}\n", start);
  const body = source.slice(start, end + 3);
  const persistedIndex = body.indexOf("readPersistedSupabaseSessionV198(userId)");
  const clientIndex = body.indexOf("supabase.auth.getSession()");
  if (persistedIndex < 0 || clientIndex < 0 || persistedIndex > clientIndex) {
    throw new Error("V198_PERSISTED_SESSION_NOT_BEFORE_CLIENT_LOCK");
  }
  if (/service_role|SUPABASE_SERVICE_ROLE/.test(source)) throw new Error("V198_PRIVILEGED_BROWSER_KEY_FORBIDDEN");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/.test(source)) {
    throw new Error("V198_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "studio-persisted-session-v198";');

  for (const marker of [
    'const STUDIO_PERSISTED_SESSION_COMPAT_VERSION_V197 = "ngeblogging-app-v197-session-race-20260802";',
    'const STUDIO_PERSISTED_SESSION_COMPAT_CACHE_V197 = "studio-session-race-cache-v197";',
  ]) {
    if (!source.includes(marker)) source = source.replace(/^(const VERSION = .*;\n)/m, `$1${marker}\n`);
  }
  if (!source.includes("STUDIO_PERSISTED_SESSION_RELEASE_V198")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_PERSISTED_SESSION_RELEASE_V198 = "${RELEASE}";\n`);
  }

  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V197", "NGE_BLOGGING_UPDATE_AVAILABLE_V198")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V196", "NGE_BLOGGING_UPDATE_AVAILABLE_V198")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v198 never forces navigation; browser session and drafts remain intact.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V198_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V198_SERVICE_WORKER_SESSION_DESTRUCTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  await verifyGate();
  const checks = [
    ["public/sw.js", "STUDIO_PERSISTED_SESSION_RELEASE_V198"],
    ["public/sw.js", VERSION],
    ["public/sw.js", CACHE],
    ["public/release-v198.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V198_VERIFY_FAILED:${path}:${marker}`);
  }
}

await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
