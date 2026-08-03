import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-final-visual-v249-20260803";
export const VERSION = "ngeblogging-app-v249-final-visual-20260803";
export const CACHE = "studio-final-visual-cache-v249";

const read = (path) => readFileSync(resolve(path), "utf8");

function verifySourceContracts() {
  const entry = read("src/Studio.jsx");
  const css = read("src/studio-final-visual-v249.css");
  const authReadiness = read("src/auth-readiness-bridge.js");
  const auth = read("src/lib/supabase.js");
  const stable = read("src/studio-stable-shell-v244.js");
  const nara = read("src/NaraAssistant.jsx");

  const v247 = entry.indexOf('import "./studio-screenshot-lock-v247.css"');
  const v249 = entry.indexOf('import "./studio-final-visual-v249.css"');
  if (!(v247 >= 0 && v249 > v247)) throw new Error("V249_ENTRY_ORDER_INVALID");

  for (const marker of [
    "--v249-open:248px",
    "--v249-rail:70px",
    'data-v246-family="large"',
    'data-v246-family="small"',
    'data-v246-sidebar="open"',
    ".v244-mobile-n",
    ".v244-internal-n",
    ".v244-avatar",
    ".v244-profile-menu",
    ".nara-floating-button",
    ".tn-code-workspace",
    ".sv124-free-domain>aside",
  ]) if (!css.includes(marker)) throw new Error(`V249_CSS_MARKER_MISSING:${marker}`);

  for (const marker of [
    "auth-readiness-nondestructive-v249",
    "Opsi login tetap aktif",
    "healthReachable",
  ]) if (!authReadiness.includes(marker)) throw new Error(`V249_AUTH_READINESS_MARKER_MISSING:${marker}`);

  for (const marker of ["persistSession: true", "autoRefreshToken: true", 'flowType: "pkce"']) {
    if (!auth.includes(marker)) throw new Error(`V249_AUTH_SESSION_REGRESSION:${marker}`);
  }

  for (const marker of ["data-account=\"profile\"", "data-account=\"settings\"", "data-account=\"add-site\"", "data-account=\"view-site\"", "data-account=\"logout\""]) {
    if (!stable.includes(marker)) throw new Error(`V249_PROFILE_REGRESSION:${marker}`);
  }

  for (const marker of ["<Camera />", "<ImageIcon />", "<File />", "intelligenceOptions", "modelOptions", "<MicOff />", "SpeakerIcon"]) {
    if (!nara.includes(marker)) throw new Error(`V249_NARA_REGRESSION:${marker}`);
  }
}

export function finalizeServiceWorkerV249(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V249_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V249_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V249 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V249 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_FINAL_VISUAL_RELEASE_V249 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V249}-${ACTIVE_CACHE_RELEASE_V249}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V249}-${ACTIVE_CACHE_RELEASE_V249}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V249,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V249,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V247", "NGE_BLOGGING_UPDATE_AVAILABLE_V249")
    .replaceAll("service-worker-activated-screenshot-lock-v247", "service-worker-activated-final-visual-v249")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v249 announces the update without force-navigation or session loss.");

  if (!source.includes("studioFinalVisualReleaseV249:")) {
    source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioFinalVisualReleaseV249: STUDIO_FINAL_VISUAL_RELEASE_V249,");
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V249}-${ACTIVE_CACHE_RELEASE_V249}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V249}-${ACTIVE_CACHE_RELEASE_V249}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioFinalVisualReleaseV249",
  ]) if (!source.includes(marker)) throw new Error(`V249_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V249_FORCED_NAVIGATION_REMAINS");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V249_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V249_AUTH_SURFACE_GUARD_MISSING");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V249_DESTRUCTIVE_SESSION_ACTION");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
