import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-shell-rescue-v242-20260803";
export const VERSION = "ngeblogging-app-v242-shell-rescue-20260803";
export const CACHE = "studio-shell-rescue-cache-v242";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function verifySourceContracts() {
  const entry = read("src/Studio.jsx");
  const runtime = read("src/studio-shell-rescue-v242.js");
  const css = read("src/studio-shell-rescue-v242.css");
  const studio = read("src/StudioNext.jsx");
  const themes = read("src/theme-catalog.js");
  const widgets = read("src/widget-system.js");
  const auth = read("src/lib/supabase.js");
  const nara = read("src/NaraAssistant.jsx");
  const release = read("public/release-v242.json");

  const v241 = entry.indexOf('import "./studio-visual-stability-v241.js"');
  const v241Final = entry.indexOf('import "./studio-visual-stability-v241-final.css"');
  const v242 = entry.indexOf('import "./studio-shell-rescue-v242.js"');
  if (!(v241 >= 0 && v241Final > v241 && v242 > v241Final)) throw new Error("V242_IMPORT_ORDER_INVALID");

  const checks = [
    [runtime, RELEASE],
    [runtime, "syncShellChrome"],
    [runtime, "openAccountMenu"],
    [runtime, "openAttachmentMenu"],
    [runtime, "redispatchReactClick"],
    [runtime, 'data-action="profile"'],
    [runtime, 'data-action="settings"'],
    [runtime, 'data-action="add-site"'],
    [runtime, 'data-action="view-site"'],
    [runtime, 'data-action="logout"'],
    [runtime, '["camera", "Kamera", "Ambil foto sekarang"]'],
    [runtime, '["photo", "Foto", "Pilih gambar dari perangkat"]'],
    [runtime, '["file", "File", "TXT, Markdown, CSV, atau JSON"]'],
    [css, ".sn-device-mode-badge-v148"],
    [css, ".sn-sidebar-edge-toggle-v147"],
    [css, 'data-v242-family="small"'],
    [css, 'data-v242-family="large"'],
    [css, ".v242-account-menu"],
    [css, ".v242-nara-attachment-menu"],
    [css, 'data-v242-nara-mode="nonmodal"'],
    [css, ".sn-side-backdrop"],
    [auth, "persistSession: true"],
    [auth, "autoRefreshToken: true"],
    [nara, "cameraInput"],
    [nara, "imageInput"],
    [nara, "fileInput"],
    [release, RELEASE],
  ];
  for (const [source, marker] of checks) {
    if (!source.includes(marker)) throw new Error(`V242_SOURCE_CONTRACT_MISSING:${marker}`);
  }

  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    if (!studio.includes(label)) throw new Error(`V242_MENU_MISSING:${label}`);
  }

  const familyCount = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositionCount = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  const widgetCount = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  if (familyCount !== 20 || compositionCount !== 5 || familyCount * compositionCount !== 100) {
    throw new Error(`V242_THEME_COUNT_INVALID:${familyCount}x${compositionCount}`);
  }
  if (widgetCount !== 26) throw new Error(`V242_WIDGET_COUNT_INVALID:${widgetCount}`);

  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) {
    throw new Error("V242_DESTRUCTIVE_SESSION_ACTION");
  }
  if (!/background:transparent!important/.test(css) || !/left:min\(78vw,328px\)!important/.test(css)) {
    throw new Error("V242_DRAWER_BACKDROP_GUARD_MISSING");
  }
  if (!/display:none!important;visibility:hidden!important;pointer-events:none!important/.test(css)) {
    throw new Error("V242_DUPLICATE_CHROME_GUARD_MISSING");
  }
}

export function finalizeServiceWorkerV242(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V242_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V242_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V242 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V242 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_SHELL_RESCUE_RELEASE_V242 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V242}-${ACTIVE_CACHE_RELEASE_V242}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V242}-${ACTIVE_CACHE_RELEASE_V242}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V242,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V242,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V241", "NGE_BLOGGING_UPDATE_AVAILABLE_V242")
    .replaceAll("service-worker-activated-visual-stability-v241", "service-worker-activated-shell-rescue-v242")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v242 never forces navigation on an authenticated or auth surface.");

  if (!source.includes("studioShellRescueReleaseV242:")) {
    const marker = /\n\s*studioVisualStabilityReleaseV241:\s*STUDIO_VISUAL_STABILITY_RELEASE_V241,/;
    if (marker.test(source)) {
      source = source.replace(marker, (match) => `${match}\n    studioShellRescueReleaseV242: STUDIO_SHELL_RESCUE_RELEASE_V242,`);
    } else {
      source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioShellRescueReleaseV242: STUDIO_SHELL_RESCUE_RELEASE_V242,");
    }
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V242}-${ACTIVE_CACHE_RELEASE_V242}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V242}-${ACTIVE_CACHE_RELEASE_V242}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioShellRescueReleaseV242",
  ]) {
    if (!source.includes(marker)) throw new Error(`V242_FINALIZE_MARKER_MISSING:${marker}`);
  }

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V242_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V242_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  }
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) {
    throw new Error("V242_OLD_CACHE_CLEANUP_MISSING");
  }
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) {
    throw new Error("V242_AUTH_SURFACE_GUARD_MISSING");
  }

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
