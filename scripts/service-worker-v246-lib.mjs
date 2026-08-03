import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-shell-authority-v246-20260803";
export const VERSION = "ngeblogging-app-v246-studio-shell-authority-20260803";
export const CACHE = "studio-shell-authority-cache-v246";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function verifySourceContracts() {
  const entry = read("src/Studio.jsx");
  const runtime = read("src/studio-shell-authority-v246.js");
  const css = read("src/studio-shell-authority-v246.css");
  const auth = read("src/lib/supabase.js");
  const release = read("public/release-v246.json");

  const oldAuthority = entry.indexOf('import "./studio-stable-shell-v244-final.css"');
  const runtimeIndex = entry.indexOf('import "./studio-shell-authority-v246.js"');
  const cssIndex = entry.indexOf('import "./studio-shell-authority-v246.css"');
  if (!(oldAuthority >= 0 && runtimeIndex > oldAuthority && cssIndex > runtimeIndex)) throw new Error("V246_AUTHORITY_ORDER_INVALID");

  for (const marker of [
    RELEASE,
    "ngeblogging-studio-shell-v246",
    "ngeblogging-sidebar-state-v246",
    "v246-mobile-n",
    "v246-internal-n",
    "v246-profile-menu",
    'data-account="profile"',
    'data-account="settings"',
    'data-account="add-site"',
    'data-account="view-site"',
    'data-account="logout"',
    "Ringkasan",
    "API Keys",
  ]) if (!runtime.includes(marker)) throw new Error(`V246_RUNTIME_CONTRACT_MISSING:${marker}`);

  for (const marker of [
    "--v246-open:248px",
    "--v246-rail:70px",
    'data-studio-v246-family="large"',
    'data-studio-v246-family="small"',
    ".v246-brand-row>strong",
    "display:block!important",
    "background:transparent!important",
    "nara-assistant-layer[data-v244-mode=\"nonmodal\"]",
  ]) if (!css.includes(marker)) throw new Error(`V246_CSS_CONTRACT_MISSING:${marker}`);

  for (const marker of [
    "PRODUCTION_SUPABASE_URL_V245",
    "PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245",
    'flowType: "pkce"',
    "persistSession: true",
    "autoRefreshToken: true",
  ]) if (!auth.includes(marker)) throw new Error(`V246_AUTH_PRESERVATION_MISSING:${marker}`);

  if (!release.includes(RELEASE)) throw new Error("V246_RELEASE_CONTRACT_MISSING");
  for (const source of [runtime, css]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V246_DESTRUCTIVE_SESSION_ACTION");
  }
}

export function finalizeServiceWorkerV246(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V246_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V246_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V246 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V246 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_SHELL_AUTHORITY_RELEASE_V246 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V246}-${ACTIVE_CACHE_RELEASE_V246}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V246}-${ACTIVE_CACHE_RELEASE_V246}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V246,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V246,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V245", "NGE_BLOGGING_UPDATE_AVAILABLE_V246")
    .replaceAll("service-worker-activated-auth-production-readiness-v245", "service-worker-activated-studio-shell-authority-v246")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v246 never forces navigation on authenticated or auth callback surfaces.");

  if (!source.includes("studioShellAuthorityReleaseV246:")) {
    const marker = /\n\s*authProductionReadinessReleaseV245:\s*AUTH_PRODUCTION_READINESS_RELEASE_V245,/;
    if (marker.test(source)) {
      source = source.replace(marker, (match) => `${match}\n    studioShellAuthorityReleaseV246: STUDIO_SHELL_AUTHORITY_RELEASE_V246,`);
    } else {
      source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioShellAuthorityReleaseV246: STUDIO_SHELL_AUTHORITY_RELEASE_V246,");
    }
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V246}-${ACTIVE_CACHE_RELEASE_V246}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V246}-${ACTIVE_CACHE_RELEASE_V246}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioShellAuthorityReleaseV246",
  ]) if (!source.includes(marker)) throw new Error(`V246_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V246_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V246_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V246_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V246_AUTH_SURFACE_GUARD_MISSING");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
