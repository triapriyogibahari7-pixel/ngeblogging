import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-bootstrap-resilience-v243-20260803";
export const VERSION = "ngeblogging-app-v243-bootstrap-resilience-20260803";
export const CACHE = "studio-bootstrap-resilience-cache-v243";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function verifySourceContracts() {
  const chain = read("scripts/patch-service-worker-v179.mjs");
  const patch = read("scripts/patch-studio-bootstrap-v243.mjs");
  const studio = read("src/StudioNext.jsx");
  const gate = read("src/StudioOnboardingGate.jsx");
  const fastGate = read("src/StudioFastGate.jsx");
  const auth = read("src/lib/supabase.js");
  const release = read("public/release-v243.json");

  const v237 = chain.indexOf('await import("./patch-production-v237.mjs")');
  const v243 = chain.indexOf('await import("./patch-studio-bootstrap-v243.mjs")');
  if (!(v237 >= 0 && v243 > v237)) throw new Error("V243_PATCH_ORDER_INVALID");

  const checks = [
    [patch, RELEASE],
    [patch, "ngeblogging-active-site-snapshot-v243"],
    [patch, "ngeblogging-active-site-snapshot-v195"],
    [patch, "ngeblogging-active-site-snapshot-v192"],
    [patch, "V243_AUTOMATIC_SITE_CREATION_REINTRODUCED"],
    [studio, "readActiveSiteSnapshotV243"],
    [studio, "rememberActiveSiteV243"],
    [studio, "cached-workspace-retained"],
    [studio, "studio-bootstrap-resilient-v186"],
    [studio, 'window.addEventListener("online", reconnect'],
    [gate, "readLocalStudioSessionV195"],
    [gate, "session-first-cache-v195"],
    [fastGate, "ngeblogging-active-site-snapshot-v195"],
    [auth, "persistSession: true"],
    [auth, "autoRefreshToken: true"],
    [release, RELEASE],
  ];
  for (const [source, marker] of checks) {
    if (!source.includes(marker)) throw new Error(`V243_SOURCE_CONTRACT_MISSING:${marker}`);
  }

  if (studio.includes("getOrCreatePrimarySite")) throw new Error("V243_AUTOMATIC_SITE_CREATION_PRESENT_AFTER_PATCH_CHAIN");
  for (const source of [patch, studio]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/.test(source)) {
      throw new Error("V243_DESTRUCTIVE_SESSION_ACTION");
    }
  }
}

export function finalizeServiceWorkerV243(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V243_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V243_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V243 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V243 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_BOOTSTRAP_RESILIENCE_RELEASE_V243 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V243}-${ACTIVE_CACHE_RELEASE_V243}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V243}-${ACTIVE_CACHE_RELEASE_V243}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V243,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V243,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V242", "NGE_BLOGGING_UPDATE_AVAILABLE_V243")
    .replaceAll("service-worker-activated-shell-rescue-v242", "service-worker-activated-bootstrap-resilience-v243")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v243 never forces navigation while preserving the authenticated Studio session.");

  if (!source.includes("studioBootstrapResilienceReleaseV243:")) {
    const marker = /\n\s*studioShellRescueReleaseV242:\s*STUDIO_SHELL_RESCUE_RELEASE_V242,/;
    if (marker.test(source)) {
      source = source.replace(marker, (match) => `${match}\n    studioBootstrapResilienceReleaseV243: STUDIO_BOOTSTRAP_RESILIENCE_RELEASE_V243,`);
    } else {
      source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioBootstrapResilienceReleaseV243: STUDIO_BOOTSTRAP_RESILIENCE_RELEASE_V243,");
    }
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V243}-${ACTIVE_CACHE_RELEASE_V243}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V243}-${ACTIVE_CACHE_RELEASE_V243}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioBootstrapResilienceReleaseV243",
  ]) {
    if (!source.includes(marker)) throw new Error(`V243_FINALIZE_MARKER_MISSING:${marker}`);
  }

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V243_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V243_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  }
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) {
    throw new Error("V243_OLD_CACHE_CLEANUP_MISSING");
  }
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) {
    throw new Error("V243_AUTH_SURFACE_GUARD_MISSING");
  }

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
