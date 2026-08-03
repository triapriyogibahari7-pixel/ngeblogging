import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-final-authority-v239-20260803";
export const VERSION = "ngeblogging-app-v239-final-authority-20260803";
export const CACHE = "studio-final-authority-cache-v239";

function verifySourceContracts() {
  const read = (path) => readFileSync(resolve(path), "utf8");
  const entry = read("src/Studio.jsx");
  const runtime = read("src/studio-final-authority-v239.js");
  const css = read("src/studio-final-authority-v239.css");
  const sourceV237 = read("src/studio-source-stability-v237-ui.js");
  const widgets = read("src/widget-system.js");
  const release = read("public/release-v239.json");
  const checks = [
    [entry, 'import "./studio-final-authority-v239.js"'],
    [runtime, RELEASE],
    [runtime, "clickReactSidebarToggle"],
    [runtime, "five-actions"],
    [runtime, "bootstrapRescue"],
    [runtime, "camera-photo-file"],
    [runtime, "v239-code-gutter"],
    [runtime, "Widget kiri 4"],
    [runtime, "Widget kanan 4"],
    [css, "v239-layout-popover"],
    [css, "v239-code-editor"],
    [css, 'data-v239-nara-mode="nonmodal"'],
    [css, ".sv124-free-domain>aside"],
    [css, ".op41-line"],
    [sourceV237, "profile-only-v239"],
    [widgets, 'id: "custom-html"'],
    [widgets, 'name: "HTML / JavaScript"'],
    [release, RELEASE],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V239_SOURCE_CONTRACT_MISSING:${marker}`);
  for (const source of [runtime, css, sourceV237]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V239_DESTRUCTIVE_SESSION_ACTION");
  }
}

export function finalizeServiceWorkerV239(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V239_FINALIZE_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V239_FINALIZE_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V239 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V239 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_FINAL_AUTHORITY_RELEASE_V239 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V239}-${ACTIVE_CACHE_RELEASE_V239}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V239}-${ACTIVE_CACHE_RELEASE_V239}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V239,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V239,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V238", "NGE_BLOGGING_UPDATE_AVAILABLE_V239")
    .replaceAll("service-worker-activated-desktop-sidebar-v238", "service-worker-activated-final-authority-v239")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v239 announces the fresh shell without forced navigation or session destruction.");

  if (!source.includes("studioFinalAuthorityReleaseV239:")) {
    const payloadMarker = /\n\s*studioDesktopSidebarReleaseV238:\s*STUDIO_DESKTOP_SIDEBAR_RELEASE_V238,/;
    if (payloadMarker.test(source)) {
      source = source.replace(payloadMarker, (match) => `${match}\n    studioFinalAuthorityReleaseV239: STUDIO_FINAL_AUTHORITY_RELEASE_V239,`);
    } else {
      source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioFinalAuthorityReleaseV239: STUDIO_FINAL_AUTHORITY_RELEASE_V239,");
    }
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V239}-${ACTIVE_CACHE_RELEASE_V239}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V239}-${ACTIVE_CACHE_RELEASE_V239}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioFinalAuthorityReleaseV239",
  ]) if (!source.includes(marker)) throw new Error(`V239_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V239_FINALIZE_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V239_FINALIZE_DESTRUCTIVE_SESSION_ACTION");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V239_FINALIZE_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V239_FINALIZE_AUTH_SURFACE_GUARD_MISSING");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
