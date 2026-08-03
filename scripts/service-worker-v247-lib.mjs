import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-screenshot-lock-v247-20260803";
export const VERSION = "ngeblogging-app-v247-screenshot-lock-20260803";
export const CACHE = "studio-screenshot-lock-cache-v247";

const read = (path) => readFileSync(resolve(path), "utf8");

function verifySourceContracts() {
  const entry = read("src/Studio.jsx");
  const runtime = read("src/studio-sidebar-brand-v246.js");
  const css = read("src/studio-screenshot-lock-v247.css");
  const stable = read("src/studio-stable-shell-v244.js");
  const auth = read("src/lib/supabase.js");
  const release = read("public/release-v247.json");
  const studio = read("src/StudioNext.jsx");
  const nara = read("src/NaraAssistant.jsx");

  const v246CssPos = entry.indexOf('import "./studio-sidebar-brand-v246.css"');
  const v247CssPos = entry.indexOf('import "./studio-screenshot-lock-v247.css"');
  if (!(v246CssPos >= 0 && v247CssPos > v246CssPos)) throw new Error("V247_ENTRY_ORDER_INVALID");

  for (const marker of [
    "const LARGE = new Set",
    "if (SMALL.has(declared)) return \"small\"",
    "if (LARGE.has(declared)) return \"large\"",
    "synchronizeHistoricalState",
    "neutralizeLegacyBlockingLayers",
    "desktopExpanded = !desktopExpanded",
    "mobileOpen = !mobileOpen",
    "data-v246-toggle",
  ]) if (!runtime.includes(marker)) throw new Error(`V247_RUNTIME_MARKER_MISSING:${marker}`);

  for (const marker of [
    "--v247-open:248px",
    "--v247-rail:70px",
    ".sn-side-backdrop",
    "backdrop-filter:none!important",
    'data-v246-family="large"',
    'data-v246-family="small"',
    ".v244-brand-row>strong",
    "font-size:20px!important",
    ".v244-avatar",
    ".nara-assistant-layer[data-v244-mode=\"nonmodal\"]",
    ".sv124-free-domain>aside",
  ]) if (!css.includes(marker)) throw new Error(`V247_CSS_MARKER_MISSING:${marker}`);

  for (const label of ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"]) {
    if (!studio.includes(label)) throw new Error(`V247_MENU_REGRESSION:${label}`);
  }

  for (const marker of ["data-account=\"profile\"", "data-account=\"settings\"", "data-account=\"logout\""]) {
    if (!stable.includes(marker)) throw new Error(`V247_PROFILE_REGRESSION:${marker}`);
  }

  for (const marker of ["<Camera />", "<ImageIcon />", "<File />", "intelligenceOptions", "modelOptions", "<MicOff />", "SpeakerIcon"]) {
    if (!nara.includes(marker)) throw new Error(`V247_NARA_REGRESSION:${marker}`);
  }

  for (const marker of ["persistSession: true", "autoRefreshToken: true", 'flowType: "pkce"', "PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245"]) {
    if (!auth.includes(marker)) throw new Error(`V247_AUTH_REGRESSION:${marker}`);
  }

  if (!release.includes(RELEASE)) throw new Error("V247_RELEASE_METADATA_MISSING");
}

export function finalizeServiceWorkerV247(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V247_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V247_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V247 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V247 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_SCREENSHOT_LOCK_RELEASE_V247 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V247}-${ACTIVE_CACHE_RELEASE_V247}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V247}-${ACTIVE_CACHE_RELEASE_V247}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V247,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V247,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V246", "NGE_BLOGGING_UPDATE_AVAILABLE_V247")
    .replaceAll("service-worker-activated-sidebar-brand-v246", "service-worker-activated-screenshot-lock-v247")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v247 announces the new Studio shell without force-navigation.");

  if (!source.includes("studioScreenshotLockReleaseV247:")) {
    source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioScreenshotLockReleaseV247: STUDIO_SCREENSHOT_LOCK_RELEASE_V247,");
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V247}-${ACTIVE_CACHE_RELEASE_V247}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V247}-${ACTIVE_CACHE_RELEASE_V247}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioScreenshotLockReleaseV247",
  ]) if (!source.includes(marker)) throw new Error(`V247_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V247_FORCED_NAVIGATION_REMAINS");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V247_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V247_AUTH_SURFACE_GUARD_MISSING");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
