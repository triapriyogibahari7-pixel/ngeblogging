import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-sidebar-brand-toggle-v246-20260803";
export const VERSION = "ngeblogging-app-v246-sidebar-brand-toggle-20260803";
export const CACHE = "sidebar-brand-toggle-cache-v246";

const read = (path) => readFileSync(resolve(path), "utf8");

function verifySourceContracts() {
  const entry = read("src/Studio.jsx");
  const runtime = read("src/studio-sidebar-brand-v246.js");
  const css = read("src/studio-sidebar-brand-v246.css");
  const release = read("public/release-v246.json");
  const auth = read("src/lib/supabase.js");

  const runtimePos = entry.indexOf('import "./studio-sidebar-brand-v246.js"');
  const cssPos = entry.indexOf('import "./studio-sidebar-brand-v246.css"');
  const v244CssPos = entry.indexOf('import "./studio-stable-shell-v244-final.css"');
  if (!(runtimePos > v244CssPos && cssPos > runtimePos)) throw new Error("V246_ENTRY_ORDER_INVALID");

  for (const marker of [
    RELEASE,
    "ngeblogging-sidebar-state-v244",
    "data-v246-toggle",
    "desktopExpanded = !desktopExpanded",
    "mobileOpen = !mobileOpen",
    'name.textContent !== "Ngeblogging"',
    'nText.textContent !== "n"',
    "applyMainGeometry",
  ]) if (!runtime.includes(marker)) throw new Error(`V246_RUNTIME_MARKER_MISSING:${marker}`);

  for (const marker of [
    "--v246-open:248px",
    "--v246-rail:70px",
    ".v244-internal-n::after",
    'content:"n"!important',
    'data-v246-sidebar="expanded"',
    'data-v246-sidebar="collapsed"',
    'data-v246-family="small"',
    "background:transparent!important",
  ]) if (!css.includes(marker)) throw new Error(`V246_CSS_MARKER_MISSING:${marker}`);

  for (const marker of ["persistSession: true", "autoRefreshToken: true", 'flowType: "pkce"']) {
    if (!auth.includes(marker)) throw new Error(`V246_AUTH_REGRESSION:${marker}`);
  }

  if (!release.includes(RELEASE)) throw new Error("V246_RELEASE_METADATA_MISSING");
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
  insertAfterVersion(`const STUDIO_SIDEBAR_BRAND_RELEASE_V246 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V246}-${ACTIVE_CACHE_RELEASE_V246}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V246}-${ACTIVE_CACHE_RELEASE_V246}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V246,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V246,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V245", "NGE_BLOGGING_UPDATE_AVAILABLE_V246")
    .replaceAll("service-worker-activated-auth-production-readiness-v245", "service-worker-activated-sidebar-brand-v246")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v246 announces the updated Studio shell without force-navigation.");

  if (!source.includes("studioSidebarBrandReleaseV246:")) {
    source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioSidebarBrandReleaseV246: STUDIO_SIDEBAR_BRAND_RELEASE_V246,");
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V246}-${ACTIVE_CACHE_RELEASE_V246}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V246}-${ACTIVE_CACHE_RELEASE_V246}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioSidebarBrandReleaseV246",
  ]) if (!source.includes(marker)) throw new Error(`V246_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V246_FORCED_NAVIGATION_REMAINS");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V246_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V246_AUTH_SURFACE_GUARD_MISSING");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
