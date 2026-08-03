import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-stable-source-shell-v244-20260803";
export const VERSION = "ngeblogging-app-v244-stable-source-shell-20260803";
export const CACHE = "studio-stable-source-shell-cache-v244";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function verifySourceContracts() {
  const entry = read("src/Studio.jsx");
  const runtime = read("src/studio-stable-shell-v244.js");
  const css = read("src/studio-stable-shell-v244-final.css");
  const studio = read("src/StudioNext.jsx");
  const auth = read("src/lib/supabase.js");
  const themes = read("src/theme-catalog.js");
  const widgets = read("src/widget-system.js");
  const release = read("public/release-v244.json");

  const v244Runtime = entry.indexOf('import "./studio-stable-shell-v244.js"');
  const firstHistorical = entry.indexOf('import "./studio-style-authority-v144.js"');
  const v242 = entry.indexOf('import "./studio-shell-rescue-v242.js"');
  const v244Css = entry.indexOf('import "./studio-stable-shell-v244-final.css"');
  if (!(v244Runtime >= 0 && v244Runtime < firstHistorical && v244Css > v242)) {
    throw new Error("V244_AUTHORITY_ORDER_INVALID");
  }

  for (const marker of [
    RELEASE,
    "ngeblogging-studio-chrome-v244",
    "ngeblogging-sidebar-state-v244",
    "v244-legacy-sidebar",
    "v244-mobile-n",
    "v244-internal-n",
    "v244-profile-menu",
    'data-account="profile"',
    'data-account="settings"',
    'data-account="add-site"',
    'data-account="view-site"',
    'data-account="logout"',
    "openNaraAttachments",
    "Kamera",
    "Foto",
    "File",
    "stopImmediatePropagation",
  ]) if (!runtime.includes(marker)) throw new Error(`V244_RUNTIME_CONTRACT_MISSING:${marker}`);

  for (const marker of [
    "data-studio-v244-family=\"large\"",
    "data-studio-v244-family=\"small\"",
    "--v244-open:248px",
    "--v244-rail:70px",
    ".v244-profile-menu",
    "#ngeblogging-nara-attachments-v244",
    'data-v244-mode="nonmodal"',
    "background:transparent",
    "zoom:1!important",
  ]) if (!css.includes(marker)) throw new Error(`V244_CSS_CONTRACT_MISSING:${marker}`);

  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    if (!studio.includes(label)) throw new Error(`V244_MENU_MISSING:${label}`);
  }

  for (const marker of ["persistSession: true", "autoRefreshToken: true", 'flowType: "pkce"']) {
    if (!auth.includes(marker)) throw new Error(`V244_AUTH_CONTRACT_MISSING:${marker}`);
  }

  const familyCount = [...themes.matchAll(/\{ id:\"[^\"]+\",name:\"[^\"]+\",category:/g)].length;
  const compositionCount = [...themes.matchAll(/\{ id:\"(?:prime|dawn|night|coast|atelier)\"/g)].length;
  const widgetCount = [...widgets.matchAll(/\{ id: \"[^\"]+\", name:/g)].length;
  if (familyCount !== 20 || compositionCount !== 5 || familyCount * compositionCount !== 100) {
    throw new Error(`V244_THEME_COUNT_INVALID:${familyCount}x${compositionCount}`);
  }
  if (widgetCount !== 26) throw new Error(`V244_WIDGET_COUNT_INVALID:${widgetCount}`);
  if (!release.includes(RELEASE)) throw new Error("V244_RELEASE_CONTRACT_MISSING");

  for (const source of [runtime, css]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/.test(source)) {
      throw new Error("V244_DESTRUCTIVE_SESSION_ACTION");
    }
  }
}

export function finalizeServiceWorkerV244(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V244_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V244_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V244 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V244 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_STABLE_SOURCE_SHELL_RELEASE_V244 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V244}-${ACTIVE_CACHE_RELEASE_V244}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V244}-${ACTIVE_CACHE_RELEASE_V244}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V244,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V244,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V243", "NGE_BLOGGING_UPDATE_AVAILABLE_V244")
    .replaceAll("service-worker-activated-bootstrap-resilience-v243", "service-worker-activated-stable-source-shell-v244")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v244 never forces navigation on auth/session surfaces.");

  if (!source.includes("studioStableSourceShellReleaseV244:")) {
    const marker = /\n\s*studioBootstrapResilienceReleaseV243:\s*STUDIO_BOOTSTRAP_RESILIENCE_RELEASE_V243,/;
    if (marker.test(source)) {
      source = source.replace(marker, (match) => `${match}\n    studioStableSourceShellReleaseV244: STUDIO_STABLE_SOURCE_SHELL_RELEASE_V244,`);
    } else {
      source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioStableSourceShellReleaseV244: STUDIO_STABLE_SOURCE_SHELL_RELEASE_V244,");
    }
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V244}-${ACTIVE_CACHE_RELEASE_V244}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V244}-${ACTIVE_CACHE_RELEASE_V244}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioStableSourceShellReleaseV244",
  ]) if (!source.includes(marker)) throw new Error(`V244_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V244_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V244_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V244_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V244_AUTH_SURFACE_GUARD_MISSING");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
