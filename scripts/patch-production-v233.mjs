import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v233-data-session-bootstrap-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v233-data-session-bootstrap-20260803";
const ACTIVE_CACHE = "data-session-bootstrap-cache-v233";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V233_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function verifyDirectDataTransport() {
  const transport = await read("src/lib/supabase.js");
  const markers = [
    RELEASE,
    "DATA_GATEWAY_DEADLINE_V233 = 2800",
    "AUTH_GATEWAY_DEADLINE_V233 = 4200",
    "staleUnauthorized = [401, 403].includes(response.status) && !gatewayHeader",
    "staleHtmlShell",
    "gateway-timeout",
    "direct-supabase-fallback",
    "persistSession: true",
    "autoRefreshToken: true",
    "DATA_TRANSPORT_RELEASE_V190",
    "direct-fallback-v186",
    "direct-supabase-oauth-v186",
  ];
  for (const marker of markers) if (!transport.includes(marker)) throw new Error(`V233_DATA_TRANSPORT_VERIFY_FAILED:${marker}`);

  const start = transport.indexOf("async function gatewayFirstV190(input, init, proxy, kind) {");
  const end = transport.indexOf("async function authAwareFetch(input, init) {", start);
  if (start < 0 || end < 0) throw new Error("V233_GATEWAY_SECTION_MISSING");
  const gateway = transport.slice(start, end);
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(gateway)) {
    throw new Error("V233_DESTRUCTIVE_GATEWAY_SESSION_ACTION");
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  for (const line of [
    `const ACTIVE_VERSION_V233 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V233 = "${ACTIVE_CACHE}";`,
    `const STUDIO_PRODUCTION_RELEASE_V233 = "${RELEASE}";`,
  ]) source = insertAfterVersion(source, line);

  const oldShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V232}-${ACTIVE_CACHE_RELEASE_V232}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const nextShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V233}-${ACTIVE_CACHE_RELEASE_V233}-${AUTH_HANDOFF_RELEASE}-shell`;';
  if (!source.includes(nextShell)) {
    if (!source.includes(oldShell)) throw new Error("V233_SHELL_CACHE_V232_ANCHOR_MISSING");
    source = source.replace(oldShell, nextShell);
  }
  const oldAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V232}-${ACTIVE_CACHE_RELEASE_V232}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const nextAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V233}-${ACTIVE_CACHE_RELEASE_V233}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(nextAsset)) {
    if (!source.includes(oldAsset)) throw new Error("V233_ASSET_CACHE_V232_ANCHOR_MISSING");
    source = source.replace(oldAsset, nextAsset);
  }

  source = source
    .replace("    version: ACTIVE_VERSION_V232,", "    version: ACTIVE_VERSION_V233,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V232,", "    release: ACTIVE_CACHE_RELEASE_V233,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V232", "NGE_BLOGGING_UPDATE_AVAILABLE_V233")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v233 announces a fresh data transport shell without force navigation or logout.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V233_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V233_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  for (const marker of [ACTIVE_VERSION, ACTIVE_CACHE, RELEASE, nextShell, nextAsset]) {
    if (!source.includes(marker)) throw new Error(`V233_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verifyPreservedAuthorities() {
  const [gate, fastGate, worker, v232Runtime, v232Css, release] = await Promise.all([
    read("src/StudioOnboardingGate.jsx"),
    read("src/StudioFastGate.jsx"),
    read("public/sw.js"),
    read("src/studio-production-v232.js"),
    read("src/studio-production-v232.css"),
    read("public/release-v233.json"),
  ]);
  const checks = [
    [gate, "recoverStudioMembershipV196"],
    [gate, "tidak ada logout otomatis"],
    [fastGate, "hasKnownSite"],
    [worker, ACTIVE_VERSION],
    [worker, ACTIVE_CACHE],
    [worker, RELEASE],
    [v232Runtime, "studio-production-v232-single-n-theme-actions-20260803"],
    [v232Css, 'data-v232-family="large"'],
    [v232Css, 'data-v232-family="small"'],
    [release, RELEASE],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V233_VERIFY_FAILED:${marker}`);
}

await verifyDirectDataTransport();
await patchServiceWorker();
await verifyPreservedAuthorities();
console.log(`Applied ${RELEASE}; v232 UI remains intact and the direct v233 data transport fails over quickly while preserving authenticated sessions.`);
