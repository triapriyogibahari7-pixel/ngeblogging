import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "auth-production-readiness-v245-20260803";
export const VERSION = "ngeblogging-app-v245-auth-production-readiness-20260803";
export const CACHE = "auth-production-readiness-cache-v245";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function verifySourceContracts() {
  const chain = read("scripts/patch-service-worker-v179.mjs");
  const patch = read("scripts/patch-auth-production-v245.mjs");
  const auth = read("src/lib/supabase.js");
  const modal = read("src/AuthModal.jsx");
  const entry = read("src/Studio.jsx");
  const release = read("public/release-v245.json");

  const v243 = chain.indexOf('await import("./patch-studio-bootstrap-v243.mjs")');
  const v245 = chain.indexOf('await import("./patch-auth-production-v245.mjs")');
  if (!(v243 >= 0 && v245 > v243)) throw new Error("V245_PATCH_ORDER_INVALID");

  for (const marker of [
    RELEASE,
    "PRODUCTION_SUPABASE_URL_V245",
    "PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245",
    "productionClientHostV245",
    'hostname === "ngeblogging.com"',
    'hostname.endsWith(".ngeblogging.com")',
    'authConfigSourceV245 = configuredUrlV245 && configuredKeyV245',
    "dataset.supabaseConfigSourceV245",
    "persistSession: true",
    "autoRefreshToken: true",
    'flowType: "pkce"',
    "gatewayFirstV190",
    "direct-supabase-fallback",
  ]) if (!auth.includes(marker) && !patch.includes(marker)) throw new Error(`V245_AUTH_SOURCE_MISSING:${marker}`);

  for (const marker of [
    '{ id: "google", label: "Google" }',
    '{ id: "linkedin_oidc", label: "LinkedIn"',
    "signInWithPassword",
    "signInWithMagicLink",
    "Kirim ulang email verifikasi",
  ]) if (!modal.includes(marker)) throw new Error(`V245_AUTH_UI_MISSING:${marker}`);

  for (const marker of [
    'import "./studio-stable-shell-v244.js"',
    'import "./studio-stable-shell-v244-final.css"',
  ]) if (!entry.includes(marker)) throw new Error(`V245_V244_SHELL_NOT_PRESERVED:${marker}`);

  if (!release.includes(RELEASE)) throw new Error("V245_RELEASE_CONTRACT_MISSING");
  if (/SUPABASE_SERVICE_ROLE|service[_-]?role/i.test(patch)) throw new Error("V245_SERVICE_ROLE_EMBEDDED");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/.test(patch)) throw new Error("V245_DESTRUCTIVE_STORAGE_ACTION");
}

export function finalizeServiceWorkerV245(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V245_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V245_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V245 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V245 = "${CACHE}";`);
  insertAfterVersion(`const AUTH_PRODUCTION_READINESS_RELEASE_V245 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V245}-${ACTIVE_CACHE_RELEASE_V245}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V245}-${ACTIVE_CACHE_RELEASE_V245}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V245,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V245,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V244", "NGE_BLOGGING_UPDATE_AVAILABLE_V245")
    .replaceAll("service-worker-activated-stable-source-shell-v244", "service-worker-activated-auth-production-readiness-v245")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v245 never forces navigation while preserving authenticated sessions.");

  if (!source.includes("authProductionReadinessReleaseV245:")) {
    const marker = /\n\s*studioStableSourceShellReleaseV244:\s*STUDIO_STABLE_SOURCE_SHELL_RELEASE_V244,/;
    if (marker.test(source)) {
      source = source.replace(marker, (match) => `${match}\n    authProductionReadinessReleaseV245: AUTH_PRODUCTION_READINESS_RELEASE_V245,`);
    } else {
      source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    authProductionReadinessReleaseV245: AUTH_PRODUCTION_READINESS_RELEASE_V245,");
    }
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V245}-${ACTIVE_CACHE_RELEASE_V245}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V245}-${ACTIVE_CACHE_RELEASE_V245}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "authProductionReadinessReleaseV245",
  ]) if (!source.includes(marker)) throw new Error(`V245_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V245_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V245_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V245_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V245_AUTH_SURFACE_GUARD_MISSING");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
